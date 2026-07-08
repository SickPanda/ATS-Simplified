using System.IO;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
class Program {
    static void Main() {
        using (PdfWriter writer = new PdfWriter("test.pdf"))
        using (PdfDocument pdf = new PdfDocument(writer))
        using (Document document = new Document(pdf))
        {
            document.Add(new Paragraph("John Doe, Software Engineer, 5 years experience, john@doe.com"));
        }
    }
}
