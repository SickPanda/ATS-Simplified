using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AtsApi.Models;

public class Notification
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string RoleToNotify { get; set; } = string.Empty; // e.g. "Admin", "Recruiter", "AccountManager"
    
    [Required]
    public string Message { get; set; } = string.Empty;
    
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
