using System.Net;
using System.Net.Mail;
using System.Text.RegularExpressions;
using AtsApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtsApi.Services;

public class EmailSmtpConfig
{
    public bool Enabled { get; set; }
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromEmail { get; set; } = "";
    public string FromName { get; set; } = "Candeo";
    public bool EnableSsl { get; set; } = true;

    public bool IsReady =>
        Enabled
        && !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(FromEmail)
        && Port > 0;
}

public class EmailService
{
    public const string KeyEnabled = "email.enabled";
    public const string KeyHost = "email.smtp.host";
    public const string KeyPort = "email.smtp.port";
    public const string KeyUser = "email.smtp.user";
    public const string KeyPassword = "email.smtp.password";
    public const string KeyFrom = "email.from";
    public const string KeyFromName = "email.fromName";
    public const string KeySsl = "email.smtp.enableSsl";

    private readonly AtsDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _log;

    public EmailService(AtsDbContext db, IConfiguration config, ILogger<EmailService> log)
    {
        _db = db;
        _config = config;
        _log = log;
    }

    public async Task<EmailSmtpConfig> GetConfigAsync()
    {
        var map = await _db.AppSettings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value);

        // Env / appsettings fallbacks
        string Env(string k, string? cfg = null) =>
            Environment.GetEnvironmentVariable(k)
            ?? _config[cfg ?? k]
            ?? "";

        var host = Get(map, KeyHost) ?? Env("SMTP_HOST", "Smtp:Host");
        var portStr = Get(map, KeyPort) ?? Env("SMTP_PORT", "Smtp:Port");
        var user = Get(map, KeyUser) ?? Env("SMTP_USER", "Smtp:User");
        var pass = Get(map, KeyPassword) ?? Env("SMTP_PASSWORD", "Smtp:Password") ?? Env("SMTP_PASS");
        var from = Get(map, KeyFrom) ?? Env("SMTP_FROM", "Smtp:From");
        var fromName = Get(map, KeyFromName) ?? Env("SMTP_FROM_NAME", "Smtp:FromName");
        if (string.IsNullOrWhiteSpace(fromName)) fromName = "Candeo";

        var enabledStr = Get(map, KeyEnabled);
        var enabled = string.IsNullOrEmpty(enabledStr)
            ? !string.IsNullOrWhiteSpace(host)
            : enabledStr is "1" or "true" or "True" or "yes";

        var sslStr = Get(map, KeySsl);
        var ssl = string.IsNullOrEmpty(sslStr)
            ? true
            : sslStr is not ("0" or "false" or "False" or "no");

        int.TryParse(portStr, out var port);
        if (port <= 0) port = 587;

        return new EmailSmtpConfig
        {
            Enabled = enabled,
            Host = host?.Trim() ?? "",
            Port = port,
            User = user?.Trim() ?? "",
            Password = pass ?? "",
            FromEmail = from?.Trim() ?? "",
            FromName = fromName.Trim(),
            EnableSsl = ssl
        };
    }

    public async Task SaveConfigAsync(EmailSmtpConfig cfg, bool updatePassword)
    {
        await Upsert(KeyEnabled, cfg.Enabled ? "true" : "false");
        await Upsert(KeyHost, cfg.Host?.Trim() ?? "");
        await Upsert(KeyPort, cfg.Port.ToString());
        await Upsert(KeyUser, cfg.User?.Trim() ?? "");
        await Upsert(KeyFrom, cfg.FromEmail?.Trim() ?? "");
        await Upsert(KeyFromName, string.IsNullOrWhiteSpace(cfg.FromName) ? "Candeo" : cfg.FromName.Trim());
        await Upsert(KeySsl, cfg.EnableSsl ? "true" : "false");
        if (updatePassword && cfg.Password != null)
            await Upsert(KeyPassword, cfg.Password);
        await _db.SaveChangesAsync();
    }

    public object PublicStatus(EmailSmtpConfig cfg) => new
    {
        configured = cfg.IsReady,
        enabled = cfg.Enabled,
        host = cfg.Host,
        port = cfg.Port,
        user = cfg.User,
        fromEmail = cfg.FromEmail,
        fromName = cfg.FromName,
        enableSsl = cfg.EnableSsl,
        hasPassword = !string.IsNullOrEmpty(cfg.Password),
        mode = cfg.IsReady ? "smtp" : "log_only"
    };

    /// <summary>Merge {{FirstName}}, {{Name}}, {{Role}}, {{Email}}, {{Phone}}, {{City}}, {{State}}, {{Ownership}}, {{JobTitle}}, {{Company}}</summary>
    public static string Merge(string template, Candidate? c, Job? job = null, string? company = null)
    {
        if (string.IsNullOrEmpty(template)) return template;
        var first = c?.Name?.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "there";
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["FirstName"] = first,
            ["Name"] = c?.Name ?? "",
            ["Role"] = c?.Role ?? "",
            ["Email"] = c?.Email ?? "",
            ["Phone"] = c?.Phone ?? "",
            ["City"] = c?.City ?? "",
            ["State"] = c?.State ?? "",
            ["Ownership"] = c?.Ownership ?? "",
            ["WorkAuthorization"] = c?.WorkAuthorization ?? "",
            ["JobTitle"] = job?.Title ?? "",
            ["JobCode"] = job?.JobCode ?? "",
            ["Location"] = job?.Location ?? "",
            ["Company"] = company ?? "",
        };

        return Regex.Replace(template, @"\{\{\s*(\w+)\s*\}\}", m =>
        {
            var key = m.Groups[1].Value;
            return map.TryGetValue(key, out var v) ? v : m.Value;
        });
    }

    public async Task<(bool ok, string status, string? error)> SendAsync(
        string toEmail,
        string? toName,
        string subject,
        string body,
        int? candidateId,
        string? actorEmail)
    {
        var outbox = new EmailOutbox
        {
            CreatedAt = DateTime.UtcNow,
            ToEmail = toEmail,
            ToName = toName,
            Subject = subject,
            Body = body,
            CandidateId = candidateId,
            ActorEmail = actorEmail
        };

        if (string.IsNullOrWhiteSpace(toEmail) || !toEmail.Contains('@'))
        {
            outbox.Status = "Failed";
            outbox.Error = "Invalid recipient email";
            _db.EmailOutbox.Add(outbox);
            await _db.SaveChangesAsync();
            return (false, outbox.Status, outbox.Error);
        }

        var cfg = await GetConfigAsync();
        if (!cfg.IsReady)
        {
            // Desk can still log outreach without SMTP — honest status
            outbox.Status = "LoggedOnly";
            outbox.Error = "SMTP not configured — message saved to timeline only";
            _db.EmailOutbox.Add(outbox);
            await _db.SaveChangesAsync();
            return (false, outbox.Status, outbox.Error);
        }

        try
        {
            using var client = new SmtpClient(cfg.Host, cfg.Port)
            {
                EnableSsl = cfg.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000
            };
            if (!string.IsNullOrWhiteSpace(cfg.User))
                client.Credentials = new NetworkCredential(cfg.User, cfg.Password);

            using var msg = new MailMessage
            {
                From = new MailAddress(cfg.FromEmail, cfg.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = body.Contains('<') && body.Contains('>'),
            };
            msg.To.Add(string.IsNullOrWhiteSpace(toName)
                ? new MailAddress(toEmail)
                : new MailAddress(toEmail, toName));

            await client.SendMailAsync(msg);
            outbox.Status = "Sent";
            _db.EmailOutbox.Add(outbox);
            await _db.SaveChangesAsync();
            return (true, "Sent", null);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "SMTP send failed to {To}", toEmail);
            outbox.Status = "Failed";
            outbox.Error = ex.Message.Length > 400 ? ex.Message[..400] : ex.Message;
            _db.EmailOutbox.Add(outbox);
            await _db.SaveChangesAsync();
            return (false, "Failed", outbox.Error);
        }
    }

    public async Task EnsureDefaultTemplatesAsync()
    {
        if (await _db.EmailTemplates.AnyAsync()) return;

        _db.EmailTemplates.AddRange(
            new EmailTemplate
            {
                Name = "Intro outreach",
                Subject = "Quick intro — {{FirstName}}",
                Body = "Hi {{FirstName}},\n\nI came across your background in {{Role}} and wanted to introduce myself. We work with teams that value people with your profile.\n\nWould you be open to a short chat this week?\n\nBest regards",
                IsSystem = true,
                UpdatedAt = DateTime.UtcNow
            },
            new EmailTemplate
            {
                Name = "Job pitch",
                Subject = "{{JobTitle}} — thought of you",
                Body = "Hi {{FirstName}},\n\nI have a {{JobTitle}} opportunity ({{JobCode}}) that looks like a strong match for your experience.\n\nLocation: {{Location}}\n\nIf you're open to hearing more, reply and I'll share details.\n\nBest regards",
                IsSystem = true,
                UpdatedAt = DateTime.UtcNow
            },
            new EmailTemplate
            {
                Name = "Interview follow-up",
                Subject = "Thanks for interviewing — {{JobTitle}}",
                Body = "Hi {{FirstName}},\n\nThank you for taking the time to interview for {{JobTitle}}. I'll follow up with next steps as soon as I have them.\n\nPlease don't hesitate to reach out with any questions.\n\nBest regards",
                IsSystem = true,
                UpdatedAt = DateTime.UtcNow
            },
            new EmailTemplate
            {
                Name = "Availability check",
                Subject = "Availability for a new role?",
                Body = "Hi {{FirstName}},\n\nHope you're doing well. Are you open to hearing about new opportunities right now? I have a few roles that may fit your {{Role}} background.\n\nHappy to share more if timing is good.\n\nBest regards",
                IsSystem = true,
                UpdatedAt = DateTime.UtcNow
            }
        );
        await _db.SaveChangesAsync();
    }

    private static string? Get(Dictionary<string, string> map, string key) =>
        map.TryGetValue(key, out var v) ? v : null;

    private async Task Upsert(string key, string value)
    {
        var row = await _db.AppSettings.FindAsync(key);
        if (row == null)
            _db.AppSettings.Add(new AppSetting { Key = key, Value = value });
        else
            row.Value = value;
    }
}
