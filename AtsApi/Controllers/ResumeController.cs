using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using AtsApi.Models;
using AtsApi.Services;

namespace AtsApi.Controllers;

[ApiController]
[Route("api/ats/[controller]")]
public class ResumeController : ControllerBase
{
    private readonly AtsDbContext _context;
    private readonly IWebHostEnvironment _env;

    public ResumeController(AtsDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    /// <summary>
    /// ATS Pro Intelligence — fully in-app resume parse.
    /// No external AI APIs (Gemini/Groq/OpenAI). Data never leaves your server.
    /// </summary>
    [HttpPost("parse")]
    public async Task<IActionResult> ParseResume(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".pdf" or ".docx" or ".txt"))
            return BadRequest("Only .pdf, .docx, and .txt files are supported.");

        try
        {
            string text;
            try
            {
                text = await ResumeTextExtractor.ExtractAsync(file);
            }
            catch (Exception ex)
            {
                return BadRequest($"Could not read document text: {ex.Message}");
            }

            if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 20)
            {
                return BadRequest(
                    "ATS Pro Intelligence could not extract enough text. " +
                    "Scanned/image-only PDFs are not supported yet — use a text PDF, DOCX, or Quick Parse paste.");
            }

            var result = LocalResumeParser.ParseDetailed(text, "ATS Pro Intelligence");
            var parsed = result.Candidate;

            // Save original file (DATA_DIR-aware)
            var (storedName, size) = await DocumentStorage.SaveAsync(_env, file);
            parsed.ResumeFilePath = "/resumes/" + storedName;

            // Activity: intelligence report (summary, confidence, work history)
            string BuildIntelNote()
            {
                var parts = new List<string>
                {
                    $"ATS Pro Intelligence · confidence {result.Confidence}%",
                    $"Engine: in-app (no external AI)"
                };
                if (!string.IsNullOrWhiteSpace(result.Summary))
                    parts.Add("Summary: " + result.Summary);
                if (!string.IsNullOrWhiteSpace(result.LinkedIn))
                    parts.Add("LinkedIn: " + result.LinkedIn);
                if (!string.IsNullOrWhiteSpace(result.GitHub))
                    parts.Add("GitHub: " + result.GitHub);
                if (result.WorkHistory.Count > 0)
                {
                    parts.Add("Work history:");
                    foreach (var j in result.WorkHistory.Take(5))
                        parts.Add($"  • {j.Title}" +
                                  (string.IsNullOrEmpty(j.Company) ? "" : $" @ {j.Company}") +
                                  (string.IsNullOrEmpty(j.Dates) ? "" : $" ({j.Dates})"));
                }
                return string.Join("\n", parts);
            }

            // Duplicate merge by email
            if (!string.IsNullOrWhiteSpace(parsed.Email) && parsed.Email != "Unknown")
            {
                var existing = await _context.Candidates
                    .FirstOrDefaultAsync(c => c.Email != null && c.Email.ToLower() == parsed.Email.ToLower());

                if (existing != null)
                {
                    var existingSkills = MatchEngine.ParseSkills(existing.SkillsJson);
                    var newSkills = MatchEngine.ParseSkills(parsed.SkillsJson);
                    foreach (var s in newSkills)
                    {
                        if (!existingSkills.Any(e => string.Equals(e, s, StringComparison.OrdinalIgnoreCase)))
                            existingSkills.Add(s);
                    }
                    existing.SkillsJson = JsonSerializer.Serialize(existingSkills);
                    existing.ResumeFilePath = parsed.ResumeFilePath;
                    if (string.IsNullOrEmpty(existing.Phone) || existing.Phone == "Unknown")
                        existing.Phone = parsed.Phone;
                    if (string.IsNullOrEmpty(existing.Role) || existing.Role is "Unknown" or "Professional")
                        existing.Role = parsed.Role;
                    if (string.IsNullOrEmpty(existing.Experience) || existing.Experience.Contains("Not specified"))
                        existing.Experience = parsed.Experience;
                    if (string.IsNullOrEmpty(existing.Education) || existing.Education.Contains("Not specified"))
                        existing.Education = parsed.Education;

                    _context.CandidateDocuments.Add(new CandidateDocument
                    {
                        CandidateId = existing.Id,
                        FileName = file.FileName,
                        StoredName = storedName,
                        ContentType = file.ContentType ?? "application/octet-stream",
                        SizeBytes = size,
                        DocType = "Resume",
                        UploadedBy = "ATS Pro Intelligence",
                        UploadedAt = DateTime.UtcNow,
                        Notes = "Parsed upload (duplicate merge)"
                    });

                    _context.Activities.Add(new Activity
                    {
                        CandidateId = existing.Id,
                        Type = "System",
                        Content = BuildIntelNote() + "\n(merged into existing profile)",
                        CreatedAt = DateTime.UtcNow,
                        CreatedBy = "System"
                    });

                    await _context.SaveChangesAsync();
                    return Ok(new
                    {
                        message = "Duplicate detected — existing candidate updated by ATS Pro Intelligence.",
                        candidate = existing,
                        isDuplicate = true,
                        engine = "ats-pro-intelligence",
                        confidence = result.Confidence,
                        summary = result.Summary,
                        linkedIn = result.LinkedIn,
                        workHistory = result.WorkHistory,
                        textChars = text.Length
                    });
                }
            }

            _context.Candidates.Add(parsed);
            await _context.SaveChangesAsync();

            _context.CandidateDocuments.Add(new CandidateDocument
            {
                CandidateId = parsed.Id,
                FileName = file.FileName,
                StoredName = storedName,
                ContentType = file.ContentType ?? "application/octet-stream",
                SizeBytes = size,
                DocType = "Resume",
                UploadedBy = "ATS Pro Intelligence",
                UploadedAt = DateTime.UtcNow
            });

            _context.Activities.Add(new Activity
            {
                CandidateId = parsed.Id,
                Type = "System",
                Content = BuildIntelNote(),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "System"
            });
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Resume parsed by ATS Pro Intelligence ({result.Confidence}% confidence) — runs in your app, no external AI.",
                candidate = parsed,
                isDuplicate = false,
                engine = "ats-pro-intelligence",
                confidence = result.Confidence,
                summary = result.Summary,
                linkedIn = result.LinkedIn,
                workHistory = result.WorkHistory,
                textChars = text.Length
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpPost("parse-preview")]
    public async Task<IActionResult> ParsePreview(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file.");
        var text = await ResumeTextExtractor.ExtractAsync(file);
        if (string.IsNullOrWhiteSpace(text) || text.Length < 20)
            return BadRequest("Not enough text extracted.");

        var result = LocalResumeParser.ParseDetailed(text);
        return Ok(new
        {
            engine = "ats-pro-intelligence",
            confidence = result.Confidence,
            summary = result.Summary,
            linkedIn = result.LinkedIn,
            github = result.GitHub,
            workHistory = result.WorkHistory,
            candidate = result.Candidate,
            textChars = text.Length
        });
    }
}
