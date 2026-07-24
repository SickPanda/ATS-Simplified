namespace AtsApi.Models;

public class Activity
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public Candidate? Candidate { get; set; }

    /// <summary>Note | Call | Email | Meeting | Stage | Ownership | System</summary>
    public string Type { get; set; } = "Note";

    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Who logged it (desk display name).</summary>
    public string? CreatedBy { get; set; }
    public string? CreatedByEmail { get; set; }

    /// <summary>Optional job context for stage/submittal notes.</summary>
    public int? JobId { get; set; }
}
