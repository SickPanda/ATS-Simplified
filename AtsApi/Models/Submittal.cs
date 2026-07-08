using System.Text.Json.Serialization;

namespace AtsApi.Models;

public class Submittal
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public int ClientId { get; set; }
    public int JobId { get; set; }
    public string Status { get; set; } = "Pending Review";
    public string Summary { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public Candidate? Candidate { get; set; }
    
    [JsonIgnore]
    public Client? Client { get; set; }
    
    [JsonIgnore]
    public Job? Job { get; set; }
}
