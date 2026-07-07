using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using AtsApi.Models;

namespace AtsApi.Controllers;

[ApiController]
[Route("api/ats/[controller]")]
public class ResumeController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly AtsDbContext _context;
    
    private readonly IConfiguration _configuration;
    
    // We use a fast, free instruct model on HF for JSON extraction
    private const string ModelEndpoint = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

    public ResumeController(AtsDbContext context, IConfiguration configuration)
    {
        _httpClient = new HttpClient();
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("parse")]
    public async Task<IActionResult> ParseResume(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        try
        {
            string extractedText = "";
            using (var stream = file.OpenReadStream())
            using (var pdfReader = new PdfReader(stream))
            using (var pdfDocument = new PdfDocument(pdfReader))
            {
                for (int i = 1; i <= pdfDocument.GetNumberOfPages(); i++)
                {
                    var strategy = new LocationTextExtractionStrategy();
                    string text = PdfTextExtractor.GetTextFromPage(pdfDocument.GetPage(i), strategy);
                    extractedText += text + "\n";
                }
            }

            var parsedCandidate = await CallHuggingFaceLlmAsync(extractedText);

            if (parsedCandidate == null)
            {
                // Fallback to Regex Parser instead of Simulated Data
                parsedCandidate = ParseWithRegex(extractedText);
            }

            // Save PDF to wwwroot/resumes
            var resumesFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "resumes");
            if (!Directory.Exists(resumesFolder))
                Directory.CreateDirectory(resumesFolder);
                
            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(resumesFolder, fileName);
            
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            parsedCandidate.ResumeFilePath = "/resumes/" + fileName;

            // Save to database
            _context.Candidates.Add(parsedCandidate);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Resume parsed and saved successfully.", candidate = parsedCandidate });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    private Candidate ParseWithRegex(string text)
    {
        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        string name = "Unknown";
        if (lines.Length > 0)
        {
            // Assume first line is name
            name = lines[0].Trim();
        }

        string email = "Unknown";
        var emailMatch = Regex.Match(text, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
        if (emailMatch.Success) email = emailMatch.Value;

        string role = "Developer";
        var roleMatch = Regex.Match(text, @"(?i)(software engineer|frontend engineer|backend developer|product designer|data scientist|manager|developer)");
        if (roleMatch.Success) role = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(roleMatch.Value.ToLower());

        string experience = "Entry Level";
        var expMatch = Regex.Match(text, @"(?i)(\d+)\+?\s+years");
        if (expMatch.Success) experience = expMatch.Value;

        return new Candidate
        {
            Name = name,
            Role = role,
            Experience = experience,
            Email = email,
            Stage = "applied",
            MatchScore = 75,
            Rating = 3.5,
            SubmittedJobIds = new List<int>(),
            RelevantJobIds = new List<int>()
        };
    }

    private async Task<Candidate?> CallHuggingFaceLlmAsync(string resumeText)
    {
        string prompt = $@"
[INST] Extract the following information from the resume text below. 
Respond ONLY with a valid JSON object matching this schema:
{{
  ""Name"": """",
  ""Role"": """",
  ""Experience"": """",
  ""Email"": """"
}}

Resume Text:
{resumeText}
[/INST]";

        var requestBody = new
        {
            inputs = prompt,
            parameters = new
            {
                max_new_tokens = 250,
                temperature = 0.1,
                return_full_text = false
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, ModelEndpoint);
        var huggingFaceApiKey = _configuration["HuggingFaceApiKey"];
        if (!string.IsNullOrEmpty(huggingFaceApiKey))
        {
            request.Headers.Add("Authorization", $"Bearer {huggingFaceApiKey}");
        }
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var responseString = await response.Content.ReadAsStringAsync();
                using var jsonDoc = JsonDocument.Parse(responseString);
                var generatedText = jsonDoc.RootElement[0].GetProperty("generated_text").GetString();
                
                if (!string.IsNullOrEmpty(generatedText))
                {
                    int startIndex = generatedText.IndexOf('{');
                    int endIndex = generatedText.LastIndexOf('}');
                    if (startIndex != -1 && endIndex != -1)
                    {
                        string jsonOnly = generatedText.Substring(startIndex, endIndex - startIndex + 1);
                        var data = JsonSerializer.Deserialize<Dictionary<string, string>>(jsonOnly);
                        if (data != null)
                        {
                            return new Candidate
                            {
                                Name = data.GetValueOrDefault("Name", "Unknown"),
                                Role = data.GetValueOrDefault("Role", "Unknown"),
                                Experience = data.GetValueOrDefault("Experience", "Unknown"),
                                Email = data.GetValueOrDefault("Email", "Unknown"),
                                Stage = "applied",
                                SubmittedJobIds = new List<int>(),
                                RelevantJobIds = new List<int>()
                            };
                        }
                    }
                }
            }
        }
        catch
        {
            // Ignore API failures and let it fall back
        }
        return null;
    }
}
