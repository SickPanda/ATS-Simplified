using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using AtsApi.Models;
using DocumentFormat.OpenXml.Packaging;
using PdfiumViewer;
using System.Drawing;
using System.Drawing.Imaging;

namespace AtsApi.Controllers;

[ApiController]
[Route("api/ats/[controller]")]
public class ResumeController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly AtsDbContext _context;
    
    private readonly IConfiguration _configuration;

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

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext != ".pdf" && ext != ".docx")
            return BadRequest("Only .pdf and .docx files are supported.");

        try
        {
            var customApiKey = Request.Headers["X-Gemini-Key"].ToString();
            Candidate? parsedCandidate = null;

            if (ext == ".docx")
            {
                string text = ExtractTextFromDocx(file);
                parsedCandidate = await CallGeminiLlmAsync(text: text, customApiKey: customApiKey);
                if (parsedCandidate == null)
                    return StatusCode(502, "Gemini API failed to parse the DOCX. Check that your API key is valid.");
            }
            else if (ext == ".pdf")
            {
                var base64Images = ConvertPdfToImages(file);
                parsedCandidate = await CallGeminiLlmAsync(images: base64Images, customApiKey: customApiKey);
            }

            if (parsedCandidate == null)
            {
                return StatusCode(500, "Failed to parse the document.");
            }

            // Save PDF to wwwroot/resumes
            var resumesFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "resumes");
            if (!Directory.Exists(resumesFolder))
                Directory.CreateDirectory(resumesFolder);
                
            var fileName = Guid.NewGuid().ToString() + ext;
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

    private string ExtractTextFromDocx(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        using var wordDoc = WordprocessingDocument.Open(stream, false);
        var body = wordDoc.MainDocumentPart?.Document.Body;
        return body?.InnerText ?? "";
    }

    private List<string> ConvertPdfToImages(IFormFile file)
    {
        var base64Images = new List<string>();
        using var stream = file.OpenReadStream();
        using var pdfDocument = PdfDocument.Load(stream);
        for (int i = 0; i < pdfDocument.PageCount; i++)
        {
            // Use 200 DPI for good OCR quality while keeping token size reasonable
            using var image = pdfDocument.Render(i, 200, 200, PdfRenderFlags.CorrectFromDpi);
            using var ms = new MemoryStream();
            image.Save(ms, ImageFormat.Png);
            base64Images.Add(Convert.ToBase64String(ms.ToArray()));
        }
        return base64Images;
    }

    private Candidate ParseWithRegex(string text)
    {
        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        string name = "Unknown";
        if (lines.Length > 0)
        {
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
            Phone = "Unknown",
            Education = "Unknown",
            SkillsJson = "[]"
        };
    }

    private async Task<Candidate?> CallGeminiLlmAsync(string? text = null, List<string>? images = null, string customApiKey = "")
    {
        var apiKey = !string.IsNullOrEmpty(customApiKey) ? customApiKey : _configuration["GeminiApiKey"];
        if (string.IsNullOrEmpty(apiKey)) 
        {
            throw new Exception("Gemini API Key is missing. Please provide it in Settings.");
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";

        var parts = new List<object>();
        
        string prompt = @"Extract the following information from the resume. 
Respond ONLY with a valid JSON object matching this schema. Do NOT use markdown code blocks, just raw JSON:
{
  ""Name"": """",
  ""Role"": """",
  ""Experience"": """",
  ""Email"": """",
  ""Phone"": """",
  ""Education"": """",
  ""Skills"": [""skill1"", ""skill2""]
}";

        parts.Add(new { text = prompt });

        if (!string.IsNullOrEmpty(text))
        {
            parts.Add(new { text = "\nResume Text:\n" + text });
        }
        
        if (images != null)
        {
            foreach (var imgBase64 in images)
            {
                parts.Add(new {
                    inline_data = new {
                        mime_type = "image/png",
                        data = imgBase64
                    }
                });
            }
        }

        var requestBody = new
        {
            contents = new[] { new { parts = parts } },
            generationConfig = new { responseMimeType = "application/json" }
        };

        var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync(url, content);
            var responseString = await response.Content.ReadAsStringAsync();
            
            if (response.IsSuccessStatusCode)
            {
                using var jsonDoc = JsonDocument.Parse(responseString);
                var candidatesList = jsonDoc.RootElement.GetProperty("candidates");
                if (candidatesList.GetArrayLength() > 0)
                {
                    var generatedText = candidatesList[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                    
                    if (!string.IsNullOrEmpty(generatedText))
                    {
                        // Clean up markdown if any
                        generatedText = generatedText.Trim();
                        if (generatedText.StartsWith("```json"))
                        {
                            generatedText = generatedText.Substring(7);
                            if (generatedText.EndsWith("```")) generatedText = generatedText.Substring(0, generatedText.Length - 3);
                        }
                        
                        using var data = JsonDocument.Parse(generatedText.Trim());
                        return new Candidate
                        {
                            Name = data.RootElement.TryGetProperty("Name", out var n) ? n.GetString() ?? "Unknown" : "Unknown",
                            Role = data.RootElement.TryGetProperty("Role", out var r) ? r.GetString() ?? "Unknown" : "Unknown",
                            Experience = data.RootElement.TryGetProperty("Experience", out var ex) ? ex.GetString() ?? "Unknown" : "Unknown",
                            Email = data.RootElement.TryGetProperty("Email", out var em) ? em.GetString() ?? "Unknown" : "Unknown",
                            Phone = data.RootElement.TryGetProperty("Phone", out var p) ? p.GetString() ?? "Unknown" : "Unknown",
                            Education = data.RootElement.TryGetProperty("Education", out var ed) ? ed.GetString() ?? "Unknown" : "Unknown",
                            SkillsJson = data.RootElement.TryGetProperty("Skills", out var skills) ? skills.GetRawText() : "[]"
                        };
                    }
                }
            }
            else
            {
                var errorMsg = "Gemini API Error: " + response.StatusCode + " - " + responseString;
                Console.WriteLine(errorMsg);
                throw new Exception(errorMsg);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Exception calling Gemini: " + ex.Message);
            throw; // Re-throw to be caught by the outer block and returned to UI
        }
        return null;
    }
}
