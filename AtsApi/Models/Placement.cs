using System.Text.Json.Serialization;

namespace AtsApi.Models;

public class Placement
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    
    // Financials
    public decimal PayRate { get; set; } // Hourly rate paid to candidate/vendor
    public decimal BillRate { get; set; } // Hourly rate billed to client
    
    // Calculated Margin (BillRate - PayRate)
    public decimal GrossMargin => BillRate - PayRate; 
    
    public DateTime StartDate { get; set; }
    public DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public Application? Application { get; set; }
}
