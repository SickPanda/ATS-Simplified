import { switchUnit, margin, marginPercent, markupPercent, money, unitSuffix, HOURLY, ANNUAL, isAnnual } from '../lib/rates';

/**
 * Bill + Pay + Hourly/Annual toggle with live margin (staffing standard).
 * Props: billRate, payRate, rateUnit, onChange({ billRate, payRate, rateUnit })
 */
export default function RateFields({ billRate, payRate, rateUnit = HOURLY, onChange, required = false, compact = false }) {
  const unit = isAnnual(rateUnit) ? ANNUAL : HOURLY;
  const bill = Number(billRate) || 0;
  const pay = Number(payRate) || 0;
  const m = margin(bill, pay);
  const mp = marginPercent(bill, pay);
  const mk = markupPercent(bill, pay);
  const suffix = unitSuffix(unit);

  const setUnit = (next) => {
    if (next === unit) return;
    const converted = switchUnit(bill, pay, unit, next);
    onChange(converted);
  };

  const grid = compact
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em' }}>
          BILL &amp; PAY RATES
        </div>
        <div className="tab-bar" style={{ padding: 2 }}>
          <button type="button" className={`tab${unit === HOURLY ? ' active' : ''}`} onClick={() => setUnit(HOURLY)}>
            Hourly
          </button>
          <button type="button" className={`tab${unit === ANNUAL ? ' active' : ''}`} onClick={() => setUnit(ANNUAL)}>
            Annual
          </button>
        </div>
      </div>

      <div style={grid}>
        <div>
          <label className="label">BILL RATE (${suffix.slice(1).toUpperCase()}) {required ? '*' : ''}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            required={required}
            placeholder={unit === ANNUAL ? 'e.g. 180000' : 'e.g. 120'}
            value={billRate === 0 || billRate === '0' ? billRate : (billRate ?? '')}
            onChange={(e) => onChange({ billRate: e.target.value, payRate, rateUnit: unit })}
          />
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>Client / VMS bill-out</div>
        </div>
        <div>
          <label className="label">PAY RATE (${suffix.slice(1).toUpperCase()}) {required ? '*' : ''}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            required={required}
            placeholder={unit === ANNUAL ? 'e.g. 140000' : 'e.g. 85'}
            value={payRate === 0 || payRate === '0' ? payRate : (payRate ?? '')}
            onChange={(e) => onChange({ billRate, payRate: e.target.value, rateUnit: unit })}
          />
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>Candidate / vendor pay</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.04em' }}>MARGIN $</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: m >= 0 ? 'var(--emerald)' : 'var(--rose)', marginTop: 2 }}>
            ${money(m)}{suffix}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.04em' }}>MARGIN %</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{mp}%</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.04em' }}>MARKUP %</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{mk}%</div>
        </div>
      </div>

      {bill > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.45 }}>
          {unit === HOURLY
            ? `Annual equiv: Bill $${money(bill * 2080, 0)}/yr · Pay $${money(pay * 2080, 0)}/yr (× 2080 hrs)`
            : `Hourly equiv: Bill $${money(bill / 2080)}/hr · Pay $${money(pay / 2080)}/hr (÷ 2080 hrs)`}
        </div>
      )}
    </div>
  );
}

/** Read-only bill/pay/margin chip for lists & headers */
export function RateBadge({ billRate, payRate, rateUnit = HOURLY, showBoth = true }) {
  const unit = isAnnual(rateUnit) ? ANNUAL : HOURLY;
  const bill = Number(billRate) || 0;
  const pay = Number(payRate) || 0;
  const m = margin(bill, pay);
  const mp = marginPercent(bill, pay);
  const s = unitSuffix(unit);

  if (!showBoth && bill <= 0 && pay <= 0) {
    return <span style={{ color: 'var(--text-4)', fontSize: 12 }}>Rates not set</span>;
  }

  return (
    <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45 }}>
      <span>Bill <strong style={{ color: 'var(--text-1)' }}>${money(bill)}{s}</strong></span>
      <span style={{ margin: '0 6px', color: 'var(--text-4)' }}>·</span>
      <span>Pay <strong style={{ color: 'var(--text-1)' }}>${money(pay)}{s}</strong></span>
      <span style={{ margin: '0 6px', color: 'var(--text-4)' }}>·</span>
      <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>
        ${money(m)}{s} ({mp}%)
      </span>
    </div>
  );
}
