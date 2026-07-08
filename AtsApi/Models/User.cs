namespace AtsApi.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    
    // In a real app we'd hash the password, but for this demo pitch, plaintext is easier to distribute.
    public string Password { get; set; } = string.Empty; 
    
    public string Role { get; set; } = "Recruiter"; // Admin, Recruiter
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
