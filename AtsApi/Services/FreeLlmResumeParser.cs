using System.Text;
using System.Text.Json;
using AtsApi.Models;

namespace AtsApi.Services;

/// <summary>
/// Optional free cloud LLM enhancement (Groq Llama — free tier, OpenAI-compatible).
/// Never required: LocalResumeParser always runs first.
/// </summary>
public class FreeLlmResumeParser
{
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(45) };
    private readonly IConfiguration _config;

    public FreeLlmResumeParser(IConfiguration config) => _config = config;

    public async Task<Candidate?> EnhanceAsync(string resumeText, string? groqKeyHeader = null)
    {
        var apiKey = FirstNonEmpty(
            groqKeyHeader,
            _config["Groq:ApiKey"],
            _config["GroqApiKey"],
            Environment.GetEnvironmentVariable("GROQ_API_KEY"));

        if (string.IsNullOrWhiteSpace(apiKey)) return null;

        var model = _config["Groq:Model"]
            ?? Environment.GetEnvironmentVariable("GROQ_MODEL")
            ?? "llama-3.3-70b-versatile";

        var prompt =
            "You are an expert staffing recruiter resume parser. Extract structured candidate data.\n" +
            "Return ONLY valid JSON (no markdown) with this schema:\n" +
            "{\n" +
            "  \"Name\": \"\",\n" +
            "  \"Role\": \"\",\n" +
            "  \"Experience\": \"e.g. 5 years\",\n" +
            "  \"Email\": \"\",\n" +
            "  \"Phone\": \"\",\n" +
            "  \"Education\": \"\",\n" +
            "  \"City\": \"\",\n" +
            "  \"State\": \"\",\n" +
            "  \"WorkAuthorization\": \"US Citizen|H1B|Green Card|OPT|EAD|Not specified\",\n" +
            "  \"Skills\": [\"skill1\", \"skill2\"]\n" +
            "}\n\n" +
            "Resume text:\n" + resumeText[..Math.Min(resumeText.Length, 12000)];

        var body = new
        {
            model,
            temperature = 0.1,
            response_format = new { type = "json_object" },
            messages = new[]
            {
                new { role = "system", content = "Extract resume fields as strict JSON only." },
                new { role = "user", content = prompt }
            }
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        try
        {
            var res = await _http.SendAsync(req);
            var json = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                Console.WriteLine($"[FreeLlm] Groq error {res.StatusCode}: {json}");
                return null;
            }

            using var doc = JsonDocument.Parse(json);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content)) return null;
            content = content.Trim();
            if (content.StartsWith("```"))
            {
                content = content.Replace("```json", "").Replace("```", "").Trim();
            }

            using var data = JsonDocument.Parse(content);
            var root = data.RootElement;

            string Get(string prop) =>
                root.TryGetProperty(prop, out var el) ? el.GetString()?.Trim() ?? "" : "";

            var skills = "[]";
            if (root.TryGetProperty("Skills", out var sk))
                skills = sk.ValueKind == JsonValueKind.Array ? sk.GetRawText() : "[]";

            return new Candidate
            {
                Name = FirstNonEmpty(Get("Name"), "Unknown Candidate")!,
                Role = FirstNonEmpty(Get("Role"), "Professional")!,
                Experience = FirstNonEmpty(Get("Experience"), "Not specified")!,
                Email = Get("Email"),
                Phone = Get("Phone"),
                Education = FirstNonEmpty(Get("Education"), "Not specified")!,
                City = Get("City"),
                State = Get("State"),
                WorkAuthorization = FirstNonEmpty(Get("WorkAuthorization"), "Not specified")!,
                Source = "ATS Pro AI (Llama/Groq)",
                Status = "Active",
                Ownership = "Aazam Qureshi",
                SkillsJson = skills,
                CreatedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine("[FreeLlm] " + ex.Message);
            return null;
        }
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
}
