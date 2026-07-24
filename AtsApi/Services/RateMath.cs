namespace AtsApi.Services;

/// <summary>
/// Staffing rate math — Ceipal-style bill + pay, hourly/annual, margin & markup.
/// Standard full-time year: 2080 hours (40 × 52).
/// </summary>
public static class RateMath
{
    public const decimal HoursPerYear = 2080m;
    public const string Hourly = "Hourly";
    public const string Annual = "Annual";

    public static bool IsAnnual(string? unit) =>
        string.Equals(unit, Annual, StringComparison.OrdinalIgnoreCase);

    public static decimal ToHourly(decimal amount, string? unit) =>
        IsAnnual(unit) ? amount / HoursPerYear : amount;

    public static decimal ToAnnual(decimal amount, string? unit) =>
        IsAnnual(unit) ? amount : amount * HoursPerYear;

    public static decimal Convert(decimal amount, string? fromUnit, string? toUnit)
    {
        if (string.Equals(fromUnit, toUnit, StringComparison.OrdinalIgnoreCase)) return amount;
        if (IsAnnual(toUnit)) return ToAnnual(amount, fromUnit);
        return ToHourly(amount, fromUnit);
    }

    public static decimal Margin(decimal bill, decimal pay) => bill - pay;

    public static decimal MarginPercent(decimal bill, decimal pay) =>
        bill <= 0 ? 0 : Math.Round((bill - pay) / bill * 100m, 2);

    /// <summary>Markup on pay: (bill - pay) / pay</summary>
    public static decimal MarkupPercent(decimal bill, decimal pay) =>
        pay <= 0 ? 0 : Math.Round((bill - pay) / pay * 100m, 2);

    public static object Snapshot(decimal bill, decimal pay, string? unit)
    {
        var u = string.IsNullOrWhiteSpace(unit) ? Hourly : unit;
        var billH = ToHourly(bill, u);
        var payH = ToHourly(pay, u);
        var billA = ToAnnual(bill, u);
        var payA = ToAnnual(pay, u);
        return new
        {
            rateUnit = IsAnnual(u) ? Annual : Hourly,
            billRate = bill,
            payRate = pay,
            margin = Margin(bill, pay),
            marginPercent = MarginPercent(bill, pay),
            markupPercent = MarkupPercent(bill, pay),
            billHourly = Math.Round(billH, 2),
            payHourly = Math.Round(payH, 2),
            marginHourly = Math.Round(Margin(billH, payH), 2),
            billAnnual = Math.Round(billA, 2),
            payAnnual = Math.Round(payA, 2),
            marginAnnual = Math.Round(Margin(billA, payA), 2),
            hoursPerYear = HoursPerYear
        };
    }
}
