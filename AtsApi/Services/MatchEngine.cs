using System.Text.Json;
using System.Text.RegularExpressions;
using AtsApi.Models;

namespace AtsApi.Services;

/// <summary>
/// Local, explainable candidate–job matching engine.
/// Works without external AI (Azure free-tier friendly) and returns
/// transparent skill/role/experience breakdowns recruiters can defend.
/// </summary>
public static class MatchEngine
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "an", "the", "and", "or", "of", "to", "in", "for", "with", "on", "at",
        "by", "from", "as", "is", "are", "be", "this", "that", "our", "your", "we",
        "you", "will", "can", "looking", "join", "team", "role", "position", "job"
    };

    public record MatchResult(
        int Score,
        List<string> MatchedSkills,
        List<string> MissingSkills,
        List<string> ExtraSkills,
        int SkillScore,
        int RoleScore,
        int ExperienceScore,
        int LocationScore,
        string Summary,
        string Method = "local"
    );

    public static MatchResult Score(Candidate candidate, Job job)
    {
        var jobSkills = ParseSkills(job.RequiredSkillsJson);
        // Enrich job skills from title + description keywords
        foreach (var token in ExtractKeywords($"{job.Title} {job.Description}"))
        {
            if (!jobSkills.Any(s => string.Equals(s, token, StringComparison.OrdinalIgnoreCase)))
                jobSkills.Add(token);
        }

        var candSkills = ParseSkills(candidate.SkillsJson);
        foreach (var token in ExtractKeywords($"{candidate.Role} {candidate.Experience} {candidate.Education}"))
        {
            if (!candSkills.Any(s => string.Equals(s, token, StringComparison.OrdinalIgnoreCase)))
                candSkills.Add(token);
        }

        // --- Skill overlap (0–55) ---
        var matched = new List<string>();
        var missing = new List<string>();
        foreach (var js in jobSkills)
        {
            var hit = candSkills.FirstOrDefault(cs => SkillsMatch(cs, js));
            if (hit != null) matched.Add(js);
            else missing.Add(js);
        }

        var extra = candSkills
            .Where(cs => !jobSkills.Any(js => SkillsMatch(cs, js)))
            .Take(8)
            .ToList();

        int skillScore = 0;
        if (jobSkills.Count == 0)
            skillScore = 30; // neutral when job has no skills listed
        else
            skillScore = (int)Math.Round(55.0 * matched.Count / jobSkills.Count);

        // --- Role title similarity (0–25) ---
        int roleScore = RoleSimilarity(candidate.Role, job.Title);

        // --- Experience alignment (0–15) ---
        int experienceScore = ExperienceScore(candidate.Experience, job.Description + " " + job.Title);

        // --- Location / remote soft signal (0–5) ---
        int locationScore = LocationScore(candidate, job);

        int total = Math.Clamp(skillScore + roleScore + experienceScore + locationScore, 0, 100);

        var summaryParts = new List<string>();
        if (matched.Count > 0)
            summaryParts.Add($"{matched.Count} skill match{(matched.Count == 1 ? "" : "es")}: {string.Join(", ", matched.Take(5))}");
        if (missing.Count > 0)
            summaryParts.Add($"Missing: {string.Join(", ", missing.Take(4))}");
        if (roleScore >= 15)
            summaryParts.Add("Strong role-title alignment");
        else if (roleScore <= 5)
            summaryParts.Add("Weak role-title alignment");

        var summary = summaryParts.Count > 0
            ? string.Join(" · ", summaryParts)
            : "Limited signal — add skills on the job or candidate profile for better ranking.";

        return new MatchResult(
            total, matched, missing, extra,
            skillScore, roleScore, experienceScore, locationScore,
            summary
        );
    }

    public static List<string> ParseSkills(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            return list
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch
        {
            // fallback: comma-separated
            return json.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(s => s.Length > 1)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }

    private static bool SkillsMatch(string a, string b)
    {
        if (string.Equals(a, b, StringComparison.OrdinalIgnoreCase)) return true;
        var al = a.ToLowerInvariant();
        var bl = b.ToLowerInvariant();
        // substring match for things like "React" vs "React.js" or "TypeScript" vs "TS"
        if (al.Contains(bl) || bl.Contains(al)) return true;

        // common aliases
        var aliases = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["js"] = new[] { "javascript" },
            ["ts"] = new[] { "typescript" },
            ["react.js"] = new[] { "react", "reactjs" },
            ["reactjs"] = new[] { "react", "react.js" },
            ["node"] = new[] { "nodejs", "node.js" },
            ["nodejs"] = new[] { "node", "node.js" },
            ["c#"] = new[] { "csharp", ".net", "dotnet" },
            [".net"] = new[] { "dotnet", "c#", "asp.net" },
            ["dotnet"] = new[] { ".net", "c#" },
            ["k8s"] = new[] { "kubernetes" },
            ["aws"] = new[] { "amazon web services" },
            ["gcp"] = new[] { "google cloud" },
            ["ui/ux"] = new[] { "ui", "ux", "figma" },
            ["postgres"] = new[] { "postgresql", "psql" },
            ["mssql"] = new[] { "sql server", "t-sql" },
        };

        if (aliases.TryGetValue(al, out var aAliases) && aAliases.Any(x => bl.Contains(x) || string.Equals(bl, x, StringComparison.OrdinalIgnoreCase)))
            return true;
        if (aliases.TryGetValue(bl, out var bAliases) && bAliases.Any(x => al.Contains(x) || string.Equals(al, x, StringComparison.OrdinalIgnoreCase)))
            return true;

        return false;
    }

    private static int RoleSimilarity(string? candidateRole, string? jobTitle)
    {
        if (string.IsNullOrWhiteSpace(candidateRole) || string.IsNullOrWhiteSpace(jobTitle))
            return 8;

        var cTokens = Tokenize(candidateRole);
        var jTokens = Tokenize(jobTitle);
        if (cTokens.Count == 0 || jTokens.Count == 0) return 8;

        var overlap = cTokens.Count(t => jTokens.Any(j => j.Contains(t) || t.Contains(j)));
        var ratio = (double)overlap / Math.Max(jTokens.Count, 1);

        // seniority soft boost
        var levels = new[] { "junior", "mid", "senior", "lead", "principal", "staff", "architect" };
        var cLevel = levels.FirstOrDefault(l => candidateRole.Contains(l, StringComparison.OrdinalIgnoreCase));
        var jLevel = levels.FirstOrDefault(l => jobTitle.Contains(l, StringComparison.OrdinalIgnoreCase));
        int seniorityBonus = 0;
        if (cLevel != null && jLevel != null && cLevel == jLevel) seniorityBonus = 5;
        else if (cLevel != null && jLevel != null && cLevel != jLevel) seniorityBonus = -3;

        return Math.Clamp((int)Math.Round(ratio * 25) + seniorityBonus, 0, 25);
    }

    private static int ExperienceScore(string? experience, string jobText)
    {
        var candYears = ExtractYears(experience);
        var jobYears = ExtractYears(jobText);

        if (candYears == null && jobYears == null) return 8;
        if (candYears == null) return 5;
        if (jobYears == null)
        {
            // reward more experience lightly
            if (candYears >= 5) return 12;
            if (candYears >= 2) return 10;
            return 7;
        }

        // within ±2 years of requirement is ideal
        var delta = candYears.Value - jobYears.Value;
        if (delta >= 0 && delta <= 3) return 15;
        if (delta > 3 && delta <= 8) return 12; // overqualified but fine
        if (delta >= -1) return 11;
        if (delta >= -3) return 7;
        return 3; // under-experienced
    }

    private static int LocationScore(Candidate candidate, Job job)
    {
        var jobLoc = (job.Location ?? "").Trim();
        if (string.IsNullOrEmpty(jobLoc)) return 3;
        if (jobLoc.Contains("remote", StringComparison.OrdinalIgnoreCase)) return 5;

        var candLoc = $"{candidate.City} {candidate.State}".Trim();
        if (string.IsNullOrWhiteSpace(candLoc) || candLoc == "Unknown") return 2;

        if (candLoc.Contains(jobLoc, StringComparison.OrdinalIgnoreCase) ||
            jobLoc.Contains(candidate.City ?? "", StringComparison.OrdinalIgnoreCase) ||
            jobLoc.Contains(candidate.State ?? "", StringComparison.OrdinalIgnoreCase))
            return 5;

        return 1;
    }

    private static int? ExtractYears(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var m = Regex.Match(text, @"(\d+)\s*\+?\s*(?:years?|yrs?)", RegexOptions.IgnoreCase);
        if (m.Success && int.TryParse(m.Groups[1].Value, out var y)) return y;
        // bare number like "5+" 
        m = Regex.Match(text, @"(\d+)\+");
        if (m.Success && int.TryParse(m.Groups[1].Value, out y)) return y;
        return null;
    }

    private static List<string> Tokenize(string text) =>
        Regex.Split(text.ToLowerInvariant(), @"[^a-z0-9+#.\-]+")
            .Where(t => t.Length > 1 && !StopWords.Contains(t))
            .Distinct()
            .ToList();

    private static List<string> ExtractKeywords(string text)
    {
        // tech-ish tokens from free text (2+ chars, not stopwords)
        return Regex.Split(text ?? "", @"[^a-zA-Z0-9+#.\-]+")
            .Where(t => t.Length >= 2 && t.Length <= 24 && !StopWords.Contains(t))
            .Where(t => t.Any(char.IsLetter))
            .Select(t => t.Trim('.'))
            .Where(t => t.Length >= 2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToList();
    }
}
