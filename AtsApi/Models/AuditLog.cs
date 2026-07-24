namespace AtsApi.Models;

/// <summary>Who did what to which record — desk trust / compliance trail.</summary>
public class AuditLog
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>e.g. Job, Candidate, Application, Placement, Client, Submittal, System</summary>
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    /// <summary>e.g. Created, Updated, Deleted, StageChanged, Exported</summary>
    public string Action { get; set; } = string.Empty;
    public string? ActorEmail { get; set; }
    public string? ActorName { get; set; }
    /// <summary>Short human summary</summary>
    public string Summary { get; set; } = string.Empty;
    /// <summary>Optional JSON details (before/after, filters, etc.)</summary>
    public string? DetailsJson { get; set; }
}
