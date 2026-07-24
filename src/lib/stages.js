/**
 * Single source of truth for hiring-stage colors.
 * Progression = blue ladder → green hire → gray out.
 * Includes client submittal as its own step before interview/offer.
 */
export const STAGES = [
  {
    id: 'Applied',
    label: 'Applied',
    step: 1,
    colorHex: '#64748b',
    softHex: '#f1f5f9',
  },
  {
    id: 'Screened',
    label: 'Screened',
    step: 2,
    colorHex: '#60a5fa',
    softHex: '#eff6ff',
  },
  {
    id: 'Submitted',
    label: 'Submitted to Client',
    step: 3,
    colorHex: '#3b82f6',
    softHex: '#dbeafe',
  },
  {
    id: 'Interview',
    label: 'Client Interview',
    step: 4,
    colorHex: '#1d4ed8',
    softHex: '#dbeafe',
  },
  {
    id: 'Offer',
    label: 'Offer',
    step: 5,
    colorHex: '#1e3a8a',
    softHex: '#e0e7ff',
  },
  {
    id: 'Hired',
    label: 'Hired',
    step: 6,
    colorHex: '#047857',
    softHex: '#d1fae5',
  },
  {
    id: 'Rejected',
    label: 'Rejected',
    step: 0,
    colorHex: '#94a3b8',
    softHex: '#f8fafc',
  },
];

export const ACTIVE_STEPS = 6;

/** Pipeline progression without Rejected */
export const PIPELINE_STAGE_IDS = STAGES.filter(s => s.id !== 'Rejected').map(s => s.id);

export function getStage(id) {
  // Legacy alias if any UI used longer names
  if (id === 'Submitted to Client' || id === 'ClientSubmit') id = 'Submitted';
  if (id === 'Client Interview') id = 'Interview';
  return STAGES.find(s => s.id === id) || STAGES[0];
}

/** Hex array for charts (recharts) — exclude Rejected */
export const STAGE_CHART_COLORS = STAGES.filter(s => s.id !== 'Rejected').map(s => s.colorHex);
