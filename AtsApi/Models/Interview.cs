using System.Text.Json.Serialization;

namespace AtsApi.Models;

public class Interview
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public DateTime ScheduledAt { get; set; }
    public string Type { get; set; } = "Technical";
    public int? Score { get; set; } // 1-5 Stars
    public string? Feedback { get; set; }
    public DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public Application? Application { get; set; }
}
