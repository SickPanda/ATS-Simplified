using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AtsApi.Models;

namespace AtsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AtsController : ControllerBase
{
    private readonly AtsDbContext _context;

    public AtsController(AtsDbContext context)
    {
        _context = context;
    }

    [HttpGet("jobs")]
    public async Task<ActionResult<IEnumerable<Job>>> GetJobs()
    {
        return await _context.Jobs.ToListAsync();
    }

    [HttpGet("candidates")]
    public async Task<ActionResult<IEnumerable<Candidate>>> GetCandidates()
    {
        return await _context.Candidates.ToListAsync();
    }

    [HttpGet("jobs/{jobId}/candidates")]
    public async Task<ActionResult> GetJobCandidates(int jobId)
    {
        var allCandidates = await _context.Candidates.ToListAsync();
        
        var submitted = allCandidates.Where(c => c.SubmittedJobIds.Contains(jobId)).ToList();
        var relevant = allCandidates.Where(c => c.RelevantJobIds.Contains(jobId)).ToList();

        return Ok(new
        {
            Submitted = submitted,
            Relevant = relevant
        });
    }

    [HttpPost("jobs")]
    public async Task<ActionResult<Job>> CreateJob(Job job)
    {
        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetJobs), new { id = job.Id }, job);
    }

    [HttpPut("candidates/{id}/status")]
    public async Task<IActionResult> UpdateCandidateStatus(int id, [FromBody] string status)
    {
        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound();

        candidate.Stage = status;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("candidates/{id}/assign")]
    public async Task<IActionResult> AssignCandidateToJob(int id, [FromBody] int jobId)
    {
        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound();

        if (!candidate.SubmittedJobIds.Contains(jobId))
        {
            candidate.SubmittedJobIds.Add(jobId);
            await _context.SaveChangesAsync();
        }
        
        return NoContent();
    }
}
