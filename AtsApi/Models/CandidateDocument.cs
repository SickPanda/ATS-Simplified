namespace AtsApi.Models;

/// <summary>File attached to a candidate (resume, offer, NDA, etc.).</summary>
public class CandidateDocument
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public Candidate? Candidate { get; set; }

    /// <summary>Original upload name.</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>On-disk file name (guid + extension) under resumes storage.</summary>
    public string StoredName { get; set; } = string.Empty;

    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }

    /// <summary>Resume | Offer | NDA | Other</summary>
    public string DocType { get; set; } = "Resume";

    public string? Notes { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
