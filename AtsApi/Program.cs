using AtsApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// Azure App Service / containers inject PORT; local defaults to 8080
var port = Environment.GetEnvironmentVariable("PORT")
    ?? Environment.GetEnvironmentVariable("WEBSITES_PORT")
    ?? "8080";
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(int.Parse(port));
});

// --- SQLite path
// Prefer DATA_DIR (Azure: /home/data). Else keep legacy ./ats.db if present for local dev.
var dataDirEnv = Environment.GetEnvironmentVariable("DATA_DIR");
string sqlitePath;
if (!string.IsNullOrWhiteSpace(dataDirEnv))
{
    Directory.CreateDirectory(dataDirEnv);
    sqlitePath = Path.Combine(dataDirEnv, "ats.db");
}
else
{
    var legacy = Path.Combine(builder.Environment.ContentRootPath, "ats.db");
    var dataDir = Path.Combine(builder.Environment.ContentRootPath, "data");
    if (File.Exists(legacy))
        sqlitePath = legacy;
    else
    {
        Directory.CreateDirectory(dataDir);
        sqlitePath = Path.Combine(dataDir, "ats.db");
    }
}
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
// Always pin to resolved path so free-tier volume mounts work consistently
connectionString = $"Data Source={sqlitePath}";

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddOpenApi();
// FreeLlmResumeParser kept in codebase as optional advanced plug-in (not registered — in-app Intelligence is default)
builder.Services.AddScoped<AtsApi.Services.AuditService>();
builder.Services.AddScoped<AtsApi.Services.EmailService>();

// CORS — required when frontend is hosted separately (SWA free + App Service free)
var corsOrigins = (builder.Configuration["Cors:Origins"]
    ?? Environment.GetEnvironmentVariable("CORS_ORIGINS")
    ?? "http://localhost:5173,http://localhost:4173,http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AtsCors", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AtsDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
})
.AddEntityFrameworkStores<AtsDbContext>()
.AddDefaultTokenProviders();

// JWT — prefer env Jwt__Key or JWT_KEY in production (never ship a fixed secret)
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? Environment.GetEnvironmentVariable("JWT_KEY")
    ?? "super_secret_key_that_is_long_enough_for_hs256_at_least_32_chars";
var key = System.Text.Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        NameClaimType = System.Security.Claims.ClaimTypes.Email
    };
});

// Forwarded headers for Azure App Service reverse proxy
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();

// Migrate + seed demo users (password reset only in Development)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AtsDbContext>();
    dbContext.Database.Migrate();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();

    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));
    if (!await roleManager.RoleExistsAsync("Recruiter"))
        await roleManager.CreateAsync(new IdentityRole("Recruiter"));

    async Task EnsureUser(string email, string password, string role)
    {
        var existing = await userManager.FindByEmailAsync(email);
        if (existing == null)
        {
            var user = new IdentityUser { UserName = email, Email = email };
            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, role);
                Console.WriteLine($"[SEED] Created user {email}");
            }
            else
            {
                Console.WriteLine($"[SEED ERROR] {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }
        }
        else
        {
            // Keep demo account passwords aligned with DEMO_PASSWORD (all environments)
            var token = await userManager.GeneratePasswordResetTokenAsync(existing);
            await userManager.ResetPasswordAsync(existing, token, password);
            if (!await userManager.IsInRoleAsync(existing, role))
                await userManager.AddToRoleAsync(existing, role);
        }
    }

    var demoPassword = Environment.GetEnvironmentVariable("DEMO_PASSWORD") ?? "password123";
    await EnsureUser("admin@candeo.com", demoPassword, "Admin");
    await EnsureUser("recruiter@candeo.com", demoPassword, "Recruiter");

    // Seed email templates (intro, job pitch, etc.)
    var emailSvc = scope.ServiceProvider.GetRequiredService<AtsApi.Services.EmailService>();
    await emailSvc.EnsureDefaultTemplatesAsync();

    // Demo talent pool so Talent Match is usable on a fresh free-tier deploy
    if (!dbContext.Candidates.Any())
    {
        dbContext.Candidates.AddRange(
            new Candidate
            {
                Name = "Priya Sharma",
                Role = "Senior Frontend Engineer",
                Experience = "7 years",
                Email = "priya.sharma@example.com",
                Phone = "555-1001",
                Education = "B.S. Computer Science",
                City = "Austin",
                State = "TX",
                Source = "LinkedIn",
                Status = "Active",
                Ownership = "Aazam Qureshi",
                WorkAuthorization = "H1B",
                SkillsJson = "[\"React\", \"TypeScript\", \"JavaScript\", \"CSS\", \"Next.js\", \"GraphQL\"]",
                CreatedAt = DateTime.UtcNow.AddDays(-12)
            },
            new Candidate
            {
                Name = "Marcus Chen",
                Role = "Full Stack Developer",
                Experience = "5 years",
                Email = "marcus.chen@example.com",
                Phone = "555-1002",
                Education = "M.S. Software Engineering",
                City = "San Francisco",
                State = "CA",
                Source = "Referral",
                Status = "Active",
                Ownership = "Sarah Jenkins",
                WorkAuthorization = "US Citizen",
                SkillsJson = "[\"React\", \"Node.js\", \"TypeScript\", \"PostgreSQL\", \"AWS\"]",
                CreatedAt = DateTime.UtcNow.AddDays(-8)
            },
            new Candidate
            {
                Name = "Elena Vasquez",
                Role = "Product Designer",
                Experience = "6 years",
                Email = "elena.v@example.com",
                Phone = "555-1003",
                Education = "BFA Interaction Design",
                City = "New York",
                State = "NY",
                Source = "CareerBuilder",
                Status = "Active",
                Ownership = "Sarah Jenkins",
                WorkAuthorization = "Green Card",
                SkillsJson = "[\"Figma\", \"UI/UX\", \"Prototyping\", \"Design Systems\", \"User Research\"]",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new Candidate
            {
                Name = "James Okonkwo",
                Role = "Backend Developer",
                Experience = "9 years",
                Email = "james.o@example.com",
                Phone = "555-1004",
                Education = "B.S. Computer Engineering",
                City = "Chicago",
                State = "IL",
                Source = "Resume Parser",
                Status = "Active",
                Ownership = "Aazam Qureshi",
                WorkAuthorization = "US Citizen",
                SkillsJson = "[\"C#\", \".NET Core\", \"SQL\", \"Microservices\", \"Azure\", \"Docker\"]",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new Candidate
            {
                Name = "Aisha Patel",
                Role = "React Developer",
                Experience = "3 years",
                Email = "aisha.patel@example.com",
                Phone = "555-1005",
                Education = "Bootcamp + B.A.",
                City = "Remote",
                State = "",
                Source = "Quick Parse",
                Status = "Active",
                Ownership = "Michael Chang",
                WorkAuthorization = "OPT",
                SkillsJson = "[\"React\", \"JavaScript\", \"CSS\", \"Redux\", \"Jest\"]",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        );
        await dbContext.SaveChangesAsync();
        Console.WriteLine("[SEED] Demo candidates loaded");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// SPA static files from wwwroot (publish frontend build into AtsApi/wwwroot for single Free-tier host)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AtsCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "1.0.0",
    time = DateTime.UtcNow,
    db = sqlitePath
}));

app.MapControllers();

// SPA fallback — Azure Free App Service single-process hosting
app.MapFallbackToFile("index.html");

app.Run();
