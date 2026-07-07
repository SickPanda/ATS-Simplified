using Microsoft.EntityFrameworkCore;

namespace AtsApi.Models;

public class AtsDbContext : DbContext
{
    public AtsDbContext(DbContextOptions<AtsDbContext> options) : base(options) { }

    public DbSet<Job> Jobs { get; set; } = null!;
    public DbSet<Candidate> Candidates { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // SQLite doesn't support complex types like List<int> out of the box natively 
        // without value conversion, so we store it as a comma-separated string.
        modelBuilder.Entity<Candidate>()
            .Property(c => c.SubmittedJobIds)
            .HasConversion(
                v => string.Join(',', v),
                v => string.IsNullOrEmpty(v) ? new List<int>() : v.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList()
            );

        modelBuilder.Entity<Candidate>()
            .Property(c => c.RelevantJobIds)
            .HasConversion(
                v => string.Join(',', v),
                v => string.IsNullOrEmpty(v) ? new List<int>() : v.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList()
            );

        // Seed Initial Data
        modelBuilder.Entity<Job>().HasData(
            new Job { Id = 1, Title = "Senior Frontend Engineer", Department = "Engineering", Status = "Active" },
            new Job { Id = 2, Title = "Product Designer", Department = "Design", Status = "Active" },
            new Job { Id = 3, Title = "Backend Developer", Department = "Engineering", Status = "Draft" }
        );
    }
}
