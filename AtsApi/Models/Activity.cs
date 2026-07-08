namespace AtsApi.Models;

public class Activity
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public Candidate? Candidate { get; set; }
    
    // e.g., "Note", "Email", "StageChange", "System"
    public string Type { get; set; } = string.Empty;
    
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
