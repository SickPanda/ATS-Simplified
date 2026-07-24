namespace AtsApi.Services;

/// <summary>Persistent file storage for resumes/docs (DATA_DIR-aware for Azure Free).</summary>
public static class DocumentStorage
{
    public static string GetRoot(IWebHostEnvironment env)
    {
        var dataDir = Environment.GetEnvironmentVariable("DATA_DIR");
        if (!string.IsNullOrWhiteSpace(dataDir))
        {
            var root = Path.Combine(dataDir, "resumes");
            Directory.CreateDirectory(root);
            return root;
        }

        var www = Path.Combine(env.ContentRootPath, "wwwroot", "resumes");
        Directory.CreateDirectory(www);
        return www;
    }

    public static string PathFor(IWebHostEnvironment env, string storedName) =>
        Path.Combine(GetRoot(env), storedName);

    public static async Task<(string storedName, long size)> SaveAsync(
        IWebHostEnvironment env,
        IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(ext)) ext = ".bin";
        var stored = Guid.NewGuid().ToString("N") + ext.ToLowerInvariant();
        var path = PathFor(env, stored);
        await using var fs = new FileStream(path, FileMode.Create);
        await file.CopyToAsync(fs);
        return (stored, file.Length);
    }

    public static void TryDelete(IWebHostEnvironment env, string? storedName)
    {
        if (string.IsNullOrWhiteSpace(storedName)) return;
        try
        {
            var path = PathFor(env, storedName);
            if (File.Exists(path)) File.Delete(path);
        }
        catch { /* ignore */ }
    }

    public static string? StoredNameFromPublicPath(string? resumeFilePath)
    {
        if (string.IsNullOrWhiteSpace(resumeFilePath)) return null;
        // "/resumes/guid.pdf" → "guid.pdf"
        var name = resumeFilePath.Replace('\\', '/').Split('/').LastOrDefault();
        return string.IsNullOrWhiteSpace(name) ? null : name;
    }
}
