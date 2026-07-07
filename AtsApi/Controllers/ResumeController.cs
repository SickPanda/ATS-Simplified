using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;
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
    
    // We leave this empty for the user to fill in, or we simulate if empty.
    private const string HuggingFaceApiKey = ""; 
    
    // We use a fast, free instruct model on HF for JSON extraction
    private const string ModelEndpoint = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

    public ResumeController(AtsDbContext context)
    {
        _httpClient = new HttpClient();
        _context = context;
    }

    [HttpPost("parse")]
    public async Task<IActionResult> ParseResume(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        try
        {
            // 1. Extract text from PDF
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

            // 2. Send to LLM for structed parsing
            var parsedCandidate = await CallHuggingFaceLlmAsync(extractedText);

            if (parsedCandidate != null)
            {
                // Save to database
                _context.Candidates.Add(parsedCandidate);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Resume parsed and saved successfully.", candidate = parsedCandidate });
            }

            return BadRequest("Failed to parse resume into a candidate profile.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    private async Task<Candidate?> CallHuggingFaceLlmAsync(string resumeText)
    {
        if (string.IsNullOrEmpty(HuggingFaceApiKey))
        {
            // Fallback simulation for learning purposes if key is not set
            return new Candidate {
                Name = "Simulated Applicant (Add HF Token)",
                Role = "Software Engineer",
                Experience = "5 years",
                Email = "simulated@example.com",
                Stage = "applied",
                MatchScore = 80,
                Rating = 4.0
            };
        }

        // Prompt designed for strict JSON extraction
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
        request.Headers.Add("Authorization", $"Bearer {HuggingFaceApiKey}");
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        if (response.IsSuccessStatusCode)
        {
            var responseString = await response.Content.ReadAsStringAsync();
            try {
                using var jsonDoc = JsonDocument.Parse(responseString);
                var generatedText = jsonDoc.RootElement[0].GetProperty("generated_text").GetString();
                
                // Try to parse the generated text as JSON
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
                                Experience = data.GetValueOrDefault("Experience", ""),
                                Email = data.GetValueOrDefault("Email", ""),
                                Stage = "applied"
                            };
                        }
                    }
                }
            } 
            catch 
            {
                return null;
            }
        }
        return null;
    }
}
