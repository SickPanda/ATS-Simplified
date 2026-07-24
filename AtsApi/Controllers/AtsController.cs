using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AtsApi.Models;
using AtsApi.Services;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace AtsApi.Controllers;

[ApiController]
[Route("api/ats")]
public class AtsController : ControllerBase
{
    private readonly AtsDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly AuditService _audit;
    private readonly EmailService _email;
    private readonly IWebHostEnvironment _env;
    private readonly HttpClient _httpClient = new();

    public AtsController(
        AtsDbContext context,
        IConfiguration configuration,
        AuditService audit,
        EmailService email,
        IWebHostEnvironment env)
    {
        _context = context;
        _configuration = configuration;
        _audit = audit;
        _email = email;
        _env = env;
    }

    /// <summary>Display name for ownership fields from JWT claims.</summary>
    private string CurrentUserDisplayName()
    {
        var claim = User.FindFirstValue("display_name");
        if (!string.IsNullOrWhiteSpace(claim)) return claim;
        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.Identity?.Name;
        return AuthController.DisplayNameFromEmail(email);
    }

    private bool IsAdmin() =>
        User.IsInRole("Admin")
        || User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "Admin");

    private static readonly HashSet<string> ActivityTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Note", "Call", "Email", "Meeting", "Stage", "Ownership", "System"
    };

    private static string NormalizeActivityType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type)) return "Note";
        // Map legacy labels from bulk email / match / parser
        var t = type.Trim();
        if (t.StartsWith("Email", StringComparison.OrdinalIgnoreCase)) return "Email";
        if (t.Contains("Stage", StringComparison.OrdinalIgnoreCase)) return "Stage";
        if (t.Contains("Owner", StringComparison.OrdinalIgnoreCase)) return "Ownership";
        if (t.Equals("Match", StringComparison.OrdinalIgnoreCase)
            || t.Equals("Intelligence", StringComparison.OrdinalIgnoreCase)
            || t.Equals("Parse", StringComparison.OrdinalIgnoreCase))
            return "System";
        if (ActivityTypes.Contains(t))
            return ActivityTypes.First(x => x.Equals(t, StringComparison.OrdinalIgnoreCase));
        return "Note";
    }

    /// <summary>Enqueue a candidate timeline entry (same SaveChanges as caller).</summary>
    private void EnqueueActivity(int candidateId, string type, string content, int? jobId = null)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        _context.Activities.Add(new Activity
        {
            CandidateId = candidateId,
            Type = NormalizeActivityType(type),
            Content = content,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = CurrentUserDisplayName(),
            CreatedByEmail = email,
            JobId = jobId
        });
    }

    // -- DASHBOARD --
    [HttpGet("dashboard")]
    public async Task<ActionResult> GetDashboardStats()
    {
        var totalJobs = await _context.Jobs.CountAsync(j => j.Status == "Active");
        var totalCandidates = await _context.Candidates.CountAsync();
        var hiredCandidates = await _context.Applications.CountAsync(a => a.Stage == "Hired");
        var activeApplications = await _context.Applications.CountAsync(a => a.Stage != "Hired" && a.Stage != "Rejected");
        var pendingSubmittals = await _context.Submittals.CountAsync(s =>
            s.Status == "Pending Review" || s.Status == "Pending" || string.IsNullOrEmpty(s.Status));
        var interviewsThisWeek = await _context.Interviews.CountAsync(i =>
            i.ScheduledAt >= DateTime.UtcNow.Date && i.ScheduledAt < DateTime.UtcNow.Date.AddDays(7));
        var clients = await _context.Clients.CountAsync(c => c.Status == "Active" || c.Status == null || c.Status == "");

        return Ok(new
        {
            TotalJobs = totalJobs,
            TotalCandidates = totalCandidates,
            HiredCandidates = hiredCandidates,
            ActiveApplications = activeApplications,
            PendingSubmittals = pendingSubmittals,
            InterviewsThisWeek = interviewsThisWeek,
            ActiveClients = clients
        });
    }

    // -- JOBS --
    [HttpGet("jobs")]
    public async Task<ActionResult<IEnumerable<Job>>> GetJobs()
    {
        return await _context.Jobs.ToListAsync();
    }

    [HttpPost("jobs")]
    public async Task<ActionResult<Job>> CreateJob(Job job)
    {
        var owner = CurrentUserDisplayName();
        if (string.IsNullOrWhiteSpace(job.PrimaryRecruiter)) job.PrimaryRecruiter = owner;
        if (string.IsNullOrWhiteSpace(job.RecruitmentManager)) job.RecruitmentManager = owner;
        if (string.IsNullOrWhiteSpace(job.RateUnit)) job.RateUnit = RateMath.Hourly;
        job.RateUnit = RateMath.IsAnnual(job.RateUnit) ? RateMath.Annual : RateMath.Hourly;
        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Job", job.Id.ToString(), "Created", $"Created job {job.Title} ({job.JobCode})");
        return CreatedAtAction(nameof(GetJobs), new { id = job.Id }, job);
    }

    [HttpGet("jobs/{id}")]
    public async Task<ActionResult<Job>> GetJob(int id)
    {
        var job = await _context.Jobs.FindAsync(id);
        if (job == null) return NotFound();
        return job;
    }

    [HttpPut("jobs/{id}")]
    public async Task<IActionResult> UpdateJob(int id, Job jobUpdates)
    {
        var job = await _context.Jobs.FindAsync(id);
        if (job == null) return NotFound();

        job.Title = jobUpdates.Title;
        job.Department = jobUpdates.Department;
        job.Location = jobUpdates.Location;
        job.SalaryRange = jobUpdates.SalaryRange;
        job.Description = jobUpdates.Description;
        job.RequiredSkillsJson = jobUpdates.RequiredSkillsJson;
        job.ClientId = jobUpdates.ClientId;
        job.BillRate = jobUpdates.BillRate;
        job.PayRate = jobUpdates.PayRate;
        if (!string.IsNullOrWhiteSpace(jobUpdates.RateUnit))
            job.RateUnit = RateMath.IsAnnual(jobUpdates.RateUnit) ? RateMath.Annual : RateMath.Hourly;
        if (string.IsNullOrWhiteSpace(job.RateUnit)) job.RateUnit = RateMath.Hourly;

        _audit.Enqueue(User, "Job", id.ToString(), "Updated", $"Updated job {job.Title}");
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // -- CANDIDATES --
    [HttpGet("candidates")]
    public async Task<ActionResult<IEnumerable<Candidate>>> GetCandidates()
    {
        return await _context.Candidates.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }
    
    [HttpGet("candidates/{id}")]
    public async Task<ActionResult<Candidate>> GetCandidate(int id)
    {
        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound();
        return candidate;
    }

    // -- APPLICATIONS (Kanban / Pipeline) --
    [HttpGet("jobs/{jobId}/applications")]
    public async Task<ActionResult> GetJobApplications(int jobId)
    {
        var apps = await _context.Applications
            .Include(a => a.Candidate)
            .Where(a => a.JobId == jobId)
            .ToListAsync();
            
        return Ok(apps);
    }

    [HttpPost("applications")]
    public async Task<ActionResult> CreateApplication([FromBody] Application app)
    {
        // Prevent duplicate applications
        var existing = await _context.Applications
            .FirstOrDefaultAsync(a => a.CandidateId == app.CandidateId && a.JobId == app.JobId);
            
        if (existing != null)
            return BadRequest("Candidate is already applied to this job.");

        // Compute explainable match score (local + optional AI blend)
        var candidate = await _context.Candidates.FindAsync(app.CandidateId);
        var job = await _context.Jobs.FindAsync(app.JobId);
        MatchEngine.MatchResult? match = null;
        if (candidate != null && job != null)
        {
            var scored = await ComputeMatchScoreAsync(candidate, job);
            match = scored.Local;
            app.MatchScore = scored.Score;

            EnqueueActivity(candidate.Id, "Stage",
                $"Added to pipeline: {job.Title} · match {scored.Score}% — {match.Summary}", job.Id);
        }

        app.AppliedAt = DateTime.UtcNow;
        _context.Applications.Add(app);
        await _context.SaveChangesAsync();
        
        // Fetch with candidate details to return
        var fullApp = await _context.Applications
            .Include(a => a.Candidate)
            .FirstOrDefaultAsync(a => a.Id == app.Id);

        return Ok(new
        {
            fullApp!.Id,
            fullApp.CandidateId,
            fullApp.JobId,
            fullApp.Stage,
            fullApp.MatchScore,
            fullApp.AppliedAt,
            fullApp.Candidate,
            matchBreakdown = match == null ? null : new
            {
                match.Score,
                match.MatchedSkills,
                match.MissingSkills,
                match.ExtraSkills,
                match.SkillScore,
                match.RoleScore,
                match.ExperienceScore,
                match.LocationScore,
                match.Summary,
                match.Method
            }
        });
    }

    [HttpGet("applications")]
    public async Task<ActionResult<IEnumerable<Application>>> GetAllApplications()
    {
        return await _context.Applications.ToListAsync();
    }

    /// <summary>
    /// Prefer local explainable scoring. Optionally blend with Gemini when a key is present.
    /// </summary>
    private async Task<(int Score, MatchEngine.MatchResult Local)> ComputeMatchScoreAsync(Candidate candidate, Job job)
    {
        var local = MatchEngine.Score(candidate, job);

        var apiKey = Request.Headers["X-Gemini-Key"].ToString();
        if (string.IsNullOrEmpty(apiKey)) apiKey = _configuration["GeminiApiKey"];
        if (string.IsNullOrEmpty(apiKey)) return (local.Score, local);

        var prompt = "Score how well this candidate matches the job. Return ONLY a single integer between 0 and 100.\n\n" +
            $"Job Title: {job.Title}\n" +
            $"Job Required Skills: {job.RequiredSkillsJson}\n" +
            $"Job Description: {job.Description}\n\n" +
            $"Candidate Role: {candidate.Role}\n" +
            $"Candidate Experience: {candidate.Experience}\n" +
            $"Candidate Skills: {candidate.SkillsJson}\n\n" +
            "Return only the number, nothing else.";

        var text = await CallGeminiAsync(prompt, apiKey);
        if (int.TryParse(text?.Trim().Split('\n')[0].Trim(), out var aiScore))
        {
            // 60% local (explainable) + 40% AI — never fully black-box
            var blended = (int)Math.Round(local.Score * 0.6 + Math.Clamp(aiScore, 0, 100) * 0.4);
            return (blended, local);
        }

        return (local.Score, local);
    }

    private async Task<string?> CallGeminiAsync(string prompt, string apiKey)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";
        var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
        var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        
        try
        {
            var response = await _httpClient.PostAsync(url, content);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString()?.Trim();
            }
        }
        catch { /* fail silently */ }
        return null;
    }

    // -- COPILOT --
    [HttpPost("copilot/summarize/{candidateId}")]
    public async Task<IActionResult> SummarizeCandidate(int candidateId)
    {
        var apiKey = Request.Headers["X-Gemini-Key"].ToString();
        if (string.IsNullOrEmpty(apiKey)) apiKey = _configuration["GeminiApiKey"];
        if (string.IsNullOrEmpty(apiKey)) return BadRequest("Missing Gemini API Key");

        var candidate = await _context.Candidates.FindAsync(candidateId);
        if (candidate == null) return NotFound();

        var prompt = "You are an expert technical recruiter. Based on this candidate's information, write exactly 3 concise, punchy bullet points summarizing their key strengths and experience. Do not include any intro or outro text, just the 3 bullet points starting with '-'.\n\n" +
            $"Role: {candidate.Role}\nExperience: {candidate.Experience}\nSkills: {candidate.SkillsJson}";
            
        var summary = await CallGeminiAsync(prompt, apiKey);
        if (string.IsNullOrEmpty(summary)) return StatusCode(500, "Failed to generate summary");
        
        return Ok(new { summary });
    }

    public class DraftEmailRequest
    {
        public int CandidateId { get; set; }
        public int JobId { get; set; }
    }

    [HttpPost("copilot/draft-email")]
    public async Task<IActionResult> DraftOutreachEmail([FromBody] DraftEmailRequest req)
    {
        var candidate = await _context.Candidates.FindAsync(req.CandidateId);
        var job = await _context.Jobs.FindAsync(req.JobId);
        if (candidate == null || job == null) return NotFound();

        // Prefer in-app Job pitch template (no external AI required)
        await _email.EnsureDefaultTemplatesAsync();
        var tpl = await _context.EmailTemplates.FirstOrDefaultAsync(t => t.Name == "Job pitch")
            ?? await _context.EmailTemplates.OrderBy(t => t.Id).FirstOrDefaultAsync();

        string subject;
        string draft;
        string source;

        var apiKey = Request.Headers["X-Gemini-Key"].ToString();
        if (string.IsNullOrEmpty(apiKey)) apiKey = _configuration["GeminiApiKey"];

        if (!string.IsNullOrEmpty(apiKey))
        {
            var prompt = "You are a top-tier executive recruiter. Write a short, highly personalized, and compelling outreach email to this candidate pitching them this specific job. Mention their specific skills that align with the job requirements. Keep it under 150 words. Be professional but very engaging.\n\n" +
                $"Candidate Name: {candidate.Name.Split(' ')[0]}\nCandidate Skills: {candidate.SkillsJson}\nCandidate Experience: {candidate.Experience}\n\n" +
                $"Job Title: {job.Title}\nJob Required Skills: {job.RequiredSkillsJson}\nJob Description: {job.Description}";
            draft = await CallGeminiAsync(prompt, apiKey) ?? "";
            subject = EmailService.Merge("{{JobTitle}} — thought of you", candidate, job);
            source = string.IsNullOrEmpty(draft) ? "template" : "gemini";
            if (string.IsNullOrEmpty(draft) && tpl != null)
            {
                draft = EmailService.Merge(tpl.Body, candidate, job);
                subject = EmailService.Merge(tpl.Subject, candidate, job);
            }
        }
        else if (tpl != null)
        {
            subject = EmailService.Merge(tpl.Subject, candidate, job);
            draft = EmailService.Merge(tpl.Body, candidate, job);
            source = "template";
        }
        else
        {
            subject = $"{job.Title} — thought of you";
            draft = $"Hi {candidate.Name.Split(' ')[0]},\n\nI wanted to share a {job.Title} opportunity that may fit your background.\n\nBest regards";
            source = "fallback";
        }

        if (string.IsNullOrEmpty(draft)) return StatusCode(500, "Failed to generate draft");
        return Ok(new { draft, subject, source });
    }

    [HttpPut("applications/{id}/stage")]
    public async Task<IActionResult> UpdateApplicationStage(int id, [FromBody] string stage)
    {
        var app = await _context.Applications.FindAsync(id);
        if (app == null) return NotFound();

        var previous = app.Stage;
        app.Stage = stage;
        _audit.Enqueue(User, "Application", id.ToString(), "StageChanged",
            $"Stage {previous} → {stage} (app #{id})",
            new { previous, stage, app.CandidateId, app.JobId });
        EnqueueActivity(app.CandidateId, "Stage",
            $"Pipeline stage: {previous} → {stage}", app.JobId);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // -- DELETE CANDIDATE --
    [HttpDelete("candidates/{id}")]
    public async Task<IActionResult> DeleteCandidate(int id)
    {
        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound();

        var name = candidate.Name;
        // Remove linked applications first
        var apps = _context.Applications.Where(a => a.CandidateId == id);
        _context.Applications.RemoveRange(apps);
        
        // Remove linked activities
        var acts = _context.Activities.Where(a => a.CandidateId == id);
        _context.Activities.RemoveRange(acts);

        _context.Candidates.Remove(candidate);
        _audit.Enqueue(User, "Candidate", id.ToString(), "Deleted", $"Deleted candidate {name}");
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // -- CANDIDATE ACTIVITIES --
    [HttpGet("candidates/{id}/activities")]
    public async Task<ActionResult<IEnumerable<Activity>>> GetCandidateActivities(int id)
    {
        return await _context.Activities
            .Where(a => a.CandidateId == id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    [HttpPost("candidates/{id}/activities")]
    public async Task<ActionResult<Activity>> CreateCandidateActivity(int id, [FromBody] Activity activity)
    {
        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound();
        if (string.IsNullOrWhiteSpace(activity.Content))
            return BadRequest(new { message = "Content is required." });

        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        activity.Id = 0;
        activity.CandidateId = id;
        activity.CreatedAt = DateTime.UtcNow;
        activity.Type = NormalizeActivityType(activity.Type);
        activity.CreatedBy = CurrentUserDisplayName();
        activity.CreatedByEmail = email;
        activity.Content = activity.Content.Trim();

        _context.Activities.Add(activity);

        // @mentions → in-app notifications (role or name token)
        if (activity.Content.Contains('@'))
        {
            var words = activity.Content.Split(new[] { ' ', '\n', '\r', ',', '.' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var word in words)
            {
                if (word.StartsWith('@') && word.Length > 1)
                {
                    _context.Notifications.Add(new Notification
                    {
                        RoleToNotify = word[1..],
                        Message = $"{activity.CreatedBy} mentioned you on {candidate.Name}: {activity.Content[..Math.Min(120, activity.Content.Length)]}"
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Candidate", id.ToString(), "Activity",
            $"{activity.Type}: {activity.Content[..Math.Min(80, activity.Content.Length)]}");

        return Ok(activity);
    }

    [HttpGet("candidates/{id}/applications")]
    public async Task<ActionResult> GetCandidateApplications(int id)
    {
        var apps = await _context.Applications.AsNoTracking()
            .Where(a => a.CandidateId == id)
            .Include(a => a.Job)
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new
            {
                a.Id,
                a.JobId,
                a.Stage,
                a.MatchScore,
                a.AppliedAt,
                jobTitle = a.Job != null ? a.Job.Title : null,
                jobCode = a.Job != null ? a.Job.JobCode : null,
                jobStatus = a.Job != null ? a.Job.Status : null
            })
            .ToListAsync();
        return Ok(apps);
    }

    // -- CLIENTS --
    [HttpGet("clients")]
    public async Task<ActionResult<IEnumerable<Client>>> GetClients()
    {
        return await _context.Clients.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }

    [HttpPost("clients")]
    public async Task<ActionResult<Client>> CreateClient(Client client)
    {
        client.CreatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(client.ContactsJson)) client.ContactsJson = "[]";
        if (string.IsNullOrWhiteSpace(client.PrimaryOwner)) client.PrimaryOwner = CurrentUserDisplayName();
        _context.Clients.Add(client);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Client", client.Id.ToString(), "Created", $"Created client {client.Name}");
        return CreatedAtAction(nameof(GetClients), new { id = client.Id }, client);
    }

    [HttpPut("clients/{id}")]
    public async Task<IActionResult> UpdateClient(int id, Client client)
    {
        if (id != client.Id) return BadRequest();
        if (string.IsNullOrEmpty(client.ContactsJson)) client.ContactsJson = "[]";
        _context.Entry(client).State = EntityState.Modified;
        try
        {
            _audit.Enqueue(User, "Client", id.ToString(), "Updated", $"Updated client {client.Name}");
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Clients.Any(c => c.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    // -- SUBMITTALS --
    [HttpGet("clients/{id}/submittals")]
    public async Task<ActionResult> GetClientSubmittals(int id)
    {
        var submittals = await _context.Submittals
            .Where(s => s.ClientId == id)
            .Select(s => new {
                s.Id, s.Status, s.Summary, s.CreatedAt,
                CandidateName = s.Candidate!.Name,
                CandidateRole = s.Candidate!.Role,
                JobTitle = s.Job!.Title
            })
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
            
        return Ok(submittals);
    }

    [HttpGet("submittals")]
    public async Task<ActionResult> GetSubmittals()
    {
        var submittals = await _context.Submittals
            .Include(s => s.Candidate)
            .Include(s => s.Job)
                .ThenInclude(j => j!.Client)
            .Select(s => new {
                s.Id,
                s.Status,
                s.Summary,
                s.CreatedAt,
                CandidateName = s.Candidate != null ? s.Candidate.Name : "Unknown",
                CandidateEmail = s.Candidate != null ? s.Candidate.Email : "",
                CandidatePhone = s.Candidate != null ? s.Candidate.Phone : "",
                JobTitle = s.Job != null ? s.Job.Title : "Unknown",
                JobCode = s.Job != null ? s.Job.JobCode : "N/A",
                ClientJobId = s.Job != null ? s.Job.ClientJobId : "N/A",
                ClientName = s.Job != null && s.Job.Client != null ? s.Job.Client.Name : "Internal",
                PrimaryRecruiter = s.Job != null ? s.Job.PrimaryRecruiter : "",
                RecruitmentManager = s.Job != null ? s.Job.RecruitmentManager : ""
            })
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
            
        return Ok(submittals);
    }

    [HttpPost("submittals")]
    public async Task<ActionResult> CreateSubmittal(Submittal submittal)
    {
        // Prevent duplicate submittals for the same candidate/client/job
        var existing = await _context.Submittals
            .FirstOrDefaultAsync(s => s.CandidateId == submittal.CandidateId && s.ClientId == submittal.ClientId && s.JobId == submittal.JobId);
            
        if (existing != null)
            return BadRequest("Candidate already submitted to this client for this job.");

        submittal.CreatedAt = DateTime.UtcNow;
        _context.Submittals.Add(submittal);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Submittal", submittal.Id.ToString(), "Created",
            $"Submitted candidate #{submittal.CandidateId} to client #{submittal.ClientId} for job #{submittal.JobId}");
        
        return Ok(submittal);
    }

    // -- INTERVIEWS --
    [HttpPost("applications/{id}/interviews")]
    public async Task<ActionResult> ScheduleInterview(int id, Interview interview)
    {
        interview.ApplicationId = id;
        interview.CreatedAt = DateTime.UtcNow;
        _context.Interviews.Add(interview);
        
        var app = await _context.Applications.Include(a => a.Candidate).FirstOrDefaultAsync(a => a.Id == id);
        if (app != null) app.Stage = "Interview";
        
        await _context.SaveChangesAsync();
        
        var ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\n" +
                  $"DTSTART:{interview.ScheduledAt:yyyyMMddTHHmmssZ}\r\n" +
                  $"DTEND:{interview.ScheduledAt.AddHours(1):yyyyMMddTHHmmssZ}\r\n" +
                  $"SUMMARY:Interview with {app?.Candidate?.Name ?? "Candidate"}\r\n" +
                  $"DESCRIPTION:Interview\r\n" +
                  "END:VEVENT\r\nEND:VCALENDAR";

        return Ok(new { interview, ics });
    }

    [HttpPut("interviews/{id}/score")]
    public async Task<IActionResult> ScoreInterview(int id, [FromBody] Interview updateData)
    {
        var interview = await _context.Interviews.FindAsync(id);
        if (interview == null) return NotFound();
        
        interview.Score = updateData.Score;
        interview.Feedback = updateData.Feedback;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // -- PLACEMENTS --
    [HttpPost("applications/{id}/placements")]
    public async Task<ActionResult> CreatePlacement(int id, Placement placement)
    {
        var app = await _context.Applications.FindAsync(id);
        if (app == null) return NotFound();

        // Prefill from job if client sent zeros
        var job = await _context.Jobs.FindAsync(app.JobId);
        if (job != null)
        {
            if (placement.BillRate <= 0) placement.BillRate = job.BillRate;
            if (placement.PayRate <= 0) placement.PayRate = job.PayRate;
            if (string.IsNullOrWhiteSpace(placement.RateUnit))
                placement.RateUnit = string.IsNullOrWhiteSpace(job.RateUnit) ? RateMath.Hourly : job.RateUnit;
        }
        placement.RateUnit = RateMath.IsAnnual(placement.RateUnit) ? RateMath.Annual : RateMath.Hourly;
        placement.ApplicationId = id;
        placement.CreatedAt = DateTime.UtcNow;
        _context.Placements.Add(placement);
        
        app.Stage = "Hired";
        
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Placement", placement.Id.ToString(), "Created",
            $"Placement #{placement.Id} · app #{id} · bill {placement.BillRate} / pay {placement.PayRate} {placement.RateUnit}");
        return Ok(new
        {
            placement.Id,
            placement.ApplicationId,
            placement.PayRate,
            placement.BillRate,
            placement.RateUnit,
            placement.GrossMargin,
            placement.MarginPercent,
            placement.MarkupPercent,
            placement.StartDate,
            placement.CreatedAt,
            rates = RateMath.Snapshot(placement.BillRate, placement.PayRate, placement.RateUnit)
        });
    }

    [HttpGet("placements")]
    public async Task<ActionResult> GetPlacements()
    {
        var placements = await _context.Placements
            .Include(p => p.Application)
                .ThenInclude(a => a!.Candidate)
            .Include(p => p.Application)
                .ThenInclude(a => a!.Job)
                    .ThenInclude(j => j!.Client)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var result = placements.Select(p => new {
            p.Id,
            p.StartDate,
            p.PayRate,
            p.BillRate,
            p.RateUnit,
            p.GrossMargin,
            marginPercent = p.MarginPercent,
            markupPercent = p.MarkupPercent,
            p.CreatedAt,
            CandidateName = p.Application != null && p.Application.Candidate != null ? p.Application.Candidate.Name : "Unknown",
            JobTitle = p.Application != null && p.Application.Job != null ? p.Application.Job.Title : "Unknown",
            JobCode = p.Application != null && p.Application.Job != null ? p.Application.Job.JobCode : "N/A",
            ClientName = p.Application != null && p.Application.Job != null && p.Application.Job.Client != null ? p.Application.Job.Client.Name : "Internal",
            rates = RateMath.Snapshot(p.BillRate, p.PayRate, p.RateUnit)
        }).ToList();

        return Ok(result);
    }

    /// <summary>Convert bill/pay between Hourly and Annual (2080 hrs/year).</summary>
    [HttpPost("rates/convert")]
    public ActionResult ConvertRates([FromBody] RateConvertRequest req)
    {
        var from = RateMath.IsAnnual(req.FromUnit) ? RateMath.Annual : RateMath.Hourly;
        var to = RateMath.IsAnnual(req.ToUnit) ? RateMath.Annual : RateMath.Hourly;
        var bill = RateMath.Convert(req.BillRate, from, to);
        var pay = RateMath.Convert(req.PayRate, from, to);
        return Ok(new
        {
            fromUnit = from,
            toUnit = to,
            billRate = Math.Round(bill, 2),
            payRate = Math.Round(pay, 2),
            rates = RateMath.Snapshot(bill, pay, to)
        });
    }

    public class RateConvertRequest
    {
        public decimal BillRate { get; set; }
        public decimal PayRate { get; set; }
        public string FromUnit { get; set; } = "Hourly";
        public string ToUnit { get; set; } = "Annual";
    }

    // -- JOB STATUS TOGGLE --
    [HttpPut("jobs/{id}/status")]
    public async Task<IActionResult> UpdateJobStatus(int id, [FromBody] string status)
    {
        var job = await _context.Jobs.FindAsync(id);
        if (job == null) return NotFound();

        job.Status = status;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // -- NOTIFICATIONS --
    [HttpGet("notifications")]
    public async Task<ActionResult> GetNotifications()
    {
        return Ok(await _context.Notifications.Where(n => !n.IsRead).OrderByDescending(n => n.CreatedAt).ToListAsync());
    }

    [HttpPut("notifications/{id}/read")]
    public async Task<ActionResult> MarkNotificationRead(int id)
    {
        var notif = await _context.Notifications.FindAsync(id);
        if (notif == null) return NotFound();
        notif.IsRead = true;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // -- BULK ACTIONS --
    public class BulkAssignRequest { public List<int> CandidateIds { get; set; } = new(); public int JobId { get; set; } }

    [HttpPost("candidates/bulk-assign")]
    public async Task<ActionResult> BulkAssign([FromBody] BulkAssignRequest req)
    {
        var job = await _context.Jobs.FindAsync(req.JobId);
        if (job == null) return NotFound("Job not found");

        int count = 0;
        foreach (var cid in req.CandidateIds)
        {
            if (!await _context.Applications.AnyAsync(a => a.CandidateId == cid && a.JobId == req.JobId))
            {
                var candidate = await _context.Candidates.FindAsync(cid);
                var score = candidate != null ? MatchEngine.Score(candidate, job).Score : 0;
                _context.Applications.Add(new Application
                {
                    CandidateId = cid,
                    JobId = req.JobId,
                    Stage = "Applied",
                    MatchScore = score,
                    AppliedAt = DateTime.UtcNow
                });
                count++;
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { assigned = count });
    }

    public class BulkEmailRequest
    {
        public List<int> CandidateIds { get; set; } = new();
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
        public int? JobId { get; set; }
        public int? TemplateId { get; set; }
    }

    [HttpPost("candidates/bulk-email")]
    public async Task<ActionResult> BulkEmail([FromBody] BulkEmailRequest req)
    {
        if (req.CandidateIds == null || req.CandidateIds.Count == 0)
            return BadRequest(new { message = "Select at least one candidate." });
        if (string.IsNullOrWhiteSpace(req.Subject) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Subject and body are required." });

        Job? job = null;
        if (req.JobId is int jid)
            job = await _context.Jobs.FindAsync(jid);

        var actor = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        int sent = 0, failed = 0, loggedOnly = 0, skipped = 0;
        var errors = new List<object>();

        foreach (var cid in req.CandidateIds.Distinct())
        {
            var c = await _context.Candidates.FindAsync(cid);
            if (c == null) { skipped++; continue; }
            if (string.IsNullOrWhiteSpace(c.Email) || !c.Email.Contains('@') || c.Email == "Unknown")
            {
                skipped++;
                errors.Add(new { candidateId = cid, name = c.Name, error = "No valid email" });
                continue;
            }

            var subject = EmailService.Merge(req.Subject, c, job);
            var body = EmailService.Merge(req.Body, c, job);
            var (ok, status, error) = await _email.SendAsync(c.Email, c.Name, subject, body, c.Id, actor);

            EnqueueActivity(cid, "Email",
                $"[{status}] Subject: {subject}\n\n{body}" + (error != null ? $"\n\n{error}" : ""),
                req.JobId);

            if (ok) sent++;
            else if (status == "LoggedOnly") loggedOnly++;
            else
            {
                failed++;
                errors.Add(new { candidateId = cid, name = c.Name, error });
            }
        }

        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "System", null, "EmailBulk",
            $"Bulk email: sent={sent} loggedOnly={loggedOnly} failed={failed} skipped={skipped}",
            new { sent, loggedOnly, failed, skipped, req.TemplateId, req.JobId });

        var cfg = await _email.GetConfigAsync();
        return Ok(new
        {
            sent,
            loggedOnly,
            failed,
            skipped,
            total = req.CandidateIds.Count,
            smtpConfigured = cfg.IsReady,
            mode = cfg.IsReady ? "smtp" : "log_only",
            errors = errors.Take(20)
        });
    }

    public class SendEmailRequest
    {
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
        public int? JobId { get; set; }
    }

    [HttpPost("candidates/{id}/email")]
    public async Task<ActionResult> SendCandidateEmail(int id, [FromBody] SendEmailRequest req)
    {
        var c = await _context.Candidates.FindAsync(id);
        if (c == null) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Subject) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Subject and body are required." });

        Job? job = req.JobId is int jid ? await _context.Jobs.FindAsync(jid) : null;
        var subject = EmailService.Merge(req.Subject, c, job);
        var body = EmailService.Merge(req.Body, c, job);
        var actor = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        var (ok, status, error) = await _email.SendAsync(c.Email, c.Name, subject, body, c.Id, actor);

        EnqueueActivity(id, "Email",
            $"[{status}] Subject: {subject}\n\n{body}" + (error != null ? $"\n\n{error}" : ""),
            req.JobId);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Candidate", id.ToString(), "Email",
            $"{status}: {subject} → {c.Email}");

        return Ok(new { ok, status, error, to = c.Email, subject });
    }

    // ── EMAIL SETTINGS & TEMPLATES ───────────────────────────
    [HttpGet("email/status")]
    public async Task<ActionResult> EmailStatus()
    {
        var cfg = await _email.GetConfigAsync();
        return Ok(_email.PublicStatus(cfg));
    }

    public class EmailSettingsDto
    {
        public bool Enabled { get; set; } = true;
        public string Host { get; set; } = "";
        public int Port { get; set; } = 587;
        public string User { get; set; } = "";
        public string? Password { get; set; }
        public string FromEmail { get; set; } = "";
        public string FromName { get; set; } = "ATS Pro";
        public bool EnableSsl { get; set; } = true;
    }

    [HttpGet("email/settings")]
    public async Task<ActionResult> GetEmailSettings()
    {
        var cfg = await _email.GetConfigAsync();
        return Ok(new
        {
            enabled = cfg.Enabled,
            host = cfg.Host,
            port = cfg.Port,
            user = cfg.User,
            fromEmail = cfg.FromEmail,
            fromName = cfg.FromName,
            enableSsl = cfg.EnableSsl,
            hasPassword = !string.IsNullOrEmpty(cfg.Password),
            password = (string?)null,
            configured = cfg.IsReady,
            mode = cfg.IsReady ? "smtp" : "log_only"
        });
    }

    [HttpPut("email/settings")]
    public async Task<ActionResult> SaveEmailSettings([FromBody] EmailSettingsDto dto)
    {
        var existing = await _email.GetConfigAsync();
        var cfg = new EmailSmtpConfig
        {
            Enabled = dto.Enabled,
            Host = dto.Host ?? "",
            Port = dto.Port > 0 ? dto.Port : 587,
            User = dto.User ?? "",
            Password = dto.Password ?? existing.Password,
            FromEmail = dto.FromEmail ?? "",
            FromName = dto.FromName ?? "ATS Pro",
            EnableSsl = dto.EnableSsl
        };
        var updatePass = !string.IsNullOrEmpty(dto.Password);
        await _email.SaveConfigAsync(cfg, updatePass || string.IsNullOrEmpty(existing.Password));
        await _audit.LogAsync(User, "System", null, "EmailSettings", "Updated SMTP email settings");
        var saved = await _email.GetConfigAsync();
        return Ok(_email.PublicStatus(saved));
    }

    public class TestEmailRequest { public string? To { get; set; } }

    [HttpPost("email/test")]
    public async Task<ActionResult> TestEmail([FromBody] TestEmailRequest? req)
    {
        var cfg = await _email.GetConfigAsync();
        var to = req?.To;
        if (string.IsNullOrWhiteSpace(to))
            to = User.FindFirstValue(ClaimTypes.Email) ?? cfg.FromEmail;
        if (string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Provide a recipient email." });

        var (ok, status, error) = await _email.SendAsync(
            to,
            "ATS Pro User",
            "ATS Pro — test email",
            "This is a test message from ATS Pro. If you received it, SMTP is configured correctly.",
            null,
            User.FindFirstValue(ClaimTypes.Email));

        return Ok(new { ok, status, error, to, smtpConfigured = cfg.IsReady });
    }

    [HttpGet("email/templates")]
    public async Task<ActionResult> ListTemplates()
    {
        await _email.EnsureDefaultTemplatesAsync();
        var list = await _context.EmailTemplates.OrderBy(t => t.Name).ToListAsync();
        return Ok(list);
    }

    [HttpPost("email/templates")]
    public async Task<ActionResult> CreateTemplate([FromBody] EmailTemplate t)
    {
        if (string.IsNullOrWhiteSpace(t.Name) || string.IsNullOrWhiteSpace(t.Subject))
            return BadRequest(new { message = "Name and subject required." });
        t.Id = 0;
        t.IsSystem = false;
        t.UpdatedAt = DateTime.UtcNow;
        _context.EmailTemplates.Add(t);
        await _context.SaveChangesAsync();
        return Ok(t);
    }

    [HttpPut("email/templates/{id}")]
    public async Task<ActionResult> UpdateTemplate(int id, [FromBody] EmailTemplate updates)
    {
        var t = await _context.EmailTemplates.FindAsync(id);
        if (t == null) return NotFound();
        t.Name = updates.Name ?? t.Name;
        t.Subject = updates.Subject ?? t.Subject;
        t.Body = updates.Body ?? t.Body;
        t.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(t);
    }

    [HttpDelete("email/templates/{id}")]
    public async Task<ActionResult> DeleteTemplate(int id)
    {
        var t = await _context.EmailTemplates.FindAsync(id);
        if (t == null) return NotFound();
        if (t.IsSystem) return BadRequest(new { message = "System templates cannot be deleted." });
        _context.EmailTemplates.Remove(t);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("email/outbox")]
    public async Task<ActionResult> EmailOutbox([FromQuery] int take = 50)
    {
        take = Math.Clamp(take, 1, 200);
        var rows = await _context.EmailOutbox.AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .Take(take)
            .ToListAsync();
        return Ok(rows);
    }

    // -- QUICK PARSE (SOURCING) --
    public class QuickParseRequest { public string RawText { get; set; } = ""; }

    [HttpPost("candidates/quick-parse")]
    public async Task<ActionResult> QuickParse([FromBody] QuickParseRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RawText) || req.RawText.Trim().Length < 10)
            return BadRequest("Paste more resume text.");

        // In-app only — ATS Pro Intelligence (no external AI)
        var detailed = LocalResumeParser.ParseDetailed(req.RawText, "ATS Pro Intelligence");
        var c = detailed.Candidate;
        c.Ownership = CurrentUserDisplayName();

        if (!string.IsNullOrWhiteSpace(c.Email))
        {
            var dup = await _context.Candidates
                .FirstOrDefaultAsync(x => x.Email != null && x.Email.ToLower() == c.Email.ToLower());
            if (dup != null)
                return Conflict(new { message = "Candidate with this email already exists.", existingId = dup.Id, existingName = dup.Name });
        }

        _context.Candidates.Add(c);
        await _context.SaveChangesAsync();

        EnqueueActivity(c.Id, "System",
            $"ATS Pro Intelligence · confidence {detailed.Confidence}% · Quick Parse (in-app, no external AI)");
        await _context.SaveChangesAsync();

        return Ok(new { candidate = c, confidence = detailed.Confidence, engine = "ats-pro-intelligence" });
    }

    // -- ANALYTICS --
    [HttpGet("analytics")]
    public async Task<ActionResult> GetAnalytics()
    {
        var stageGroups = await _context.Applications
            .GroupBy(a => a.Stage)
            .Select(g => new { Stage = g.Key, Count = g.Count() })
            .ToListAsync();

        var recentCandidates = await _context.Candidates
            .OrderByDescending(c => c.CreatedAt)
            .Take(8)
            .Select(c => new { c.Id, c.Name, c.Role, c.Source, c.CreatedAt })
            .ToListAsync();

        var stages = new[] { "Applied", "Screened", "Interview", "Offer", "Hired" };
        var funnel = stages.Select(stage => new {
            Stage = stage,
            Count = stageGroups.FirstOrDefault(g => g.Stage == stage)?.Count ?? 0
        }).ToList();

        // Complex Metrics
        var placements = await _context.Placements.Include(p => p.Application).ToListAsync();
        
        var totalMargin = placements.Sum(p => p.BillRate - p.PayRate);
        
        var timeToHireDays = placements
            .Where(p => p.Application != null)
            .Select(p => (p.CreatedAt - p.Application!.AppliedAt).TotalDays)
            .ToList();
            
        var avgTimeToHire = timeToHireDays.Any() ? Math.Round(timeToHireDays.Average(), 1) : 0;

        var appliedCount = funnel.FirstOrDefault(f => f.Stage == "Applied")?.Count ?? 0;
        var hiredCount = funnel.FirstOrDefault(f => f.Stage == "Hired")?.Count ?? 0;
        var dropoffRate = appliedCount > 0 ? Math.Round((1.0 - ((double)hiredCount / appliedCount)) * 100, 1) : 0;

        // Real weekly trend from applications + submittals (last 7 days)
        var weekStart = DateTime.UtcNow.Date.AddDays(-6);
        var appsInWeek = await _context.Applications
            .Where(a => a.AppliedAt >= weekStart)
            .ToListAsync();
        var submittalsInWeek = await _context.Submittals
            .Where(s => s.CreatedAt >= weekStart)
            .ToListAsync();

        var weeklyTrend = Enumerable.Range(0, 7).Select(i =>
        {
            var day = weekStart.AddDays(i);
            var dayEnd = day.AddDays(1);
            return new
            {
                day = day.ToString("ddd"),
                date = day.ToString("yyyy-MM-dd"),
                Submissions = appsInWeek.Count(a => a.AppliedAt >= day && a.AppliedAt < dayEnd),
                ClientSends = submittalsInWeek.Count(s => s.CreatedAt >= day && s.CreatedAt < dayEnd)
            };
        }).ToList();

        // Source effectiveness
        var bySource = await _context.Candidates
            .GroupBy(c => string.IsNullOrEmpty(c.Source) ? "Unknown" : c.Source)
            .Select(g => new { source = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(8)
            .ToListAsync();

        // Recruiter KPI from ownership + applications/placements
        var candidates = await _context.Candidates.ToListAsync();
        var allApps = await _context.Applications
            .Include(a => a.Candidate)
            .Include(a => a.Job)
            .ToListAsync();
        var allSubs = await _context.Submittals.Include(s => s.Candidate).ToListAsync();
        var allPlacements = await _context.Placements
            .Include(p => p.Application!)
                .ThenInclude(a => a.Candidate)
            .Include(p => p.Application!)
                .ThenInclude(a => a.Job!)
                    .ThenInclude(j => j.Client)
            .ToListAsync();
        var interviews = await _context.Interviews.ToListAsync();

        var recruiterNames = candidates
            .Select(c => string.IsNullOrWhiteSpace(c.Ownership) ? "Unassigned" : c.Ownership)
            .Concat(await _context.Jobs.Select(j => j.PrimaryRecruiter).ToListAsync())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToList();

        var recruiterKpis = recruiterNames.Select(name =>
        {
            var ownedIds = candidates
                .Where(c => string.Equals(c.Ownership, name, StringComparison.OrdinalIgnoreCase))
                .Select(c => c.Id)
                .ToHashSet();

            var submissions = allApps.Count(a => ownedIds.Contains(a.CandidateId));
            var clientSends = allSubs.Count(s => ownedIds.Contains(s.CandidateId));
            var interviewCount = allApps.Count(a => ownedIds.Contains(a.CandidateId) &&
                (a.Stage == "Interview" || interviews.Any(i => i.ApplicationId == a.Id)));
            var placementCount = allPlacements.Count(p =>
                p.Application != null && ownedIds.Contains(p.Application.CandidateId));

            return new
            {
                name,
                role = name.Contains("AI", StringComparison.OrdinalIgnoreCase) ? "Copilot" : "Recruiter",
                submissions,
                clientSends,
                interviews = interviewCount,
                placements = placementCount
            };
        })
        .Where(r => r.submissions + r.clientSends + r.placements > 0)
        .OrderByDescending(r => r.placements)
        .ThenByDescending(r => r.clientSends)
        .ToList();

        // Recent real placements for dashboard confirmations
        var recentPlacements = allPlacements
            .OrderByDescending(p => p.CreatedAt)
            .Take(6)
            .Select(p => new
            {
                candidate = p.Application?.Candidate?.Name ?? "Unknown",
                client = p.Application?.Job?.Client?.Name ?? "Internal",
                role = p.Application?.Job?.Title ?? "Unknown",
                pay = p.PayRate,
                bill = p.BillRate,
                recruiter = p.Application?.Candidate?.Ownership ?? "Unassigned",
                date = p.StartDate.ToString("MMM d, yyyy"),
                status = "Hired"
            })
            .ToList();

        var openActions = await _context.Notifications.CountAsync(n => !n.IsRead);
        var now = DateTime.UtcNow;
        var staleCutoff = now.AddDays(-14);

        // Active jobs with pipeline depth — for "needs attention"
        var activeJobs = await _context.Jobs.Where(j => j.Status == "Active").ToListAsync();
        var appsByJob = allApps.GroupBy(a => a.JobId).ToDictionary(g => g.Key, g => g.ToList());
        var subsByJob = allSubs.GroupBy(s => s.JobId).ToDictionary(g => g.Key, g => g.Count());

        var jobHealth = activeJobs.Select(j =>
        {
            appsByJob.TryGetValue(j.Id, out var jobApps);
            jobApps ??= new List<Application>();
            var pipeline = jobApps.Count(a => a.Stage != "Hired" && a.Stage != "Rejected");
            var hired = jobApps.Count(a => a.Stage == "Hired");
            subsByJob.TryGetValue(j.Id, out var subCount);
            return new
            {
                id = j.Id,
                title = j.Title,
                jobCode = j.JobCode,
                location = j.Location,
                primaryRecruiter = j.PrimaryRecruiter,
                pipeline,
                hired,
                submittals = subCount,
                needsTalent = pipeline == 0,
                needsSubmittals = pipeline > 0 && subCount == 0
            };
        })
        .OrderBy(j => j.pipeline)
        .ThenBy(j => j.submittals)
        .ToList();

        // Action items for command center
        var actionRows = new List<(int rank, string type, string severity, string title, string detail, string href, string meta)>();

        foreach (var j in jobHealth.Where(x => x.needsTalent).Take(5))
        {
            actionRows.Add((0, "empty_pipeline", "high",
                $"{j.title} has no candidates",
                "Rank internal talent or source new profiles.",
                $"/jobs/{j.id}", j.jobCode ?? ""));
        }

        foreach (var j in jobHealth.Where(x => x.needsSubmittals && !x.needsTalent).Take(4))
        {
            actionRows.Add((1, "no_submittals", "medium",
                $"{j.title}: {j.pipeline} in pipeline, 0 client sends",
                "Ready to submit someone to the client?",
                $"/jobs/{j.id}", j.jobCode ?? ""));
        }

        var pendingSubs = await _context.Submittals
            .Include(s => s.Candidate)
            .Include(s => s.Job)
            .Where(s => s.Status == "Pending Review" || s.Status == "Pending" || s.Status == "")
            .OrderByDescending(s => s.CreatedAt)
            .Take(6)
            .ToListAsync();

        foreach (var s in pendingSubs)
        {
            actionRows.Add((1, "pending_submittal", "medium",
                $"Submittal pending: {s.Candidate?.Name ?? "Candidate"}",
                s.Job?.Title ?? "Unknown job",
                s.JobId > 0 ? $"/jobs/{s.JobId}" : "/placements",
                s.Status ?? "Pending"));
        }

        var upcomingInterviews = await _context.Interviews
            .Include(i => i.Application)!.ThenInclude(a => a!.Candidate)
            .Include(i => i.Application)!.ThenInclude(a => a!.Job)
            .Where(i => i.ScheduledAt >= now.AddDays(-1) && i.ScheduledAt <= now.AddDays(14))
            .OrderBy(i => i.ScheduledAt)
            .Take(8)
            .ToListAsync();

        foreach (var iv in upcomingInterviews)
        {
            var needsScore = iv.ScheduledAt < now && (iv.Score == null || iv.Score == 0);
            actionRows.Add((
                needsScore ? 0 : 2,
                needsScore ? "interview_feedback" : "interview",
                needsScore ? "high" : "low",
                needsScore
                    ? $"Feedback needed: {iv.Application?.Candidate?.Name ?? "Candidate"}"
                    : $"Interview: {iv.Application?.Candidate?.Name ?? "Candidate"}",
                $"{iv.Application?.Job?.Title ?? "Job"} · {iv.ScheduledAt:MMM d, h:mm tt} UTC",
                iv.Application != null ? $"/jobs/{iv.Application.JobId}" : "/jobs",
                iv.Type ?? "Interview"));
        }

        var staleApps = allApps
            .Where(a => a.Stage != "Hired" && a.Stage != "Rejected" && a.AppliedAt < staleCutoff)
            .OrderBy(a => a.AppliedAt)
            .Take(5)
            .ToList();

        foreach (var a in staleApps)
        {
            var days = (int)(now - a.AppliedAt).TotalDays;
            actionRows.Add((
                days > 30 ? 0 : 1,
                "stale_candidate",
                days > 30 ? "high" : "medium",
                $"{a.Candidate?.Name ?? "Candidate"} stuck in {a.Stage}",
                $"{days} days in pipeline · {a.Job?.Title ?? ("Job #" + a.JobId)}",
                $"/jobs/{a.JobId}",
                $"{days}d"));
        }

        var prioritizedActions = actionRows
            .OrderBy(a => a.rank)
            .ThenBy(a => a.title)
            .Take(12)
            .Select(a => new
            {
                a.type,
                a.severity,
                a.title,
                a.detail,
                a.href,
                a.meta
            })
            .ToList();

        var weekSubs = appsInWeek.Count;
        var weekSends = submittalsInWeek.Count;
        var pendingSubmittalCount = await _context.Submittals.CountAsync(s =>
            s.Status == "Pending Review" || s.Status == "Pending" || string.IsNullOrEmpty(s.Status));

        return Ok(new
        {
            funnel,
            recentCandidates,
            weeklyTrend,
            bySource,
            recruiterKpis,
            recentPlacements,
            openActions,
            actionItems = prioritizedActions,
            jobHealth = jobHealth.Take(8),
            upcomingInterviews = upcomingInterviews.Select(iv => new
            {
                id = iv.Id,
                scheduledAt = iv.ScheduledAt,
                type = iv.Type,
                score = iv.Score,
                candidate = iv.Application?.Candidate?.Name,
                jobTitle = iv.Application?.Job?.Title,
                jobId = iv.Application?.JobId,
                needsFeedback = iv.ScheduledAt < now && (iv.Score == null || iv.Score == 0)
            }),
            metrics = new
            {
                totalMargin,
                avgTimeToHire,
                dropoffRate,
                weekSubmissions = weekSubs,
                weekClientSends = weekSends,
                pendingSubmittals = pendingSubmittalCount,
                activeJobs = activeJobs.Count,
                emptyPipelines = jobHealth.Count(j => j.needsTalent)
            }
        });
    }

    // -- TALENT MATCHING (Ceipal-style internal ranking) --
    [HttpGet("jobs/{jobId}/talent-matches")]
    public async Task<ActionResult> GetTalentMatches(int jobId, [FromQuery] int limit = 25, [FromQuery] bool excludeApplied = true)
    {
        var job = await _context.Jobs.FindAsync(jobId);
        if (job == null) return NotFound("Job not found");

        var appliedIds = excludeApplied
            ? await _context.Applications.Where(a => a.JobId == jobId).Select(a => a.CandidateId).ToListAsync()
            : new List<int>();

        var candidates = await _context.Candidates
            .Where(c => c.Status != "Blacklisted" && c.Status != "Hired")
            .Where(c => !appliedIds.Contains(c.Id))
            .ToListAsync();

        var ranked = candidates
            .Select(c =>
            {
                var m = MatchEngine.Score(c, job);
                return new
                {
                    candidateId = c.Id,
                    name = c.Name,
                    role = c.Role,
                    email = c.Email,
                    phone = c.Phone,
                    experience = c.Experience,
                    city = c.City,
                    state = c.State,
                    workAuthorization = c.WorkAuthorization,
                    source = c.Source,
                    ownership = c.Ownership,
                    skills = MatchEngine.ParseSkills(c.SkillsJson),
                    score = m.Score,
                    matchedSkills = m.MatchedSkills,
                    missingSkills = m.MissingSkills,
                    extraSkills = m.ExtraSkills,
                    skillScore = m.SkillScore,
                    roleScore = m.RoleScore,
                    experienceScore = m.ExperienceScore,
                    locationScore = m.LocationScore,
                    summary = m.Summary,
                    method = m.Method
                };
            })
            .OrderByDescending(x => x.score)
            .ThenBy(x => x.name)
            .Take(Math.Clamp(limit, 1, 100))
            .ToList();

        return Ok(new
        {
            jobId = job.Id,
            jobTitle = job.Title,
            totalScanned = candidates.Count,
            matches = ranked
        });
    }

    // -- GLOBAL SEARCH --
    [HttpGet("search")]
    public async Task<ActionResult> GlobalSearch([FromQuery] string q, [FromQuery] int limit = 12)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(new { candidates = Array.Empty<object>(), jobs = Array.Empty<object>(), clients = Array.Empty<object>() });

        var term = q.Trim().ToLowerInvariant();
        limit = Math.Clamp(limit, 1, 30);

        var candidates = await _context.Candidates
            .Where(c =>
                (c.Name != null && c.Name.ToLower().Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)) ||
                (c.Role != null && c.Role.ToLower().Contains(term)) ||
                (c.SkillsJson != null && c.SkillsJson.ToLower().Contains(term)) ||
                (c.Phone != null && c.Phone.Contains(term)))
            .OrderByDescending(c => c.CreatedAt)
            .Take(limit)
            .Select(c => new { c.Id, c.Name, c.Role, c.Email, type = "candidate" })
            .ToListAsync();

        var jobs = await _context.Jobs
            .Where(j =>
                (j.Title != null && j.Title.ToLower().Contains(term)) ||
                (j.JobCode != null && j.JobCode.ToLower().Contains(term)) ||
                (j.Location != null && j.Location.ToLower().Contains(term)) ||
                (j.RequiredSkillsJson != null && j.RequiredSkillsJson.ToLower().Contains(term)))
            .OrderBy(j => j.Title)
            .Take(limit)
            .Select(j => new { j.Id, j.Title, j.JobCode, j.Status, j.Location, type = "job" })
            .ToListAsync();

        var clients = await _context.Clients
            .Where(c =>
                (c.Name != null && c.Name.ToLower().Contains(term)) ||
                (c.Industry != null && c.Industry.ToLower().Contains(term)) ||
                (c.ContactEmail != null && c.ContactEmail.ToLower().Contains(term)))
            .OrderBy(c => c.Name)
            .Take(limit)
            .Select(c => new { c.Id, c.Name, c.Industry, c.Status, type = "client" })
            .ToListAsync();

        return Ok(new { candidates, jobs, clients, query = q });
    }

    // -- CANDIDATE CRUD UPGRADES --
    [HttpPost("candidates")]
    public async Task<ActionResult<Candidate>> CreateCandidate([FromBody] Candidate candidate)
    {
        if (string.IsNullOrWhiteSpace(candidate.Name))
            return BadRequest("Name is required");

        // Duplicate email detection
        if (!string.IsNullOrWhiteSpace(candidate.Email) && candidate.Email != "Unknown")
        {
            var dup = await _context.Candidates
                .FirstOrDefaultAsync(c => c.Email != null && c.Email.ToLower() == candidate.Email.ToLower());
            if (dup != null)
                return Conflict(new { message = "A candidate with this email already exists.", existingId = dup.Id, existingName = dup.Name });
        }

        candidate.CreatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(candidate.SkillsJson)) candidate.SkillsJson = "[]";
        if (string.IsNullOrEmpty(candidate.Status)) candidate.Status = "Active";
        if (string.IsNullOrEmpty(candidate.Source)) candidate.Source = "Manual";
        if (string.IsNullOrWhiteSpace(candidate.Ownership)) candidate.Ownership = CurrentUserDisplayName();

        _context.Candidates.Add(candidate);
        await _context.SaveChangesAsync();
        EnqueueActivity(candidate.Id, "System",
            $"Candidate created · owner {candidate.Ownership} · source {candidate.Source}");
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Candidate", candidate.Id.ToString(), "Created",
            $"Created candidate {candidate.Name}");
        return CreatedAtAction(nameof(GetCandidate), new { id = candidate.Id }, candidate);
    }

    [HttpPut("candidates/{id}")]
    public async Task<IActionResult> UpdateCandidate(int id, [FromBody] Candidate updates)
    {
        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound();

        var prevOwner = candidate.Ownership;
        candidate.Name = updates.Name ?? candidate.Name;
        candidate.Role = updates.Role ?? candidate.Role;
        candidate.Experience = updates.Experience ?? candidate.Experience;
        candidate.Email = updates.Email ?? candidate.Email;
        candidate.Phone = updates.Phone ?? candidate.Phone;
        candidate.Education = updates.Education ?? candidate.Education;
        candidate.City = updates.City ?? candidate.City;
        candidate.State = updates.State ?? candidate.State;
        candidate.Source = updates.Source ?? candidate.Source;
        candidate.Status = updates.Status ?? candidate.Status;
        candidate.Ownership = updates.Ownership ?? candidate.Ownership;
        candidate.WorkAuthorization = updates.WorkAuthorization ?? candidate.WorkAuthorization;
        if (!string.IsNullOrEmpty(updates.SkillsJson)) candidate.SkillsJson = updates.SkillsJson;

        if (!string.Equals(prevOwner ?? "", candidate.Ownership ?? "", StringComparison.OrdinalIgnoreCase))
        {
            EnqueueActivity(id, "Ownership",
                $"Ownership: {(string.IsNullOrWhiteSpace(prevOwner) ? "Unassigned" : prevOwner)} → {(string.IsNullOrWhiteSpace(candidate.Ownership) ? "Unassigned" : candidate.Ownership)}");
        }

        _audit.Enqueue(User, "Candidate", id.ToString(), "Updated", $"Updated candidate {candidate.Name}");
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("candidates/check-duplicate")]
    public async Task<ActionResult> CheckDuplicate([FromQuery] string? email, [FromQuery] string? phone)
    {
        Candidate? byEmail = null;
        Candidate? byPhone = null;

        if (!string.IsNullOrWhiteSpace(email))
            byEmail = await _context.Candidates.FirstOrDefaultAsync(c => c.Email != null && c.Email.ToLower() == email.ToLower());

        if (!string.IsNullOrWhiteSpace(phone))
        {
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.Length >= 7)
            {
                var all = await _context.Candidates.Where(c => c.Phone != null && c.Phone != "").ToListAsync();
                byPhone = all.FirstOrDefault(c =>
                {
                    var cd = new string((c.Phone ?? "").Where(char.IsDigit).ToArray());
                    return cd.Length >= 7 && (cd.EndsWith(digits) || digits.EndsWith(cd));
                });
            }
        }

        var isDuplicate = byEmail != null || byPhone != null;
        return Ok(new
        {
            isDuplicate,
            byEmail = byEmail == null ? null : new { byEmail.Id, byEmail.Name, byEmail.Email },
            byPhone = byPhone == null ? null : new { byPhone.Id, byPhone.Name, byPhone.Phone }
        });
    }

    // Alias for frontend mass-assign path
    [HttpPost("candidates/mass-assign")]
    public Task<ActionResult> MassAssign([FromBody] BulkAssignRequest req) => BulkAssign(req);

    // -- SCORE PREVIEW (single candidate vs job) --
    [HttpGet("match-preview")]
    public async Task<ActionResult> MatchPreview([FromQuery] int candidateId, [FromQuery] int jobId)
    {
        var candidate = await _context.Candidates.FindAsync(candidateId);
        var job = await _context.Jobs.FindAsync(jobId);
        if (candidate == null || job == null) return NotFound();

        var m = MatchEngine.Score(candidate, job);
        return Ok(new
        {
            candidateId,
            jobId,
            score = m.Score,
            matchedSkills = m.MatchedSkills,
            missingSkills = m.MissingSkills,
            extraSkills = m.ExtraSkills,
            skillScore = m.SkillScore,
            roleScore = m.RoleScore,
            experienceScore = m.ExperienceScore,
            locationScore = m.LocationScore,
            summary = m.Summary,
            method = m.Method
        });
    }

    // ── AUDIT LOG ────────────────────────────────────────────
    [HttpGet("audit")]
    public async Task<ActionResult> GetAuditLog([FromQuery] int take = 100, [FromQuery] string? entityType = null)
    {
        var rows = await _audit.RecentAsync(take, entityType);
        return Ok(rows);
    }

    // ── CSV EXPORT ───────────────────────────────────────────
    [HttpGet("export/{entity}")]
    public async Task<IActionResult> ExportCsv(string entity)
    {
        entity = (entity ?? "").Trim().ToLowerInvariant();
        byte[] bytes;
        string fileName;

        switch (entity)
        {
            case "candidates":
            {
                var rows = await _context.Candidates.AsNoTracking().OrderByDescending(c => c.CreatedAt).ToListAsync();
                bytes = CsvExport.ToUtf8Bom(
                    new[] { "Id", "Name", "Role", "Email", "Phone", "City", "State", "Experience", "WorkAuthorization", "Source", "Status", "Ownership", "Skills", "CreatedAt" },
                    rows.Select(c => new object?[]
                    {
                        c.Id, c.Name, c.Role, c.Email, c.Phone, c.City, c.State, c.Experience,
                        c.WorkAuthorization, c.Source, c.Status, c.Ownership, c.SkillsJson, c.CreatedAt.ToString("o")
                    }));
                fileName = $"candidates-{DateTime.UtcNow:yyyyMMdd}.csv";
                break;
            }
            case "jobs":
            {
                var rows = await _context.Jobs.AsNoTracking().OrderBy(j => j.Title).ToListAsync();
                bytes = CsvExport.ToUtf8Bom(
                    new[] { "Id", "JobCode", "Title", "Department", "Status", "Location", "BillRate", "PayRate", "RateUnit", "ClientId", "PrimaryRecruiter", "RecruitmentManager" },
                    rows.Select(j => new object?[]
                    {
                        j.Id, j.JobCode, j.Title, j.Department, j.Status, j.Location,
                        j.BillRate, j.PayRate, j.RateUnit, j.ClientId, j.PrimaryRecruiter, j.RecruitmentManager
                    }));
                fileName = $"jobs-{DateTime.UtcNow:yyyyMMdd}.csv";
                break;
            }
            case "clients":
            {
                var rows = await _context.Clients.AsNoTracking().OrderBy(c => c.Name).ToListAsync();
                bytes = CsvExport.ToUtf8Bom(
                    new[] { "Id", "Name", "Industry", "ContactEmail", "Phone", "Location", "Status", "PrimaryOwner", "PaymentTerms", "Website" },
                    rows.Select(c => new object?[]
                    {
                        c.Id, c.Name, c.Industry, c.ContactEmail, c.Phone, c.Location,
                        c.Status, c.PrimaryOwner, c.PaymentTerms, c.Website
                    }));
                fileName = $"clients-{DateTime.UtcNow:yyyyMMdd}.csv";
                break;
            }
            case "placements":
            {
                var rows = await _context.Placements.AsNoTracking()
                    .Include(p => p.Application)!.ThenInclude(a => a!.Candidate)
                    .Include(p => p.Application)!.ThenInclude(a => a!.Job)
                    .OrderByDescending(p => p.CreatedAt)
                    .ToListAsync();
                bytes = CsvExport.ToUtf8Bom(
                    new[] { "Id", "Candidate", "Job", "BillRate", "PayRate", "RateUnit", "GrossMargin", "MarginPercent", "StartDate", "CreatedAt" },
                    rows.Select(p => new object?[]
                    {
                        p.Id,
                        p.Application?.Candidate?.Name,
                        p.Application?.Job?.Title,
                        p.BillRate, p.PayRate, p.RateUnit,
                        p.GrossMargin, p.MarginPercent,
                        p.StartDate.ToString("yyyy-MM-dd"),
                        p.CreatedAt.ToString("o")
                    }));
                fileName = $"placements-{DateTime.UtcNow:yyyyMMdd}.csv";
                break;
            }
            case "applications":
            case "pipeline":
            {
                var rows = await _context.Applications.AsNoTracking()
                    .Include(a => a.Candidate)
                    .Include(a => a.Job)
                    .OrderByDescending(a => a.AppliedAt)
                    .ToListAsync();
                bytes = CsvExport.ToUtf8Bom(
                    new[] { "Id", "Candidate", "Email", "Job", "JobCode", "Stage", "MatchScore", "AppliedAt" },
                    rows.Select(a => new object?[]
                    {
                        a.Id,
                        a.Candidate?.Name,
                        a.Candidate?.Email,
                        a.Job?.Title,
                        a.Job?.JobCode,
                        a.Stage,
                        a.MatchScore,
                        a.AppliedAt.ToString("o")
                    }));
                fileName = $"pipeline-{DateTime.UtcNow:yyyyMMdd}.csv";
                break;
            }
            default:
                return BadRequest(new { message = "Unknown export. Use candidates, jobs, clients, placements, or pipeline." });
        }

        await _audit.LogAsync(User, "System", entity, "Exported", $"Exported {entity} CSV ({bytes.Length} bytes)");
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    // ── HOTLISTS ─────────────────────────────────────────────
    [HttpGet("hotlists")]
    public async Task<ActionResult> ListHotlists()
    {
        var list = await _context.Hotlists.AsNoTracking()
            .OrderByDescending(h => h.UpdatedAt)
            .Select(h => new
            {
                h.Id,
                h.Name,
                h.Description,
                h.OwnerEmail,
                h.OwnerName,
                h.CreatedAt,
                h.UpdatedAt,
                memberCount = h.Members.Count
            })
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("hotlists/{id}")]
    public async Task<ActionResult> GetHotlist(int id)
    {
        var h = await _context.Hotlists.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (h == null) return NotFound();

        var members = await _context.HotlistMembers.AsNoTracking()
            .Where(m => m.HotlistId == id)
            .OrderByDescending(m => m.AddedAt)
            .Join(_context.Candidates.AsNoTracking(),
                m => m.CandidateId,
                c => c.Id,
                (m, c) => new
                {
                    m.Id,
                    m.CandidateId,
                    m.AddedAt,
                    m.Notes,
                    candidate = new
                    {
                        c.Id, c.Name, c.Role, c.Email, c.Phone, c.City, c.State,
                        c.Experience, c.WorkAuthorization, c.Source, c.Status, c.Ownership, c.SkillsJson
                    }
                })
            .ToListAsync();

        return Ok(new
        {
            h.Id, h.Name, h.Description, h.OwnerEmail, h.OwnerName, h.CreatedAt, h.UpdatedAt,
            memberCount = members.Count,
            members
        });
    }

    public class HotlistDto
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    [HttpPost("hotlists")]
    public async Task<ActionResult> CreateHotlist([FromBody] HotlistDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        var h = new Hotlist
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            OwnerEmail = email,
            OwnerName = CurrentUserDisplayName(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Hotlists.Add(h);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Hotlist", h.Id.ToString(), "Created", $"Created hotlist {h.Name}");
        return Ok(new { h.Id, h.Name, h.Description, h.OwnerEmail, h.OwnerName, h.CreatedAt, h.UpdatedAt, memberCount = 0 });
    }

    [HttpPut("hotlists/{id}")]
    public async Task<ActionResult> UpdateHotlist(int id, [FromBody] HotlistDto dto)
    {
        var h = await _context.Hotlists.FindAsync(id);
        if (h == null) return NotFound();
        if (!string.IsNullOrWhiteSpace(dto.Name)) h.Name = dto.Name.Trim();
        if (dto.Description != null) h.Description = dto.Description.Trim();
        h.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(h);
    }

    [HttpDelete("hotlists/{id}")]
    public async Task<ActionResult> DeleteHotlist(int id)
    {
        var h = await _context.Hotlists.FindAsync(id);
        if (h == null) return NotFound();
        var name = h.Name;
        _context.Hotlists.Remove(h);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Hotlist", id.ToString(), "Deleted", $"Deleted hotlist {name}");
        return NoContent();
    }

    public class HotlistMembersDto
    {
        public List<int> CandidateIds { get; set; } = new();
        public string? Notes { get; set; }
    }

    [HttpPost("hotlists/{id}/members")]
    public async Task<ActionResult> AddHotlistMembers(int id, [FromBody] HotlistMembersDto dto)
    {
        var h = await _context.Hotlists.FindAsync(id);
        if (h == null) return NotFound();
        if (dto.CandidateIds == null || dto.CandidateIds.Count == 0)
            return BadRequest(new { message = "Select at least one candidate." });

        int added = 0, skipped = 0;
        foreach (var cid in dto.CandidateIds.Distinct())
        {
            if (!await _context.Candidates.AnyAsync(c => c.Id == cid)) { skipped++; continue; }
            if (await _context.HotlistMembers.AnyAsync(m => m.HotlistId == id && m.CandidateId == cid))
            {
                skipped++;
                continue;
            }
            _context.HotlistMembers.Add(new HotlistMember
            {
                HotlistId = id,
                CandidateId = cid,
                AddedAt = DateTime.UtcNow,
                Notes = dto.Notes
            });
            added++;
        }
        h.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Hotlist", id.ToString(), "MembersAdded",
            $"Added {added} to hotlist {h.Name} (skipped {skipped})");
        return Ok(new { added, skipped, hotlistId = id });
    }

    [HttpDelete("hotlists/{id}/members/{candidateId}")]
    public async Task<ActionResult> RemoveHotlistMember(int id, int candidateId)
    {
        var m = await _context.HotlistMembers
            .FirstOrDefaultAsync(x => x.HotlistId == id && x.CandidateId == candidateId);
        if (m == null) return NotFound();
        _context.HotlistMembers.Remove(m);
        var h = await _context.Hotlists.FindAsync(id);
        if (h != null) h.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── SAVED SEARCHES ───────────────────────────────────────
    [HttpGet("saved-searches")]
    public async Task<ActionResult> ListSavedSearches()
    {
        var list = await _context.SavedSearches.AsNoTracking()
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();
        return Ok(list);
    }

    public class SavedSearchDto
    {
        public string Name { get; set; } = "";
        public string FiltersJson { get; set; } = "{}";
    }

    [HttpPost("saved-searches")]
    public async Task<ActionResult> CreateSavedSearch([FromBody] SavedSearchDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        var s = new SavedSearch
        {
            Name = dto.Name.Trim(),
            FiltersJson = string.IsNullOrWhiteSpace(dto.FiltersJson) ? "{}" : dto.FiltersJson,
            OwnerEmail = email,
            OwnerName = CurrentUserDisplayName(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.SavedSearches.Add(s);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "SavedSearch", s.Id.ToString(), "Created", $"Saved search {s.Name}");
        return Ok(s);
    }

    [HttpPut("saved-searches/{id}")]
    public async Task<ActionResult> UpdateSavedSearch(int id, [FromBody] SavedSearchDto dto)
    {
        var s = await _context.SavedSearches.FindAsync(id);
        if (s == null) return NotFound();
        if (!string.IsNullOrWhiteSpace(dto.Name)) s.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.FiltersJson)) s.FiltersJson = dto.FiltersJson;
        s.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(s);
    }

    [HttpDelete("saved-searches/{id}")]
    public async Task<ActionResult> DeleteSavedSearch(int id)
    {
        var s = await _context.SavedSearches.FindAsync(id);
        if (s == null) return NotFound();
        _context.SavedSearches.Remove(s);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "SavedSearch", id.ToString(), "Deleted", $"Deleted saved search {s.Name}");
        return NoContent();
    }

    // ── OWNERSHIP ────────────────────────────────────────────
    public class OwnerDto
    {
        /// <summary>Display name of owner (must match a team member label, e.g. "Admin").</summary>
        public string Owner { get; set; } = "";
    }

    public class JobOwnersDto
    {
        public string? PrimaryRecruiter { get; set; }
        public string? RecruitmentManager { get; set; }
    }

    [HttpPut("candidates/{id}/owner")]
    public async Task<ActionResult> SetCandidateOwner(int id, [FromBody] OwnerDto dto)
    {
        var c = await _context.Candidates.FindAsync(id);
        if (c == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Owner))
            return BadRequest(new { message = "Owner is required." });

        // Recruiters may only take ownership or reassign their own records unless Admin
        var me = CurrentUserDisplayName();
        if (!IsAdmin()
            && !string.IsNullOrWhiteSpace(c.Ownership)
            && !string.Equals(c.Ownership, me, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(dto.Owner, me, StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "You can only reassign candidates you own (or claim unassigned)." });
        }

        var previous = c.Ownership;
        c.Ownership = dto.Owner.Trim();
        _audit.Enqueue(User, "Candidate", id.ToString(), "OwnerChanged",
            $"Owner {previous ?? "—"} → {c.Ownership} ({c.Name})");
        EnqueueActivity(id, "Ownership",
            $"Ownership: {(string.IsNullOrWhiteSpace(previous) ? "Unassigned" : previous)} → {c.Ownership}");
        await _context.SaveChangesAsync();
        return Ok(new { c.Id, c.Name, ownership = c.Ownership });
    }

    [HttpPut("jobs/{id}/owner")]
    public async Task<ActionResult> SetJobOwner(int id, [FromBody] JobOwnersDto dto)
    {
        var job = await _context.Jobs.FindAsync(id);
        if (job == null) return NotFound();

        var me = CurrentUserDisplayName();
        if (!IsAdmin()
            && !string.IsNullOrWhiteSpace(job.PrimaryRecruiter)
            && !string.Equals(job.PrimaryRecruiter, me, StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "You can only reassign jobs you own." });
        }

        if (!string.IsNullOrWhiteSpace(dto.PrimaryRecruiter))
            job.PrimaryRecruiter = dto.PrimaryRecruiter.Trim();
        if (!string.IsNullOrWhiteSpace(dto.RecruitmentManager))
            job.RecruitmentManager = dto.RecruitmentManager.Trim();

        _audit.Enqueue(User, "Job", id.ToString(), "OwnerChanged",
            $"Job {job.Title} recruiter → {job.PrimaryRecruiter}");
        await _context.SaveChangesAsync();
        return Ok(new { job.Id, job.Title, job.PrimaryRecruiter, job.RecruitmentManager });
    }

    [HttpPut("clients/{id}/owner")]
    public async Task<ActionResult> SetClientOwner(int id, [FromBody] OwnerDto dto)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Owner))
            return BadRequest(new { message = "Owner is required." });

        if (!IsAdmin()
            && !string.IsNullOrWhiteSpace(client.PrimaryOwner)
            && !string.Equals(client.PrimaryOwner, CurrentUserDisplayName(), StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "You can only reassign clients you own." });
        }

        var previous = client.PrimaryOwner;
        client.PrimaryOwner = dto.Owner.Trim();
        _audit.Enqueue(User, "Client", id.ToString(), "OwnerChanged",
            $"Owner {previous ?? "—"} → {client.PrimaryOwner} ({client.Name})");
        await _context.SaveChangesAsync();
        return Ok(new { client.Id, client.Name, primaryOwner = client.PrimaryOwner });
    }

    /// <summary>Desk snapshot: counts for mine vs all (ownership-aware).</summary>
    [HttpGet("desk")]
    public async Task<ActionResult> GetDeskStats()
    {
        var me = CurrentUserDisplayName();
        var candidates = await _context.Candidates.AsNoTracking().ToListAsync();
        var jobs = await _context.Jobs.AsNoTracking().ToListAsync();
        var clients = await _context.Clients.AsNoTracking().ToListAsync();

        bool MineCand(Candidate c) =>
            string.IsNullOrWhiteSpace(c.Ownership)
            || string.Equals(c.Ownership, me, StringComparison.OrdinalIgnoreCase);
        bool MineJob(Job j) =>
            string.IsNullOrWhiteSpace(j.PrimaryRecruiter)
            || string.Equals(j.PrimaryRecruiter, me, StringComparison.OrdinalIgnoreCase);
        bool MineClient(Client c) =>
            string.IsNullOrWhiteSpace(c.PrimaryOwner)
            || string.Equals(c.PrimaryOwner, me, StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            me,
            isAdmin = IsAdmin(),
            candidates = new { all = candidates.Count, mine = candidates.Count(MineCand) },
            jobs = new { all = jobs.Count, mine = jobs.Count(MineJob), activeMine = jobs.Count(j => j.Status == "Active" && MineJob(j)) },
            clients = new { all = clients.Count, mine = clients.Count(MineClient) }
        });
    }

    // ── DOCUMENT VAULT ───────────────────────────────────────
    private static readonly HashSet<string> AllowedDocExt = new(StringComparer.OrdinalIgnoreCase)
        { ".pdf", ".docx", ".doc", ".txt", ".png", ".jpg", ".jpeg" };

    [HttpGet("candidates/{id}/documents")]
    public async Task<ActionResult> ListDocuments(int id)
    {
        var c = await _context.Candidates.FindAsync(id);
        if (c == null) return NotFound();

        // Backfill primary resume into vault if missing
        await EnsureResumeDocAsync(c);

        var docs = await _context.CandidateDocuments.AsNoTracking()
            .Where(d => d.CandidateId == id)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                d.Id, d.CandidateId, d.FileName, d.StoredName, d.ContentType, d.SizeBytes,
                d.DocType, d.Notes, d.UploadedBy, d.UploadedAt,
                downloadUrl = $"/api/ats/documents/{d.Id}/file"
            })
            .ToListAsync();
        return Ok(docs);
    }

    [HttpPost("candidates/{id}/documents")]
    [RequestSizeLimit(15_000_000)]
    public async Task<ActionResult> UploadDocument(int id, IFormFile file, [FromForm] string? docType, [FromForm] string? notes)
    {
        var c = await _context.Candidates.FindAsync(id);
        if (c == null) return NotFound();
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedDocExt.Contains(ext))
            return BadRequest(new { message = "Allowed: pdf, docx, doc, txt, png, jpg." });

        var type = string.IsNullOrWhiteSpace(docType) ? "Other" : docType.Trim();
        if (type is not ("Resume" or "Offer" or "NDA" or "Other"))
            type = "Other";

        var (stored, size) = await DocumentStorage.SaveAsync(_env, file);
        var doc = new CandidateDocument
        {
            CandidateId = id,
            FileName = Path.GetFileName(file.FileName),
            StoredName = stored,
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            SizeBytes = size,
            DocType = type,
            Notes = notes,
            UploadedBy = CurrentUserDisplayName(),
            UploadedAt = DateTime.UtcNow
        };
        _context.CandidateDocuments.Add(doc);

        if (type == "Resume" || string.IsNullOrWhiteSpace(c.ResumeFilePath))
            c.ResumeFilePath = "/resumes/" + stored;

        EnqueueActivity(id, "System", $"Document uploaded: {doc.FileName} ({type})");
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Candidate", id.ToString(), "DocumentUpload", $"Uploaded {doc.FileName}");

        return Ok(new
        {
            doc.Id, doc.CandidateId, doc.FileName, doc.StoredName, doc.ContentType, doc.SizeBytes,
            doc.DocType, doc.Notes, doc.UploadedBy, doc.UploadedAt,
            downloadUrl = $"/api/ats/documents/{doc.Id}/file"
        });
    }

    [HttpDelete("candidates/{candidateId}/documents/{docId}")]
    public async Task<ActionResult> DeleteDocument(int candidateId, int docId)
    {
        var doc = await _context.CandidateDocuments
            .FirstOrDefaultAsync(d => d.Id == docId && d.CandidateId == candidateId);
        if (doc == null) return NotFound();

        var name = doc.FileName;
        var stored = doc.StoredName;
        _context.CandidateDocuments.Remove(doc);
        EnqueueActivity(candidateId, "System", $"Document removed: {name}");
        await _context.SaveChangesAsync();
        DocumentStorage.TryDelete(_env, stored);
        return NoContent();
    }

    [HttpGet("documents/{id}/file")]
    public async Task<IActionResult> DownloadDocument(int id)
    {
        var doc = await _context.CandidateDocuments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
        if (doc == null) return NotFound();

        var path = DocumentStorage.PathFor(_env, doc.StoredName);
        if (!System.IO.File.Exists(path))
        {
            // Fallback: legacy wwwroot path from older deploys
            var legacy = Path.Combine(_env.ContentRootPath, "wwwroot", "resumes", doc.StoredName);
            if (System.IO.File.Exists(legacy)) path = legacy;
            else return NotFound(new { message = "File missing on disk." });
        }

        return PhysicalFile(path, doc.ContentType, doc.FileName);
    }

    private async Task EnsureResumeDocAsync(Candidate c)
    {
        var stored = DocumentStorage.StoredNameFromPublicPath(c.ResumeFilePath);
        if (string.IsNullOrEmpty(stored)) return;

        var exists = await _context.CandidateDocuments
            .AnyAsync(d => d.CandidateId == c.Id && d.StoredName == stored);
        if (exists) return;

        // Only register if file exists somewhere
        var path = DocumentStorage.PathFor(_env, stored);
        var legacy = Path.Combine(_env.ContentRootPath, "wwwroot", "resumes", stored);
        long size = 0;
        if (System.IO.File.Exists(path)) size = new FileInfo(path).Length;
        else if (System.IO.File.Exists(legacy)) size = new FileInfo(legacy).Length;
        else return;

        _context.CandidateDocuments.Add(new CandidateDocument
        {
            CandidateId = c.Id,
            FileName = stored,
            StoredName = stored,
            ContentType = stored.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? "application/pdf" : "application/octet-stream",
            SizeBytes = size,
            DocType = "Resume",
            UploadedBy = "System",
            UploadedAt = c.CreatedAt
        });
        await _context.SaveChangesAsync();
    }

    // ── DUPLICATE MERGE ──────────────────────────────────────
    public class MergeCandidatesDto
    {
        /// <summary>Record to keep.</summary>
        public int TargetId { get; set; }
        /// <summary>Record to absorb and delete.</summary>
        public int SourceId { get; set; }
    }

    [HttpGet("candidates/{id}/duplicates")]
    public async Task<ActionResult> FindDuplicates(int id)
    {
        var c = await _context.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (c == null) return NotFound();

        var seen = new HashSet<int>();
        var matches = new List<object>();

        void AddMatch(Candidate x, string match)
        {
            if (!seen.Add(x.Id)) return;
            matches.Add(new { x.Id, x.Name, x.Email, x.Phone, x.Role, x.Ownership, match });
        }

        if (!string.IsNullOrWhiteSpace(c.Email) && c.Email != "Unknown")
        {
            var emailHits = await _context.Candidates.AsNoTracking()
                .Where(x => x.Id != id && x.Email != null && x.Email.ToLower() == c.Email.ToLower())
                .ToListAsync();
            foreach (var x in emailHits) AddMatch(x, "email");
        }

        if (!string.IsNullOrWhiteSpace(c.Phone))
        {
            var digits = new string(c.Phone.Where(char.IsDigit).ToArray());
            if (digits.Length >= 7)
            {
                var all = await _context.Candidates.AsNoTracking()
                    .Where(x => x.Id != id && x.Phone != null && x.Phone != "")
                    .ToListAsync();
                foreach (var x in all)
                {
                    var cd = new string((x.Phone ?? "").Where(char.IsDigit).ToArray());
                    if (cd.Length >= 7 && (cd.EndsWith(digits) || digits.EndsWith(cd)))
                        AddMatch(x, "phone");
                }
            }
        }

        return Ok(new { candidateId = id, matches });
    }

    [HttpPost("candidates/merge")]
    public async Task<ActionResult> MergeCandidates([FromBody] MergeCandidatesDto dto)
    {
        if (dto.TargetId == dto.SourceId)
            return BadRequest(new { message = "Target and source must be different." });

        var target = await _context.Candidates.FindAsync(dto.TargetId);
        var source = await _context.Candidates.FindAsync(dto.SourceId);
        if (target == null || source == null)
            return NotFound(new { message = "Target or source candidate not found." });

        // Field fill: keep target values when present; take source when target empty
        void Fill(Func<Candidate, string?> get, Action<Candidate, string> set)
        {
            var t = get(target);
            var s = get(source);
            if ((string.IsNullOrWhiteSpace(t) || t is "Unknown" or "Not specified")
                && !string.IsNullOrWhiteSpace(s) && s is not ("Unknown" or "Not specified"))
                set(target, s!);
        }

        Fill(c => c.Email, (c, v) => c.Email = v);
        Fill(c => c.Phone, (c, v) => c.Phone = v);
        Fill(c => c.Role, (c, v) => c.Role = v);
        Fill(c => c.Experience, (c, v) => c.Experience = v);
        Fill(c => c.Education, (c, v) => c.Education = v);
        Fill(c => c.City, (c, v) => c.City = v);
        Fill(c => c.State, (c, v) => c.State = v);
        Fill(c => c.WorkAuthorization, (c, v) => c.WorkAuthorization = v);
        Fill(c => c.Source, (c, v) => c.Source = v);
        if (string.IsNullOrWhiteSpace(target.Ownership) && !string.IsNullOrWhiteSpace(source.Ownership))
            target.Ownership = source.Ownership;
        if (string.IsNullOrWhiteSpace(target.ResumeFilePath) && !string.IsNullOrWhiteSpace(source.ResumeFilePath))
            target.ResumeFilePath = source.ResumeFilePath;

        // Union skills
        var skills = MatchEngine.ParseSkills(target.SkillsJson);
        foreach (var s in MatchEngine.ParseSkills(source.SkillsJson))
        {
            if (!skills.Any(e => string.Equals(e, s, StringComparison.OrdinalIgnoreCase)))
                skills.Add(s);
        }
        target.SkillsJson = System.Text.Json.JsonSerializer.Serialize(skills);

        // Move applications (skip job conflicts)
        var sourceApps = await _context.Applications.Where(a => a.CandidateId == source.Id).ToListAsync();
        int appsMoved = 0, appsSkipped = 0;
        foreach (var app in sourceApps)
        {
            if (await _context.Applications.AnyAsync(a => a.CandidateId == target.Id && a.JobId == app.JobId))
            {
                // Prefer keeping target app; drop source app (cascade interviews/placements risk)
                var sourceInterviews = _context.Interviews.Where(i => i.ApplicationId == app.Id);
                _context.Interviews.RemoveRange(sourceInterviews);
                var sourcePlacements = _context.Placements.Where(p => p.ApplicationId == app.Id);
                _context.Placements.RemoveRange(sourcePlacements);
                _context.Applications.Remove(app);
                appsSkipped++;
            }
            else
            {
                app.CandidateId = target.Id;
                appsMoved++;
            }
        }

        // Move activities
        var acts = await _context.Activities.Where(a => a.CandidateId == source.Id).ToListAsync();
        foreach (var a in acts) a.CandidateId = target.Id;

        // Move documents
        var docs = await _context.CandidateDocuments.Where(d => d.CandidateId == source.Id).ToListAsync();
        foreach (var d in docs) d.CandidateId = target.Id;

        // Move hotlist memberships (skip dupes)
        var members = await _context.HotlistMembers.Where(m => m.CandidateId == source.Id).ToListAsync();
        int hotlistMoved = 0;
        foreach (var m in members)
        {
            if (await _context.HotlistMembers.AnyAsync(x => x.HotlistId == m.HotlistId && x.CandidateId == target.Id))
                _context.HotlistMembers.Remove(m);
            else
            {
                m.CandidateId = target.Id;
                hotlistMoved++;
            }
        }

        // Submittals
        var subs = await _context.Submittals.Where(s => s.CandidateId == source.Id).ToListAsync();
        foreach (var s in subs) s.CandidateId = target.Id;

        var sourceName = source.Name;
        var sourceId = source.Id;
        _context.Candidates.Remove(source);

        EnqueueActivity(target.Id, "System",
            $"Merged duplicate “{sourceName}” (#{sourceId}) into this profile · apps moved {appsMoved}, skipped {appsSkipped}, docs {docs.Count}, activities {acts.Count}");

        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Candidate", target.Id.ToString(), "Merged",
            $"Merged #{sourceId} {sourceName} → #{target.Id} {target.Name}");

        return Ok(new
        {
            targetId = target.Id,
            sourceId,
            sourceName,
            appsMoved,
            appsSkipped,
            documentsMoved = docs.Count,
            activitiesMoved = acts.Count,
            hotlistMoved,
            candidate = target
        });
    }

    // ── TIMESHEETS ───────────────────────────────────────────
    public class TimesheetDto
    {
        public int PlacementId { get; set; }
        public DateTime WeekStart { get; set; }
        public decimal Hours { get; set; }
        public string? Notes { get; set; }
        public bool Submit { get; set; }
    }

    private static DateTime NormalizeWeekStart(DateTime d)
    {
        var day = d.Date;
        // Monday-based week
        var diff = ((int)day.DayOfWeek + 6) % 7;
        return day.AddDays(-diff);
    }

    [HttpGet("timesheets")]
    public async Task<ActionResult> ListTimesheets([FromQuery] string? status, [FromQuery] int? placementId)
    {
        var q = _context.Timesheets.AsNoTracking()
            .Include(t => t.Placement)!.ThenInclude(p => p!.Application)!.ThenInclude(a => a!.Candidate)
            .Include(t => t.Placement)!.ThenInclude(p => p!.Application)!.ThenInclude(a => a!.Job)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(t => t.Status == status);
        if (placementId is int pid)
            q = q.Where(t => t.PlacementId == pid);

        var rows = await q.OrderByDescending(t => t.WeekStart).ThenByDescending(t => t.Id).Take(200).ToListAsync();

        // Resolve client names
        var jobIds = rows.Select(t => t.Placement?.Application?.JobId ?? 0).Where(x => x > 0).Distinct().ToList();
        var jobs = await _context.Jobs.AsNoTracking().Where(j => jobIds.Contains(j.Id)).ToListAsync();
        var clientIds = jobs.Select(j => j.ClientId).Distinct().ToList();
        var clients = await _context.Clients.AsNoTracking().Where(c => clientIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Name);

        var result = rows.Select(t =>
        {
            var job = t.Placement?.Application?.Job;
            var cand = t.Placement?.Application?.Candidate;
            var billH = t.Placement == null ? 0 : RateMath.ToHourly(t.Placement.BillRate, t.Placement.RateUnit);
            var payH = t.Placement == null ? 0 : RateMath.ToHourly(t.Placement.PayRate, t.Placement.RateUnit);
            var clientName = job != null && clients.TryGetValue(job.ClientId, out var cn) ? cn : null;
            return new
            {
                t.Id,
                t.PlacementId,
                t.WeekStart,
                weekEnd = t.WeekStart.AddDays(6),
                t.Hours,
                t.Status,
                t.Notes,
                t.SubmittedBy,
                t.SubmittedAt,
                t.ApprovedBy,
                t.ApprovedAt,
                t.CreatedAt,
                candidateName = cand?.Name,
                jobTitle = job?.Title,
                jobCode = job?.JobCode,
                clientName,
                billRateHourly = Math.Round(billH, 2),
                payRateHourly = Math.Round(payH, 2),
                billAmount = Math.Round(billH * t.Hours, 2),
                payAmount = Math.Round(payH * t.Hours, 2),
                margin = Math.Round((billH - payH) * t.Hours, 2)
            };
        });

        return Ok(result);
    }

    [HttpPost("timesheets")]
    public async Task<ActionResult> CreateTimesheet([FromBody] TimesheetDto dto)
    {
        var placement = await _context.Placements.FindAsync(dto.PlacementId);
        if (placement == null) return NotFound(new { message = "Placement not found." });
        if (dto.Hours <= 0 || dto.Hours > 168)
            return BadRequest(new { message = "Hours must be between 0 and 168." });

        var week = NormalizeWeekStart(dto.WeekStart);
        var exists = await _context.Timesheets
            .AnyAsync(t => t.PlacementId == dto.PlacementId && t.WeekStart == week && t.Status != "Rejected");
        if (exists)
            return Conflict(new { message = "A timesheet already exists for this placement and week." });

        var me = CurrentUserDisplayName();
        var ts = new Timesheet
        {
            PlacementId = dto.PlacementId,
            WeekStart = week,
            Hours = Math.Round(dto.Hours, 2),
            Notes = dto.Notes,
            Status = dto.Submit ? "Submitted" : "Draft",
            CreatedAt = DateTime.UtcNow,
            SubmittedBy = dto.Submit ? me : null,
            SubmittedAt = dto.Submit ? DateTime.UtcNow : null
        };
        _context.Timesheets.Add(ts);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Timesheet", ts.Id.ToString(), "Created",
            $"Timesheet week {week:yyyy-MM-dd} · {ts.Hours}h · {ts.Status}");
        return Ok(ts);
    }

    [HttpPut("timesheets/{id}")]
    public async Task<ActionResult> UpdateTimesheet(int id, [FromBody] TimesheetDto dto)
    {
        var ts = await _context.Timesheets.FindAsync(id);
        if (ts == null) return NotFound();
        if (ts.Status is "Invoiced" or "Approved")
            return BadRequest(new { message = "Cannot edit approved/invoiced timesheets." });

        if (dto.Hours > 0) ts.Hours = Math.Round(dto.Hours, 2);
        if (dto.Notes != null) ts.Notes = dto.Notes;
        if (dto.WeekStart != default)
            ts.WeekStart = NormalizeWeekStart(dto.WeekStart);

        if (dto.Submit && ts.Status is "Draft" or "Rejected")
        {
            ts.Status = "Submitted";
            ts.SubmittedBy = CurrentUserDisplayName();
            ts.SubmittedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(ts);
    }

    [HttpPost("timesheets/{id}/submit")]
    public async Task<ActionResult> SubmitTimesheet(int id)
    {
        var ts = await _context.Timesheets.FindAsync(id);
        if (ts == null) return NotFound();
        if (ts.Status is not ("Draft" or "Rejected"))
            return BadRequest(new { message = "Only draft/rejected timesheets can be submitted." });
        ts.Status = "Submitted";
        ts.SubmittedBy = CurrentUserDisplayName();
        ts.SubmittedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Timesheet", id.ToString(), "Submitted", $"Submitted {ts.Hours}h");
        return Ok(ts);
    }

    [HttpPost("timesheets/{id}/approve")]
    public async Task<ActionResult> ApproveTimesheet(int id)
    {
        var ts = await _context.Timesheets.FindAsync(id);
        if (ts == null) return NotFound();
        if (ts.Status != "Submitted")
            return BadRequest(new { message = "Only submitted timesheets can be approved." });
        ts.Status = "Approved";
        ts.ApprovedBy = CurrentUserDisplayName();
        ts.ApprovedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Timesheet", id.ToString(), "Approved", $"Approved {ts.Hours}h");
        return Ok(ts);
    }

    [HttpPost("timesheets/{id}/reject")]
    public async Task<ActionResult> RejectTimesheet(int id, [FromBody] OwnerDto? dto)
    {
        var ts = await _context.Timesheets.FindAsync(id);
        if (ts == null) return NotFound();
        if (ts.Status != "Submitted")
            return BadRequest(new { message = "Only submitted timesheets can be rejected." });
        ts.Status = "Rejected";
        if (!string.IsNullOrWhiteSpace(dto?.Owner))
            ts.Notes = (ts.Notes ?? "") + "\nRejected: " + dto.Owner;
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Timesheet", id.ToString(), "Rejected", "Timesheet rejected");
        return Ok(ts);
    }

    // ── INVOICES ─────────────────────────────────────────────
    public class CreateInvoiceDto
    {
        public List<int> TimesheetIds { get; set; } = new();
        public string? Notes { get; set; }
    }

    [HttpGet("invoices")]
    public async Task<ActionResult> ListInvoices()
    {
        var rows = await _context.Invoices.AsNoTracking()
            .Include(i => i.Client)
            .OrderByDescending(i => i.CreatedAt)
            .Take(100)
            .ToListAsync();
        return Ok(rows.Select(i => new
        {
            i.Id,
            i.InvoiceNumber,
            i.ClientId,
            clientName = i.Client?.Name,
            i.PlacementId,
            i.PeriodStart,
            i.PeriodEnd,
            i.BillHours,
            i.BillRateHourly,
            i.Amount,
            i.Status,
            i.Notes,
            i.TimesheetIdsJson,
            i.CreatedBy,
            i.CreatedAt
        }));
    }

    [HttpPost("invoices/from-timesheets")]
    public async Task<ActionResult> CreateInvoiceFromTimesheets([FromBody] CreateInvoiceDto dto)
    {
        if (dto.TimesheetIds == null || dto.TimesheetIds.Count == 0)
            return BadRequest(new { message = "Select at least one approved timesheet." });

        var sheets = await _context.Timesheets
            .Include(t => t.Placement)!.ThenInclude(p => p!.Application)!.ThenInclude(a => a!.Job)
            .Where(t => dto.TimesheetIds.Contains(t.Id))
            .ToListAsync();

        if (sheets.Count == 0) return BadRequest(new { message = "No timesheets found." });
        if (sheets.Any(t => t.Status != "Approved"))
            return BadRequest(new { message = "All timesheets must be Approved before invoicing." });

        // Single client invoice: all placements must map to same client
        var jobIds = sheets.Select(t => t.Placement?.Application?.JobId ?? 0).Distinct().ToList();
        var jobs = await _context.Jobs.Where(j => jobIds.Contains(j.Id)).ToListAsync();
        var clientIds = jobs.Select(j => j.ClientId).Distinct().ToList();
        if (clientIds.Count != 1)
            return BadRequest(new { message = "All timesheets must belong to the same client." });

        var clientId = clientIds[0];
        decimal totalHours = 0;
        decimal totalAmount = 0;
        decimal weightedRate = 0;
        foreach (var t in sheets)
        {
            var billH = RateMath.ToHourly(t.Placement!.BillRate, t.Placement.RateUnit);
            totalHours += t.Hours;
            totalAmount += billH * t.Hours;
            weightedRate += billH * t.Hours;
        }
        var avgRate = totalHours > 0 ? Math.Round(weightedRate / totalHours, 2) : 0;
        totalAmount = Math.Round(totalAmount, 2);

        var count = await _context.Invoices.CountAsync() + 1;
        var inv = new Invoice
        {
            InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{count:D4}",
            ClientId = clientId,
            PlacementId = sheets.Select(s => s.PlacementId).Distinct().Count() == 1 ? sheets[0].PlacementId : null,
            PeriodStart = sheets.Min(s => s.WeekStart),
            PeriodEnd = sheets.Max(s => s.WeekStart.AddDays(6)),
            BillHours = Math.Round(totalHours, 2),
            BillRateHourly = avgRate,
            Amount = totalAmount,
            Status = "Draft",
            Notes = dto.Notes,
            TimesheetIdsJson = System.Text.Json.JsonSerializer.Serialize(sheets.Select(s => s.Id).ToList()),
            CreatedBy = CurrentUserDisplayName(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Invoices.Add(inv);

        foreach (var t in sheets)
            t.Status = "Invoiced";

        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Invoice", inv.Id.ToString(), "Created",
            $"{inv.InvoiceNumber} · {inv.Amount:C} · {inv.BillHours}h");

        return Ok(new
        {
            inv.Id,
            inv.InvoiceNumber,
            inv.ClientId,
            inv.Amount,
            inv.BillHours,
            inv.BillRateHourly,
            inv.Status,
            inv.PeriodStart,
            inv.PeriodEnd,
            timesheetIds = sheets.Select(s => s.Id)
        });
    }

    [HttpPut("invoices/{id}/status")]
    public async Task<ActionResult> SetInvoiceStatus(int id, [FromBody] OwnerDto dto)
    {
        var inv = await _context.Invoices.FindAsync(id);
        if (inv == null) return NotFound();
        var status = (dto.Owner ?? "").Trim();
        if (status is not ("Draft" or "Sent" or "Paid"))
            return BadRequest(new { message = "Status must be Draft, Sent, or Paid." });
        inv.Status = status;
        await _context.SaveChangesAsync();
        await _audit.LogAsync(User, "Invoice", id.ToString(), "Status", $"Invoice → {status}");
        return Ok(inv);
    }

    [HttpGet("invoices/{id}/export")]
    public async Task<IActionResult> ExportInvoiceCsv(int id)
    {
        var inv = await _context.Invoices.AsNoTracking()
            .Include(i => i.Client)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (inv == null) return NotFound();

        var bytes = CsvExport.ToUtf8Bom(
            new[] { "InvoiceNumber", "Client", "PeriodStart", "PeriodEnd", "Hours", "BillRateHourly", "Amount", "Status", "CreatedAt" },
            new[]
            {
                new object?[]
                {
                    inv.InvoiceNumber,
                    inv.Client?.Name,
                    inv.PeriodStart.ToString("yyyy-MM-dd"),
                    inv.PeriodEnd.ToString("yyyy-MM-dd"),
                    inv.BillHours,
                    inv.BillRateHourly,
                    inv.Amount,
                    inv.Status,
                    inv.CreatedAt.ToString("o")
                }
            });
        await _audit.LogAsync(User, "Invoice", id.ToString(), "Exported", $"Exported {inv.InvoiceNumber}");
        return File(bytes, "text/csv; charset=utf-8", $"{inv.InvoiceNumber}.csv");
    }
}


