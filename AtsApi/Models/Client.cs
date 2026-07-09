namespace AtsApi.Models;

public class Client
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Status { get; set; } = "Active"; // Active, Inactive, Lead
    public string Website { get; set; } = string.Empty;
    public string PrimaryOwner { get; set; } = string.Empty; // Client Lead
    public string FederalId { get; set; } = string.Empty;
    public string PaymentTerms { get; set; } = string.Empty; // Net 30, Net 45, Net 60, etc.
    public string AboutCompany { get; set; } = string.Empty;
    public string ContactsJson { get; set; } = "[]"; // Multiple contacts stored as JSON
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
