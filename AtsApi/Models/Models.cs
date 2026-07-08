namespace AtsApi.Models;

public class Job
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Status { get; set; } = "Active"; // Active, Closed, Draft
    public string Location { get; set; } = string.Empty;
    public string SalaryRange { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RequiredSkillsJson { get; set; } = "[]";
    public int? ClientId { get; set; }
    public Client? Client { get; set; }
}

public class Candidate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Experience { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Education { get; set; } = string.Empty;
    public string SkillsJson { get; set; } = "[]";
    public string? ResumeFilePath { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Application
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public int JobId { get; set; }
    public string Stage { get; set; } = "Applied"; // Applied, Screened, Interview, Offer, Hired, Rejected
    public int MatchScore { get; set; } = 0;
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

    public Candidate? Candidate { get; set; }
    public Job? Job { get; set; }
}
