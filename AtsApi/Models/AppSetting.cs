namespace AtsApi.Models;

public class AppSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class EmailTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class EmailOutbox
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string ToEmail { get; set; } = string.Empty;
    public string? ToName { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Status { get; set; } = "Queued"; // Queued, Sent, Failed, LoggedOnly
    public string? Error { get; set; }
    public int? CandidateId { get; set; }
    public string? ActorEmail { get; set; }
}
