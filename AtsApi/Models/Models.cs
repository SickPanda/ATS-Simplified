namespace AtsApi.Models;

public class Candidate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Experience { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? MatchScore { get; set; }
    public double? Rating { get; set; }
    public string? ResumeFilePath { get; set; }
    public List<int> SubmittedJobIds { get; set; } = new List<int>();
    public List<int> RelevantJobIds { get; set; } = new List<int>();
}

public class Job
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
