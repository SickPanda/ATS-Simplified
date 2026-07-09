using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AtsApi.Models;

namespace AtsApi.Controllers;

[ApiController]
[Route("api/ats/auth")]
public class AuthController : ControllerBase
{
    private readonly AtsDbContext _context;
    private readonly IConfiguration _config;

    public AuthController(AtsDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpGet("debug-db")]
    public async Task<IActionResult> DebugDb()
    {
        try
        {
            var userCount = await _context.Users.CountAsync();
            var users = await _context.Users.Select(u => new { u.Id, u.Email, u.Role }).ToListAsync();
            var pendingMigrations = await _context.Database.GetPendingMigrationsAsync();
            var appliedMigrations = await _context.Database.GetAppliedMigrationsAsync();
            return Ok(new {
                Success = true,
                UserCount = userCount,
                Users = users,
                PendingMigrations = pendingMigrations,
                AppliedMigrations = appliedMigrations,
                DatabasePath = _context.Database.GetConnectionString()
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new {
                Success = false,
                Message = ex.Message,
                StackTrace = ex.StackTrace,
                InnerException = ex.InnerException?.Message
            });
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null || user.Password != req.Password)
        {
            return Unauthorized("Invalid credentials");
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_config["Jwt:Key"] ?? "super_secret_key_that_is_long_enough_for_hs256_at_least_32_chars");
        
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var jwt = tokenHandler.WriteToken(token);

        return Ok(new
        {
            token = jwt,
            user = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Role
            }
        });
    }
}
