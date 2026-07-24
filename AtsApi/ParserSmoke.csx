using AtsApi.Services;
var text = @"
Jane Marie Doe
Senior Frontend Engineer
jane.doe@email.com | (555) 987-6543 | Austin, TX
H1B Visa

Summary
7+ years of experience building React and TypeScript applications.

Skills
React, TypeScript, JavaScript, CSS, Next.js, Redux, Node.js, AWS

Experience
Senior Frontend Engineer at Acme — 2019-2025

Education
B.S. Computer Science, UT Austin
";
var c = LocalResumeParser.Parse(text);
Console.WriteLine($"Name={c.Name}");
Console.WriteLine($"Role={c.Role}");
Console.WriteLine($"Email={c.Email}");
Console.WriteLine($"Phone={c.Phone}");
Console.WriteLine($"Exp={c.Experience}");
Console.WriteLine($"City={c.City} State={c.State}");
Console.WriteLine($"Auth={c.WorkAuthorization}");
Console.WriteLine($"Skills={c.SkillsJson}");
Console.WriteLine($"Edu={c.Education}");
