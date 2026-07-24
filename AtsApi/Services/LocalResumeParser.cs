using System.Text.Json;
using System.Text.RegularExpressions;
using AtsApi.Models;

namespace AtsApi.Services;

/// <summary>
/// ATS Pro Intelligence — in-app resume engine. No external AI APIs.
/// Runs entirely on the server (Azure Free F1 safe).
/// </summary>
public static class LocalResumeParser
{
    public record WorkHistoryItem(string Title, string Company, string Dates, string Highlights);
    public record ParseResult(
        Candidate Candidate,
        int Confidence,
        string Summary,
        string? LinkedIn,
        string? GitHub,
        List<WorkHistoryItem> WorkHistory,
        string Engine = "ATS Pro Intelligence"
    );

    private static readonly string[] SkillCatalog =
    {
        "C#", "C++", "Java", "Python", "JavaScript", "TypeScript", "Go", "Golang", "Rust", "Kotlin", "Swift",
        "Ruby", "PHP", "Scala", "R", "MATLAB", "SQL", "T-SQL", "PL/SQL", "Bash", "PowerShell",
        "React", "React.js", "ReactJS", "Angular", "Vue", "Vue.js", "Next.js", "Nuxt", "Svelte", "Redux",
        "HTML", "CSS", "SASS", "SCSS", "Tailwind", "Bootstrap", "Material UI", "jQuery", "Webpack", "Vite",
        ".NET", ".NET Core", "ASP.NET", "ASP.NET Core", "Entity Framework", "Node.js", "Express", "NestJS",
        "Spring", "Spring Boot", "Django", "Flask", "FastAPI", "Rails", "Laravel", "GraphQL", "REST", "gRPC",
        "Azure", "AWS", "GCP", "Google Cloud", "Docker", "Kubernetes", "K8s", "Terraform", "Ansible",
        "Jenkins", "GitHub Actions", "GitLab CI", "CI/CD", "Linux", "Nginx", "Helm", "Prometheus", "Grafana",
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Kafka", "RabbitMQ", "Spark", "Hadoop",
        "Snowflake", "Databricks", "Airflow", "dbt", "Power BI", "Tableau", "Pandas", "NumPy", "TensorFlow",
        "PyTorch", "Machine Learning", "LLM", "OpenAI", "RAG",
        "Android", "iOS", "React Native", "Flutter", "Xamarin", "MAUI",
        "Figma", "UI/UX", "UX", "UI", "Sketch", "Adobe XD", "Prototyping", "Wireframing", "Design Systems",
        "User Research", "Product Management", "Agile", "Scrum", "Jira", "Confluence",
        "Selenium", "Cypress", "Playwright", "Jest", "xUnit", "NUnit", "OWASP", "Penetration Testing",
        "Salesforce", "ServiceNow", "SAP", "Oracle", "Dynamics 365", "SharePoint", "Workday"
    };

    private static readonly string[] RoleKeywords =
    {
        "software engineer", "senior software engineer", "staff engineer", "principal engineer",
        "frontend engineer", "front-end engineer", "front end engineer", "backend engineer", "back-end engineer",
        "full stack", "fullstack", "full-stack", "devops engineer", "sre", "site reliability",
        "data engineer", "data scientist", "machine learning engineer", "ml engineer", "ai engineer",
        "product designer", "ui/ux designer", "ux designer", "ui designer", "product manager",
        "project manager", "program manager", "qa engineer", "sdet", "test engineer",
        "cloud engineer", "solutions architect", "software architect", "tech lead", "engineering manager",
        "business analyst", "scrum master", "ios developer", "android developer", "mobile developer",
        "react developer", "java developer", ".net developer", "python developer", "node developer",
        "consultant", "contractor", "intern", "analyst", "developer", "engineer", "architect", "designer"
    };

    private static readonly HashSet<string> HeaderNoise = new(StringComparer.OrdinalIgnoreCase)
    {
        "resume", "curriculum vitae", "cv", "profile", "summary", "objective", "experience",
        "work experience", "professional experience", "education", "skills", "technical skills",
        "projects", "certifications", "contact", "references", "linkedin", "github", "portfolio",
        "professional summary", "about me", "employment history"
    };

    public static Candidate Parse(string rawText, string source = "ATS Pro Intelligence")
        => ParseDetailed(rawText, source).Candidate;

    public static ParseResult ParseDetailed(string rawText, string source = "ATS Pro Intelligence")
    {
        var text = Normalize(rawText);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(l => l.Length > 0)
            .ToList();

        var email = ExtractEmail(text);
        var phone = ExtractPhone(text);
        var name = ExtractName(lines, email);
        var role = ExtractRole(text, lines);
        var experience = ExtractExperience(text);
        var education = ExtractEducation(text, lines);
        var (city, state) = ExtractLocation(text, lines);
        var workAuth = ExtractWorkAuth(text);
        var skills = ExtractSkills(text);
        var summary = ExtractSummary(text, lines);
        var linkedIn = ExtractUrl(text, "linkedin.com");
        var github = ExtractUrl(text, "github.com");
        var history = ExtractWorkHistory(text, lines);

        // If role still generic but history has titles, use latest title
        if ((role is "Professional" or "Unknown") && history.Count > 0 && !string.IsNullOrWhiteSpace(history[0].Title))
            role = history[0].Title;

        var candidate = new Candidate
        {
            Name = string.IsNullOrWhiteSpace(name) ? "Unknown Candidate" : name,
            Role = string.IsNullOrWhiteSpace(role) ? "Professional" : role,
            Experience = experience,
            Email = email,
            Phone = phone,
            Education = education,
            City = city,
            State = state,
            WorkAuthorization = workAuth,
            Source = source,
            Status = "Active",
            Ownership = "Aazam Qureshi",
            SkillsJson = JsonSerializer.Serialize(skills),
            CreatedAt = DateTime.UtcNow
        };

        var confidence = ScoreConfidence(candidate, skills.Count, history.Count, summary, linkedIn);
        return new ParseResult(candidate, confidence, summary, linkedIn, github, history);
    }

    public static int ScoreConfidence(Candidate c, int skillCount, int jobCount, string summary, string? linkedIn)
    {
        int score = 20; // base for extracting any text
        if (!string.IsNullOrWhiteSpace(c.Name) && c.Name != "Unknown Candidate") score += 15;
        if (!string.IsNullOrWhiteSpace(c.Email) && c.Email.Contains('@')) score += 18;
        if (!string.IsNullOrWhiteSpace(c.Phone) && c.Phone.Length >= 10) score += 8;
        if (!string.IsNullOrWhiteSpace(c.Role) && c.Role != "Professional") score += 10;
        if (!string.IsNullOrWhiteSpace(c.Experience) && !c.Experience.Contains("Not specified")) score += 8;
        if (skillCount >= 3) score += 10;
        else if (skillCount >= 1) score += 5;
        if (!string.IsNullOrWhiteSpace(c.Education) && !c.Education.Contains("Not specified")) score += 5;
        if (!string.IsNullOrWhiteSpace(c.City) || !string.IsNullOrWhiteSpace(c.State)) score += 4;
        if (!string.IsNullOrWhiteSpace(c.WorkAuthorization) && c.WorkAuthorization != "Not specified") score += 6;
        if (jobCount >= 1) score += 6;
        if (!string.IsNullOrWhiteSpace(summary) && summary.Length > 40) score += 4;
        if (!string.IsNullOrWhiteSpace(linkedIn)) score += 3;
        return Math.Clamp(score, 0, 100);
    }

    public static string Normalize(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        text = text.Replace("\r\n", "\n").Replace('\r', '\n');
        text = Regex.Replace(text, @"[ \t]+", " ");
        text = Regex.Replace(text, @"\n{3,}", "\n\n");
        return text.Trim();
    }

    private static string ExtractEmail(string text)
    {
        var m = Regex.Match(text, @"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}");
        return m.Success ? m.Value : "";
    }

    private static string ExtractPhone(string text)
    {
        var patterns = new[]
        {
            @"(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
            @"\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}"
        };
        foreach (var p in patterns)
        {
            var m = Regex.Match(text, p);
            if (m.Success)
            {
                var digits = new string(m.Value.Where(char.IsDigit).ToArray());
                if (digits.Length >= 10) return m.Value.Trim();
            }
        }
        return "";
    }

    private static string? ExtractUrl(string text, string host)
    {
        var m = Regex.Match(text, $@"https?://(?:www\.)?{Regex.Escape(host)}/[^\s\]\)]+", RegexOptions.IgnoreCase);
        if (m.Success) return m.Value.TrimEnd('.', ',', ';');
        m = Regex.Match(text, $@"(?:www\.)?{Regex.Escape(host)}/[^\s\]\)]+", RegexOptions.IgnoreCase);
        if (m.Success) return "https://" + m.Value.TrimEnd('.', ',', ';');
        return null;
    }

    private static string ExtractName(List<string> lines, string email)
    {
        foreach (var line in lines.Take(12))
        {
            if (HeaderNoise.Contains(line)) continue;
            if (line.Contains('@')) continue;
            if (Regex.IsMatch(line, @"https?://|www\.|linkedin\.com|github\.com", RegexOptions.IgnoreCase)) continue;
            if (Regex.IsMatch(line, @"\d{3}[-.\s]?\d{3}")) continue;
            if (line.Length < 3 || line.Length > 60) continue;
            if (line.Split(' ').Length is < 2 or > 5) continue;
            if (Regex.IsMatch(line, @"^[A-Z][a-z]+(\s+[A-Z][a-z'\-]+)+$") ||
                Regex.IsMatch(line, @"^[A-Z][A-Z\s'\-]{2,}$"))
            {
                return System.Globalization.CultureInfo.CurrentCulture.TextInfo
                    .ToTitleCase(line.ToLowerInvariant());
            }
        }

        if (!string.IsNullOrEmpty(email) && email.Contains('@'))
        {
            var local = email.Split('@')[0].Replace('.', ' ').Replace('_', ' ').Replace('-', ' ');
            return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(local);
        }

        return lines.FirstOrDefault(l => l.Length is >= 3 and <= 40 && !l.Contains('@')) ?? "Unknown";
    }

    private static string ExtractRole(string text, List<string> lines)
    {
        var lower = text.ToLowerInvariant();
        string? best = null;
        int bestLen = 0;
        foreach (var kw in RoleKeywords.OrderByDescending(k => k.Length))
        {
            if (lower.Contains(kw) && kw.Length > bestLen)
            {
                best = kw;
                bestLen = kw.Length;
            }
        }

        if (best != null)
            return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(best);

        foreach (var line in lines.Skip(1).Take(8))
        {
            if (line.Length is >= 5 and <= 50 &&
                Regex.IsMatch(line, @"(?i)(engineer|developer|designer|manager|architect|analyst|consultant)"))
                return line;
        }

        return "Professional";
    }

    private static string ExtractExperience(string text)
    {
        var m = Regex.Match(text, @"(?i)(\d{1,2})\s*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?");
        if (m.Success) return $"{m.Groups[1].Value}+ years";

        var years = Regex.Matches(text, @"\b(20\d{2}|19\d{2})\b")
            .Select(x => int.Parse(x.Value))
            .Where(y => y >= 1990 && y <= DateTime.UtcNow.Year + 1)
            .Distinct()
            .OrderBy(y => y)
            .ToList();
        if (years.Count >= 2)
        {
            var span = years.Max() - years.Min();
            if (span is >= 1 and <= 40) return $"~{span} years (estimated)";
        }

        return "Not specified";
    }

    private static string ExtractEducation(string text, List<string> lines)
    {
        var degreePatterns = new[]
        {
            @"(?i)\b(Ph\.?D\.?|Doctorate)\b[^\n]{0,80}",
            @"(?i)\b(M\.?S\.?|M\.?Sc\.?|MBA|Master(?:'s)?(?: of [A-Za-z ]+)?)\b[^\n]{0,80}",
            @"(?i)\b(B\.?S\.?|B\.?Sc\.?|B\.?A\.?|B\.?Tech|Bachelor(?:'s)?(?: of [A-Za-z ]+)?)\b[^\n]{0,80}",
            @"(?i)\b(Associate(?:'s)?|A\.?S\.?)\b[^\n]{0,60}"
        };
        foreach (var p in degreePatterns)
        {
            var m = Regex.Match(text, p);
            if (m.Success) return Regex.Replace(m.Value.Trim(), @"\s+", " ");
        }

        var eduIdx = lines.FindIndex(l => l.Equals("Education", StringComparison.OrdinalIgnoreCase));
        if (eduIdx >= 0 && eduIdx + 1 < lines.Count)
            return lines[eduIdx + 1];

        return "Not specified";
    }

    private static (string City, string State) ExtractLocation(string text, List<string> lines)
    {
        var m = Regex.Match(text, @"\b([A-Z][a-zA-Z\.\s]{1,30}),\s*([A-Z]{2})\b");
        if (m.Success)
            return (m.Groups[1].Value.Trim(), m.Groups[2].Value.Trim());

        if (Regex.IsMatch(text, @"(?i)\bremote\b"))
            return ("Remote", "");

        foreach (var line in lines.Take(15))
        {
            m = Regex.Match(line, @"\b([A-Z][a-zA-Z\.\s]{1,30}),\s*([A-Z]{2})\b");
            if (m.Success) return (m.Groups[1].Value.Trim(), m.Groups[2].Value.Trim());
        }

        return ("", "");
    }

    private static string ExtractWorkAuth(string text)
    {
        var checks = new (string Pattern, string Label)[]
        {
            (@"(?i)\bUS\s*Citizen\b", "US Citizen"),
            (@"(?i)\bGreen\s*Card\b", "Green Card"),
            (@"(?i)\bH[- ]?1B\b", "H1B"),
            (@"(?i)\bEAD\b", "EAD"),
            (@"(?i)\bOPT\b", "OPT"),
            (@"(?i)\bCPT\b", "CPT"),
            (@"(?i)\bTN\s*Visa\b", "TN Visa"),
            (@"(?i)\bL[- ]?1\b", "L1"),
            (@"(?i)\bGC\b", "Green Card"),
            (@"(?i)\bauthorized to work\b", "Work Authorized"),
            (@"(?i)\bW2\b", "W2"),
            (@"(?i)\bC2C\b", "C2C"),
        };
        foreach (var (pattern, label) in checks)
            if (Regex.IsMatch(text, pattern)) return label;
        return "Not specified";
    }

    private static string ExtractSummary(string text, List<string> lines)
    {
        var m = Regex.Match(text,
            @"(?is)(?:professional\s+summary|summary|objective|profile)\s*[:\n]\s*(.+?)(?:\n\s*\n|experience|education|skills|work history|employment|$)");
        if (m.Success)
        {
            var s = Regex.Replace(m.Groups[1].Value, @"\s+", " ").Trim();
            if (s.Length > 30) return s.Length > 400 ? s[..400] + "…" : s;
        }

        // First paragraph-like block after name
        foreach (var line in lines.Skip(2).Take(6))
        {
            if (line.Length > 80 && !line.Contains('@') &&
                !Regex.IsMatch(line, @"(?i)^(skills|experience|education)"))
                return line.Length > 400 ? line[..400] + "…" : line;
        }

        return "";
    }

    private static List<WorkHistoryItem> ExtractWorkHistory(string text, List<string> lines)
    {
        var jobs = new List<WorkHistoryItem>();
        // Title at Company | 2020 – 2023  OR  Title — Company (2020-Present)
        var patterns = new[]
        {
            @"(?im)^(.{4,60}?)\s+(?:at|@|[-–—|])\s+(.{2,50}?)\s*[-–—|]?\s*((?:19|20)\d{2}\s*[-–—to]+\s*(?:Present|Current|(?:19|20)\d{2}))",
            @"(?im)^(.{4,60}?)\s*[-–—|]\s*(.{2,50}?)\s*\(((?:19|20)\d{2}\s*[-–—to]+\s*(?:Present|Current|(?:19|20)\d{2}))\)"
        };

        foreach (var p in patterns)
        {
            foreach (Match m in Regex.Matches(text, p))
            {
                var title = m.Groups[1].Value.Trim().Trim('-', '–', '—', '|');
                var company = m.Groups[2].Value.Trim().Trim('-', '–', '—', '|');
                var dates = m.Groups[3].Value.Trim();
                if (HeaderNoise.Contains(title)) continue;
                if (title.Length < 3 || company.Length < 2) continue;
                if (jobs.Any(j => j.Title.Equals(title, StringComparison.OrdinalIgnoreCase) &&
                                  j.Company.Equals(company, StringComparison.OrdinalIgnoreCase)))
                    continue;
                jobs.Add(new WorkHistoryItem(title, company, dates, ""));
                if (jobs.Count >= 6) return jobs;
            }
        }

        // Line-based: look for years on a line near a title keyword
        for (int i = 0; i < lines.Count - 1 && jobs.Count < 6; i++)
        {
            var line = lines[i];
            if (!Regex.IsMatch(line, @"(?i)(engineer|developer|manager|architect|analyst|designer|consultant|lead|director)"))
                continue;
            if (!Regex.IsMatch(line, @"\b(19|20)\d{2}\b") &&
                (i + 1 >= lines.Count || !Regex.IsMatch(lines[i + 1], @"\b(19|20)\d{2}\b")))
                continue;

            var datesMatch = Regex.Match(line + " " + (i + 1 < lines.Count ? lines[i + 1] : ""),
                @"((?:19|20)\d{2}\s*[-–—to]+\s*(?:Present|Current|(?:19|20)\d{2}))", RegexOptions.IgnoreCase);
            var dates = datesMatch.Success ? datesMatch.Groups[1].Value : "";
            var title = Regex.Replace(line, @"\b(19|20)\d{2}.*", "").Trim(' ', '-', '–', '—', '|');
            if (title.Length is < 4 or > 80) continue;
            if (jobs.Any(j => j.Title.Equals(title, StringComparison.OrdinalIgnoreCase))) continue;
            jobs.Add(new WorkHistoryItem(title, "", dates, ""));
        }

        return jobs;
    }

    private static List<string> ExtractSkills(string text)
    {
        var found = new List<string>();

        foreach (var skill in SkillCatalog.OrderByDescending(s => s.Length))
        {
            var pattern = $@"(?i)(?<![\w+#.]){Regex.Escape(skill)}(?![\w+#.])";
            if (skill is "C#" or ".NET" or ".NET Core" or "ASP.NET" or "ASP.NET Core")
                pattern = $@"(?i){Regex.Escape(skill)}";

            if (Regex.IsMatch(text, pattern) &&
                !found.Any(f => string.Equals(f, skill, StringComparison.OrdinalIgnoreCase)))
                found.Add(skill);
        }

        var skillsSection = Regex.Match(text,
            @"(?is)(?:technical\s+)?skills\s*[:\n](.+?)(?:\n\s*\n|experience|education|projects|certifications|work history|employment|$)");
        if (skillsSection.Success)
        {
            var chunk = skillsSection.Groups[1].Value;
            foreach (var token in Regex.Split(chunk, @"[,|/•·\n;]+"))
            {
                var t = token.Trim().Trim('-', '*', '•');
                if (t.Length is >= 2 and <= 32 &&
                    !found.Any(f => string.Equals(f, t, StringComparison.OrdinalIgnoreCase)) &&
                    Regex.IsMatch(t, @"^[A-Za-z0-9.#+\- ]+$") &&
                    SkillCatalog.Any(s => s.Contains(t, StringComparison.OrdinalIgnoreCase) ||
                                          t.Contains(s, StringComparison.OrdinalIgnoreCase)))
                    found.Add(t);
            }
        }

        return found.Take(30).ToList();
    }
}
