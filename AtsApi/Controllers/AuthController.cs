using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace AtsApi.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;

    public AuthController(UserManager<IdentityUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _configuration = configuration;
    }

    /// <summary>Stable desk display name from email (matches AtsController ownership labels).</summary>
    public static string DisplayNameFromEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return "Unassigned";
        var local = email.Contains('@') ? email.Split('@')[0] : email;
        var parts = local.Split(new[] { '.', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(p =>
            p.Length == 0 ? p : char.ToUpperInvariant(p[0]) + p[1..].ToLowerInvariant()));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto model)
    {
        var user = await _userManager.FindByEmailAsync(model.Email);
        if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
        {
            var userRoles = await _userManager.GetRolesAsync(user);
            var displayName = DisplayNameFromEmail(user.Email);

            var authClaims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.UserName ?? user.Email!),
                new Claim(ClaimTypes.Email, user.Email!),
                new Claim("display_name", displayName),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            foreach (var userRole in userRoles)
            {
                authClaims.Add(new Claim(ClaimTypes.Role, userRole));
            }

            var token = GetToken(authClaims);

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                expiration = token.ValidTo,
                user = new { email = user.Email, name = displayName, roles = userRoles, role = userRoles.FirstOrDefault() ?? "Recruiter" }
            });
        }
        return Unauthorized(new { message = "Invalid email or password" });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto model)
    {
        var userExists = await _userManager.FindByEmailAsync(model.Email);
        if (userExists != null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "User already exists!" });

        IdentityUser user = new()
        {
            Email = model.Email,
            SecurityStamp = Guid.NewGuid().ToString(),
            UserName = model.Email
        };

        var result = await _userManager.CreateAsync(user, model.Password);
        if (!result.Succeeded)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "User creation failed! Please check user details and try again." });

        var role = string.IsNullOrWhiteSpace(model.Role) ? "Recruiter" : model.Role.Trim();
        if (role is not ("Admin" or "Recruiter"))
            role = "Recruiter";

        if (!await _roleManager.RoleExistsAsync(role))
            await _roleManager.CreateAsync(new IdentityRole(role));

        await _userManager.AddToRoleAsync(user, role);

        return Ok(new { message = "User created successfully!", email = user.Email, name = DisplayNameFromEmail(user.Email), role });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (email == null) return Unauthorized();

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null) return Unauthorized();

        var userRoles = await _userManager.GetRolesAsync(user);
        var displayName = DisplayNameFromEmail(user.Email);

        return Ok(new
        {
            email = user.Email,
            name = displayName,
            roles = userRoles,
            role = userRoles.FirstOrDefault() ?? "Recruiter"
        });
    }

    /// <summary>All desk users for ownership assignment.</summary>
    [Authorize]
    [HttpGet("team")]
    public async Task<IActionResult> GetTeam()
    {
        var users = _userManager.Users.OrderBy(u => u.Email).ToList();
        var result = new List<object>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(new
            {
                id = u.Id,
                email = u.Email,
                name = DisplayNameFromEmail(u.Email),
                roles,
                role = roles.FirstOrDefault() ?? "Recruiter"
            });
        }
        return Ok(result);
    }

    /// <summary>Admin: create a team member.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("team")]
    public async Task<IActionResult> CreateTeamMember([FromBody] CreateTeamMemberDto model)
    {
        if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            return BadRequest(new { message = "Email and password are required." });
        if (model.Password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        var exists = await _userManager.FindByEmailAsync(model.Email.Trim());
        if (exists != null)
            return Conflict(new { message = "A user with this email already exists." });

        var role = string.IsNullOrWhiteSpace(model.Role) ? "Recruiter" : model.Role.Trim();
        if (role is not ("Admin" or "Recruiter"))
            role = "Recruiter";

        var user = new IdentityUser
        {
            Email = model.Email.Trim().ToLowerInvariant(),
            UserName = model.Email.Trim().ToLowerInvariant(),
            SecurityStamp = Guid.NewGuid().ToString(),
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, model.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        if (!await _roleManager.RoleExistsAsync(role))
            await _roleManager.CreateAsync(new IdentityRole(role));
        await _userManager.AddToRoleAsync(user, role);

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            name = DisplayNameFromEmail(user.Email),
            role,
            roles = new[] { role }
        });
    }

    /// <summary>Admin: change role.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("team/{id}/role")]
    public async Task<IActionResult> SetRole(string id, [FromBody] SetRoleDto model)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var role = string.IsNullOrWhiteSpace(model.Role) ? "Recruiter" : model.Role.Trim();
        if (role is not ("Admin" or "Recruiter"))
            return BadRequest(new { message = "Role must be Admin or Recruiter." });

        var current = await _userManager.GetRolesAsync(user);
        if (current.Count > 0)
            await _userManager.RemoveFromRolesAsync(user, current);

        if (!await _roleManager.RoleExistsAsync(role))
            await _roleManager.CreateAsync(new IdentityRole(role));
        await _userManager.AddToRoleAsync(user, role);

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            name = DisplayNameFromEmail(user.Email),
            role,
            roles = new[] { role }
        });
    }

    /// <summary>Admin: disable/remove user (cannot delete self).</summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("team/{id}")]
    public async Task<IActionResult> DeleteTeamMember(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var me = User.FindFirstValue(ClaimTypes.Email);
        if (string.Equals(user.Email, me, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "You cannot delete your own account." });

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        return NoContent();
    }

    private JwtSecurityToken GetToken(List<Claim> authClaims)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? Environment.GetEnvironmentVariable("JWT_KEY")
            ?? "super_secret_key_that_is_long_enough_for_hs256_at_least_32_chars";
        var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

        var token = new JwtSecurityToken(
            expires: DateTime.UtcNow.AddHours(24),
            claims: authClaims,
            signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
        );

        return token;
    }
}

public class LoginDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
}

public class RegisterDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string Role { get; set; } = "Recruiter";
}

public class CreateTeamMemberDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string Role { get; set; } = "Recruiter";
}

public class SetRoleDto
{
    public string Role { get; set; } = "Recruiter";
}
