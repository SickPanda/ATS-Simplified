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
}
