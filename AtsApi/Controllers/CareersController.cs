using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AtsApi.Models;
using AtsApi.Services;

namespace AtsApi.Controllers;

/// <summary>Public career portal — no login required.</summary>
[ApiController]
[Route("api/careers")]
[AllowAnonymous]
public class CareersController : ControllerBase
{
    private readonly AtsDbContext _db;
    private readonly IWebHostEnvironment _env;

    public CareersController(AtsDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet("jobs")]
    public async Task<ActionResult> ListJobs()
    {
        var jobs = await _db.Jobs.AsNoTracking()
            .Where(j => j.Status == "Active")
            .OrderByDescending(j => j.Id)
            .Select(j => new
            {
                j.Id,
                j.JobCode,
                j.Title,
                j.Department,
                j.Location,
                j.SalaryRange,
                j.RateUnit,
                // Public-facing only — no bill/pay internals
                skills = j.RequiredSkillsJson,
                summary = j.Description.Length > 280 ? j.Description.Substring(0, 280) + "…" : j.Description
            })
            .ToListAsync();
        return Ok(jobs);
    }

    [HttpGet("jobs/{id:int}")]
    public async Task<ActionResult> GetJob(int id)
    {
        var j = await _db.Jobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.Status == "Active");
        if (j == null) return NotFound(new { message = "Job not found or not open." });

        return Ok(new
        {
            j.Id,
            j.JobCode,
            j.Title,
            j.Department,
            j.Location,
            j.SalaryRange,
            j.RateUnit,
            skills = j.RequiredSkillsJson,
            description = j.Description
        });
    }

    public class ApplyForm
    {
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string? Message { get; set; }
        public string? LinkedIn { get; set; }
    }

    [HttpPost("jobs/{id:int}/apply")]
    [RequestSizeLimit(12_000_000)]
    public async Task<ActionResult> Apply(int id, [FromForm] string name, [FromForm] string email,
        [FromForm] string? phone, [FromForm] string? message, [FromForm] string? linkedIn, IFormFile? resume)
    {
        var job = await _db.Jobs.FindAsync(id);
        if (job == null || job.Status != "Active")
            return NotFound(new { message = "Job not found or not open." });

        name = (name ?? "").Trim();
        email = (email ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
            return BadRequest(new { message = "Name is required." });
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            return BadRequest(new { message = "Valid email is required." });

        Candidate? candidate = await _db.Candidates
            .FirstOrDefaultAsync(c => c.Email != null && c.Email.ToLower() == email.ToLower());

        string? resumePath = null;
        string? storedName = null;
        long size = 0;

        if (resume != null && resume.Length > 0)
        {
            var ext = Path.GetExtension(resume.FileName).ToLowerInvariant();
            if (ext is not (".pdf" or ".docx" or ".doc" or ".txt"))
                return BadRequest(new { message = "Resume must be PDF, DOCX, or TXT." });
            (storedName, size) = await DocumentStorage.SaveAsync(_env, resume);
            resumePath = "/resumes/" + storedName;
        }

        if (candidate == null)
        {
            candidate = new Candidate
            {
                Name = name,
                Email = email,
                Phone = phone?.Trim() ?? "",
                Role = job.Title,
                Experience = "Not specified",
                Education = "",
                City = "",
                State = "",
                Source = "Career Portal",
                Status = "Active",
                Ownership = string.IsNullOrWhiteSpace(job.PrimaryRecruiter) ? "Unassigned" : job.PrimaryRecruiter,
                WorkAuthorization = "Not specified",
                SkillsJson = "[]",
                ResumeFilePath = resumePath,
                CreatedAt = DateTime.UtcNow
            };

            // Light parse if we have a text resume
            if (resume != null && resume.Length > 0)
            {
                try
                {
                    // Re-open not possible from stream easily after save — skip full parse, keep portal source
                }
                catch { /* ignore */ }
            }

            _db.Candidates.Add(candidate);
            await _db.SaveChangesAsync();

            if (!string.IsNullOrEmpty(storedName))
            {
                _db.CandidateDocuments.Add(new CandidateDocument
                {
                    CandidateId = candidate.Id,
                    FileName = resume!.FileName,
                    StoredName = storedName,
                    ContentType = resume.ContentType ?? "application/octet-stream",
                    SizeBytes = size,
                    DocType = "Resume",
                    UploadedBy = "Career Portal",
                    UploadedAt = DateTime.UtcNow,
                    Notes = "Applied via public career portal"
                });
            }

            _db.Activities.Add(new Activity
            {
                CandidateId = candidate.Id,
                Type = "System",
                Content = $"Applied via Career Portal to {job.Title} ({job.JobCode})" +
                          (string.IsNullOrWhiteSpace(message) ? "" : $"\n\nCover note:\n{message.Trim()}") +
                          (string.IsNullOrWhiteSpace(linkedIn) ? "" : $"\nLinkedIn: {linkedIn.Trim()}"),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "Career Portal",
                JobId = job.Id
            });
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(phone) && (string.IsNullOrWhiteSpace(candidate.Phone) || candidate.Phone == "Unknown"))
                candidate.Phone = phone.Trim();
            if (!string.IsNullOrEmpty(resumePath))
                candidate.ResumeFilePath = resumePath;
            if (string.IsNullOrWhiteSpace(candidate.Source) || candidate.Source == "Manual")
                candidate.Source = "Career Portal";

            if (!string.IsNullOrEmpty(storedName) && resume != null)
            {
                _db.CandidateDocuments.Add(new CandidateDocument
                {
                    CandidateId = candidate.Id,
                    FileName = resume.FileName,
                    StoredName = storedName,
                    ContentType = resume.ContentType ?? "application/octet-stream",
                    SizeBytes = size,
                    DocType = "Resume",
                    UploadedBy = "Career Portal",
                    UploadedAt = DateTime.UtcNow,
                    Notes = "Re-applied via career portal"
                });
            }

            _db.Activities.Add(new Activity
            {
                CandidateId = candidate.Id,
                Type = "System",
                Content = $"Re-applied via Career Portal to {job.Title} ({job.JobCode})" +
                          (string.IsNullOrWhiteSpace(message) ? "" : $"\n\nCover note:\n{message.Trim()}") +
                          (string.IsNullOrWhiteSpace(linkedIn) ? "" : $"\nLinkedIn: {linkedIn.Trim()}"),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "Career Portal",
                JobId = job.Id
            });
        }

        var existingApp = await _db.Applications
            .FirstOrDefaultAsync(a => a.CandidateId == candidate.Id && a.JobId == job.Id);

        if (existingApp == null)
        {
            var score = MatchEngine.Score(candidate, job).Score;
            _db.Applications.Add(new Application
            {
                CandidateId = candidate.Id,
                JobId = job.Id,
                Stage = "Applied",
                MatchScore = score,
                AppliedAt = DateTime.UtcNow
            });
        }

        _db.Notifications.Add(new Notification
        {
            RoleToNotify = "Admin",
            Message = $"New career portal application: {name} → {job.Title}"
        });
        if (!string.IsNullOrWhiteSpace(job.PrimaryRecruiter))
        {
            _db.Notifications.Add(new Notification
            {
                RoleToNotify = "Recruiter",
                Message = $"New application for {job.Title}: {name} ({email})"
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            ok = true,
            message = existingApp == null
                ? "Application received. A recruiter will review your profile."
                : "You're already in our pipeline for this role — we refreshed your application.",
            jobTitle = job.Title,
            alreadyApplied = existingApp != null
        });
    }

    [HttpGet("branding")]
    public ActionResult Branding()
    {
        // Lightweight public branding (could later read AppSettings)
        return Ok(new
        {
            companyName = "Candeo",
            tagline = "We're hiring — join our talent network",
            careersPath = "/careers"
        });
    }
}
