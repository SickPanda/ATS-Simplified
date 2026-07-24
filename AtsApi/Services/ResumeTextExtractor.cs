using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;

namespace AtsApi.Services;

/// <summary>
/// Cross-platform text extraction — no Pdfium / System.Drawing (Azure Linux safe).
/// </summary>
public static class ResumeTextExtractor
{
    public static async Task<string> ExtractAsync(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        await using var stream = file.OpenReadStream();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        ms.Position = 0;

        return ext switch
        {
            ".docx" => ExtractDocx(ms),
            ".pdf" => ExtractPdf(ms),
            ".txt" => await ReadText(ms),
            _ => throw new InvalidOperationException("Unsupported file type. Use PDF, DOCX, or TXT.")
        };
    }

    public static string ExtractDocx(Stream stream)
    {
        using var wordDoc = WordprocessingDocument.Open(stream, false);
        var body = wordDoc.MainDocumentPart?.Document.Body;
        return body?.InnerText ?? "";
    }

    public static string ExtractPdf(Stream stream)
    {
        using var doc = PdfDocument.Open(stream);
        var parts = new List<string>();
        foreach (var page in doc.GetPages())
        {
            var t = page.Text;
            if (!string.IsNullOrWhiteSpace(t)) parts.Add(t);
        }
        return string.Join("\n", parts);
    }

    private static async Task<string> ReadText(Stream stream)
    {
        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync();
    }
}
