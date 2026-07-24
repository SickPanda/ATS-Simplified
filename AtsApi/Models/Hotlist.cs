namespace AtsApi.Models;

/// <summary>Named shortlist of candidates (recruiter speed tool).</summary>
public class Hotlist
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? OwnerEmail { get; set; }
    public string? OwnerName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<HotlistMember> Members { get; set; } = new();
}

public class HotlistMember
{
    public int Id { get; set; }
    public int HotlistId { get; set; }
    public int CandidateId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    public Hotlist? Hotlist { get; set; }
    public Candidate? Candidate { get; set; }
}

/// <summary>Saved filter snapshot for candidates list.</summary>
public class SavedSearch
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>JSON: search, searchScope, expFilter, authFilter, status, source, ownership</summary>
    public string FiltersJson { get; set; } = "{}";
    public string? OwnerEmail { get; set; }
    public string? OwnerName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
