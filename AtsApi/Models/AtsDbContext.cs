using Microsoft.EntityFrameworkCore;

namespace AtsApi.Models;

public class AtsDbContext : DbContext
{
    public AtsDbContext(DbContextOptions<AtsDbContext> options) : base(options) { }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    public DbSet<Job> Jobs { get; set; } = null!;
    public DbSet<Candidate> Candidates { get; set; } = null!;
    public DbSet<Application> Applications { get; set; } = null!;
    public DbSet<Activity> Activities { get; set; } = null!;
    public DbSet<Client> Clients { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Submittal> Submittals { get; set; } = null!;
    public DbSet<Interview> Interviews { get; set; } = null!;
    public DbSet<Placement> Placements { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Seed Initial Data
        modelBuilder.Entity<User>().HasData(
            new User { Id = 1, Name = "Admin User", Email = "admin@atspro.com", Password = "password123", Role = "Admin" },
            new User { Id = 2, Name = "Recruiter", Email = "recruiter@atspro.com", Password = "password123", Role = "Recruiter" }
        );

        modelBuilder.Entity<Client>().HasData(
            new Client
            {
                Id = 1,
                Name = "Acme Corp",
                Industry = "Technology",
                ContactEmail = "hr@acmecorp.com",
                Phone = "555-0100",
                Location = "San Francisco, CA",
                Website = "https://acme.com",
                PrimaryOwner = "Aazam Qureshi",
                FederalId = "12-3456789",
                PaymentTerms = "Net 30",
                AboutCompany = "Global leader in product manufacturing and tech services.",
                ContactsJson = "[{\"Name\":\"John Doe\",\"Email\":\"jdoe@acme.com\",\"Phone\":\"555-0111\",\"Title\":\"HR Manager\"}]"
            },
            new Client
            {
                Id = 2,
                Name = "Globex Corporation",
                Industry = "Manufacturing",
                ContactEmail = "talent@globex.com",
                Phone = "555-0200",
                Location = "Chicago, IL",
                Website = "https://globex.com",
                PrimaryOwner = "Aazam Qureshi",
                FederalId = "98-7654321",
                PaymentTerms = "Net 45",
                AboutCompany = "International industrial equipment supplier.",
                ContactsJson = "[]"
            }
        );

        modelBuilder.Entity<Job>().HasData(
            new Job 
            { 
                Id = 1, 
                JobCode = "REQ-101",
                ClientJobId = "CJ-0012",
                Title = "Senior Frontend Engineer", 
                Department = "Engineering", 
                Status = "Active",
                Location = "Remote",
                BillRate = 120.00m,
                PayRate = 85.00m,
                RecruitmentManager = "Aazam Qureshi",
                PrimaryRecruiter = "Aazam Qureshi",
                SalaryRange = "$120k - $150k",
                Description = "Looking for a React expert to lead our frontend architecture.",
                RequiredSkillsJson = "[\"React\", \"JavaScript\", \"TypeScript\", \"CSS\"]",
                ClientId = 1
            },
            new Job 
            { 
                Id = 2, 
                JobCode = "REQ-102",
                ClientJobId = "CJ-0034",
                Title = "Product Designer", 
                Department = "Design", 
                Status = "Active",
                Location = "New York, NY",
                BillRate = 100.00m,
                PayRate = 70.00m,
                RecruitmentManager = "Aazam Qureshi",
                PrimaryRecruiter = "Sarah Jenkins",
                SalaryRange = "$90k - $120k",
                Description = "Seeking a talented UI/UX designer to craft beautiful enterprise tools.",
                RequiredSkillsJson = "[\"Figma\", \"UI/UX\", \"Prototyping\"]",
                ClientId = 1
            },
            new Job 
            { 
                Id = 3, 
                JobCode = "REQ-103",
                ClientJobId = "CJ-0056",
                Title = "Backend Developer", 
                Department = "Engineering", 
                Status = "Draft",
                Location = "San Francisco, CA",
                BillRate = 140.00m,
                PayRate = 95.00m,
                RecruitmentManager = "Aazam Qureshi",
                PrimaryRecruiter = "Michael Chang",
                SalaryRange = "$130k - $160k",
                Description = "Join our core platform team building microservices in .NET.",
                RequiredSkillsJson = "[\"C#\", \".NET Core\", \"SQL\", \"Microservices\"]",
                ClientId = 2
            }
        );
    }
}
