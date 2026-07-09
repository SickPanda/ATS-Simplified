using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AtsApi.Models;
using System.Text;
using System.Text.Json;

namespace AtsApi.Controllers;

[ApiController]
[Route("api/ats")]
public class AtsController : ControllerBase
{
    private readonly AtsDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient = new();

    public AtsController(AtsDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // -- DASHBOARD --
    [HttpGet("dashboard")]
    public async Task<ActionResult> GetDashboardStats()
    {
        var totalJobs = await _context.Jobs.CountAsync(j => j.Status == "Active");
        var totalCandidates = await _context.Candidates.CountAsync();
        var hiredCandidates = await _context.Applications.CountAsync(a => a.Stage == "Hired");
        var activeApplications = await _context.Applications.CountAsync(a => a.Stage != "Hired" && a.Stage != "Rejected");

        return Ok(new
        {
            TotalJobs = totalJobs,
            TotalCandidates = totalCandidates,
            HiredCandidates = hiredCandidates,
            ActiveApplications = activeApplications
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
        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();
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

        // Compute AI match score
        var candidate = await _context.Candidates.FindAsync(app.CandidateId);
        var job = await _context.Jobs.FindAsync(app.JobId);
        if (candidate != null && job != null)
        {
            app.MatchScore = await ComputeMatchScoreAsync(candidate, job);
        }

        app.AppliedAt = DateTime.UtcNow;
        _context.Applications.Add(app);
        await _context.SaveChangesAsync();
        
        // Fetch with candidate details to return
        var fullApp = await _context.Applications
            .Include(a => a.Candidate)
            .FirstOrDefaultAsync(a => a.Id == app.Id);
            
        return Ok(fullApp);
    }

    [HttpGet("applications")]
    public async Task<ActionResult<IEnumerable<Application>>> GetAllApplications()
    {
        return await _context.Applications.ToListAsync();
    }

    private async Task<int> ComputeMatchScoreAsync(Candidate candidate, Job job)
    {
        var prompt = "Score how well this candidate matches the job. Return ONLY a single integer between 0 and 100.\n\n" +
            $"Job Title: {job.Title}\n" +
            $"Job Required Skills: {job.RequiredSkillsJson}\n" +
            $"Job Description: {job.Description}\n\n" +
            $"Candidate Role: {candidate.Role}\n" +
            $"Candidate Experience: {candidate.Experience}\n" +
            $"Candidate Skills: {candidate.SkillsJson}\n\n" +
            "Return only the number, nothing else.";

        var apiKey = _configuration["GeminiApiKey"];
        if (string.IsNullOrEmpty(apiKey)) return 50;

        var text = await CallGeminiAsync(prompt, apiKey);
        if (int.TryParse(text, out var score))
            return Math.Clamp(score, 0, 100);
        
        return 50;
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
        var apiKey = Request.Headers["X-Gemini-Key"].ToString();
        if (string.IsNullOrEmpty(apiKey)) apiKey = _configuration["GeminiApiKey"];
        if (string.IsNullOrEmpty(apiKey)) return BadRequest("Missing Gemini API Key");

        var candidate = await _context.Candidates.FindAsync(req.CandidateId);
        var job = await _context.Jobs.FindAsync(req.JobId);
        if (candidate == null || job == null) return NotFound();

        var prompt = "You are a top-tier executive recruiter. Write a short, highly personalized, and compelling outreach email to this candidate pitching them this specific job. Mention their specific skills that align with the job requirements. Keep it under 150 words. Be professional but very engaging.\n\n" +
            $"Candidate Name: {candidate.Name.Split(' ')[0]}\nCandidate Skills: {candidate.SkillsJson}\nCandidate Experience: {candidate.Experience}\n\n" +
            $"Job Title: {job.Title}\nJob Required Skills: {job.RequiredSkillsJson}\nJob Description: {job.Description}";

        var draft = await CallGeminiAsync(prompt, apiKey);
        if (string.IsNullOrEmpty(draft)) return StatusCode(500, "Failed to generate draft");
        
        return Ok(new { draft });
    }

    [HttpPut("applications/{id}/stage")]
    public async Task<IActionResult> UpdateApplicationStage(int id, [FromBody] string stage)
    {
        var app = await _context.Applications.FindAsync(id);
        if (app == null) return NotFound();

        app.Stage = stage;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // -- DELETE CANDIDATE --
    [HttpDelete("candidates/{id}")]
    public async Task<IActionResult> DeleteCandidate(int id)
    {
        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound();

        // Remove linked applications first
        var apps = _context.Applications.Where(a => a.CandidateId == id);
        _context.Applications.RemoveRange(apps);
        
        // Remove linked activities
        var acts = _context.Activities.Where(a => a.CandidateId == id);
        _context.Activities.RemoveRange(acts);

        _context.Candidates.Remove(candidate);
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

        activity.CandidateId = id;
        activity.CreatedAt = DateTime.UtcNow;
        
        _context.Activities.Add(activity);
        
        // Check for mentions
        if (activity.Content != null && activity.Content.Contains("@"))
        {
            var words = activity.Content.Split(new[] { ' ', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            foreach(var word in words) {
                if(word.StartsWith("@") && word.Length > 1) {
                    _context.Notifications.Add(new Notification {
                        RoleToNotify = word.Substring(1),
                        Message = $"You were mentioned in a note for candidate {candidate.Name}"
                    });
                }
            }
        }
        
        await _context.SaveChangesAsync();
        
        return Ok(activity);
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
        _context.Clients.Add(client);
        await _context.SaveChangesAsync();
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

        placement.ApplicationId = id;
        placement.CreatedAt = DateTime.UtcNow;
        _context.Placements.Add(placement);
        
        app.Stage = "Hired";
        
        await _context.SaveChangesAsync();
        return Ok(placement);
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
                _context.Applications.Add(new Application { CandidateId = cid, JobId = req.JobId, Stage = "Applied", AppliedAt = DateTime.UtcNow });
                count++;
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { assigned = count });
    }

    public class BulkEmailRequest { public List<int> CandidateIds { get; set; } = new(); public string Subject { get; set; } = ""; public string Body { get; set; } = ""; }

    [HttpPost("candidates/bulk-email")]
    public async Task<ActionResult> BulkEmail([FromBody] BulkEmailRequest req)
    {
        foreach (var cid in req.CandidateIds)
        {
            _context.Activities.Add(new Activity { 
                CandidateId = cid, 
                Type = "Email Sent", 
                Content = $"Subject: {req.Subject}\n\n{req.Body}", 
                CreatedAt = DateTime.UtcNow 
            });
        }
        await _context.SaveChangesAsync();
        return Ok(new { sent = req.CandidateIds.Count });
    }

    // -- QUICK PARSE (SOURCING) --
    public class QuickParseRequest { public string RawText { get; set; } = ""; }

    [HttpPost("candidates/quick-parse")]
    public async Task<ActionResult> QuickParse([FromBody] QuickParseRequest req)
    {
        var apiKey = Request.Headers["X-Gemini-Key"].ToString();
        if (string.IsNullOrEmpty(apiKey)) apiKey = _configuration["GeminiApiKey"];
        if (string.IsNullOrEmpty(apiKey)) return BadRequest("Missing Gemini API Key");

        var prompt = "Extract candidate details from this raw text into JSON: { \"Name\": \"\", \"Email\": \"\", \"Phone\": \"\", \"Role\": \"\", \"Experience\": \"\", \"Education\": \"\", \"Skills\": [\"string\"] }. Return ONLY raw JSON.\n\n" + req.RawText;
        
        var json = await CallGeminiAsync(prompt, apiKey);
        if (string.IsNullOrEmpty(json)) return StatusCode(500, "Parse failed");
        
        json = json.Replace("```json", "").Replace("```", "").Trim();
        try {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var c = new Candidate {
                Name = root.TryGetProperty("Name", out var n) ? n.GetString() ?? "Unknown" : "Unknown",
                Email = root.TryGetProperty("Email", out var e) ? e.GetString() : "",
                Phone = root.TryGetProperty("Phone", out var p) ? p.GetString() : "",
                Role = root.TryGetProperty("Role", out var r) ? r.GetString() : "",
                Experience = root.TryGetProperty("Experience", out var ex) ? ex.GetString() : "",
                Education = root.TryGetProperty("Education", out var edu) ? edu.GetString() : "",
                SkillsJson = root.TryGetProperty("Skills", out var sk) ? sk.GetRawText() : "[]",
                CreatedAt = DateTime.UtcNow
            };
            _context.Candidates.Add(c);
            await _context.SaveChangesAsync();
            return Ok(c);
        } catch { return BadRequest("Failed to parse JSON from AI"); }
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
            .Take(6)
            .Select(c => new { c.Id, c.Name, c.Role, c.CreatedAt })
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

        return Ok(new { 
            funnel, 
            recentCandidates, 
            metrics = new { 
                totalMargin, 
                avgTimeToHire, 
                dropoffRate 
            } 
        });
    }
}

