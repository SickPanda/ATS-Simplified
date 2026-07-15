using AtsApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(int.Parse(port));
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Register SQLite Database
builder.Services.AddDbContext<AtsDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Identity
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options => {
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
})
.AddEntityFrameworkStores<AtsDbContext>()
.AddDefaultTokenProviders();

// Register JWT Authentication
var key = System.Text.Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"] ?? "super_secret_key_that_is_long_enough_for_hs256_at_least_32_chars");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

var app = builder.Build();

// Automatically apply EF migrations and seed data on startup
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



    if (await userManager.FindByEmailAsync("admin@atspro.com") == null)
    {
        var adminUser = new IdentityUser { UserName = "admin@atspro.com", Email = "admin@atspro.com" };
        var result = await userManager.CreateAsync(adminUser, "password123");
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(adminUser, "Admin");
            Console.WriteLine("[SEED] Created user admin@atspro.com");
        }
        else
        {
            Console.WriteLine($"[SEED ERROR] Failed to create admin@atspro.com: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }
    else
    {
        var existingAdmin = await userManager.FindByEmailAsync("admin@atspro.com");
        if (existingAdmin != null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(existingAdmin);
            await userManager.ResetPasswordAsync(existingAdmin, token, "password123");
            if (!await userManager.IsInRoleAsync(existingAdmin, "Admin"))
            {
                await userManager.AddToRoleAsync(existingAdmin, "Admin");
            }
        }
    }

    if (await userManager.FindByEmailAsync("recruiter@atspro.com") == null)
    {
        var recruiterUser = new IdentityUser { UserName = "recruiter@atspro.com", Email = "recruiter@atspro.com" };
        var result = await userManager.CreateAsync(recruiterUser, "password123");
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(recruiterUser, "Recruiter");
            Console.WriteLine("[SEED] Created user recruiter@atspro.com");
        }
        else
        {
            Console.WriteLine($"[SEED ERROR] Failed to create recruiter@atspro.com: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }
    else
    {
        var existingRecruiter = await userManager.FindByEmailAsync("recruiter@atspro.com");
        if (existingRecruiter != null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(existingRecruiter);
            await userManager.ResetPasswordAsync(existingRecruiter, token, "password123");
            if (!await userManager.IsInRoleAsync(existingRecruiter, "Recruiter"))
            {
                await userManager.AddToRoleAsync(existingRecruiter, "Recruiter");
            }
        }
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // Enable serving resumes from wwwroot

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Content("<h1>ATS Core API is running</h1><p>Visit the frontend dashboard to access the app.</p>", "text/html"));
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));
app.MapControllers();

app.Run();
