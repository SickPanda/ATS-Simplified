namespace AtsApi.Models;

public class Timesheet
{
    public int Id { get; set; }
    public int PlacementId { get; set; }
    /// <summary>Week starting Monday (date only).</summary>
    public DateTime WeekStart { get; set; }
    public decimal Hours { get; set; }
    /// <summary>Draft | Submitted | Approved | Rejected | Invoiced</summary>
    public string Status { get; set; } = "Draft";
    public string? Notes { get; set; }
    public string? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Placement? Placement { get; set; }
}

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public int? PlacementId { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public decimal BillHours { get; set; }
    public decimal BillRateHourly { get; set; }
    public decimal Amount { get; set; }
    /// <summary>Draft | Sent | Paid</summary>
    public string Status { get; set; } = "Draft";
    public string? Notes { get; set; }
    public string TimesheetIdsJson { get; set; } = "[]";
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Client? Client { get; set; }
    public Placement? Placement { get; set; }
}
