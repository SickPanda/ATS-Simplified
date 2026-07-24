using System.Text.Json.Serialization;

namespace AtsApi.Models;

public class Placement
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    
    // Financials — always store both bill + pay (never one without the other)
    public decimal PayRate { get; set; }
    public decimal BillRate { get; set; }
    /// <summary>Hourly or Annual for BillRate/PayRate.</summary>
    public string RateUnit { get; set; } = "Hourly";

    public decimal GrossMargin => BillRate - PayRate;
    public decimal MarginPercent => BillRate <= 0 ? 0 : Math.Round((BillRate - PayRate) / BillRate * 100m, 2);
    public decimal MarkupPercent => PayRate <= 0 ? 0 : Math.Round((BillRate - PayRate) / PayRate * 100m, 2);

    public DateTime StartDate { get; set; }
    public DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public Application? Application { get; set; }
}
