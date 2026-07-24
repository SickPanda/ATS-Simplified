using System.Security.Claims;
using System.Text.Json;
using AtsApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtsApi.Services;

public class AuditService
{
    private readonly AtsDbContext _db;

    public AuditService(AtsDbContext db) => _db = db;

    public async Task LogAsync(
        ClaimsPrincipal? user,
        string entityType,
        string? entityId,
        string action,
        string summary,
        object? details = null)
    {
        var email = user?.FindFirstValue(ClaimTypes.Email)
            ?? user?.FindFirstValue(ClaimTypes.Name)
            ?? user?.Identity?.Name;
        var name = DisplayName(email);

        _db.AuditLogs.Add(new AuditLog
        {
            CreatedAt = DateTime.UtcNow,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            ActorEmail = email,
            ActorName = name,
            Summary = summary.Length > 500 ? summary[..500] : summary,
            DetailsJson = details == null
                ? null
                : JsonSerializer.Serialize(details, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        });

        await _db.SaveChangesAsync();
    }

    /// <summary>Log without a second SaveChanges if caller will save the parent entity in the same unit of work.</summary>
    public void Enqueue(
        ClaimsPrincipal? user,
        string entityType,
        string? entityId,
        string action,
        string summary,
        object? details = null)
    {
        var email = user?.FindFirstValue(ClaimTypes.Email)
            ?? user?.FindFirstValue(ClaimTypes.Name)
            ?? user?.Identity?.Name;
        var name = DisplayName(email);

        _db.AuditLogs.Add(new AuditLog
        {
            CreatedAt = DateTime.UtcNow,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            ActorEmail = email,
            ActorName = name,
            Summary = summary.Length > 500 ? summary[..500] : summary,
            DetailsJson = details == null
                ? null
                : JsonSerializer.Serialize(details, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        });
    }

    public async Task<List<AuditLog>> RecentAsync(int take = 100, string? entityType = null)
    {
        take = Math.Clamp(take, 1, 500);
        var q = _db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entityType))
            q = q.Where(a => a.EntityType == entityType);
        return await q.OrderByDescending(a => a.CreatedAt).Take(take).ToListAsync();
    }

    private static string DisplayName(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return "System";
        var local = email.Contains('@') ? email.Split('@')[0] : email;
        var parts = local.Split(new[] { '.', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(p =>
            p.Length == 0 ? p : char.ToUpperInvariant(p[0]) + p[1..].ToLowerInvariant()));
    }
}
