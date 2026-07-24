/**
 * Single source of truth for hiring-stage colors.
 * Progression = stone → Aegean navy → orichalcum gold → emerald triumph.
 * Includes client submittal as its own step before interview/offer.
 */
export const STAGES = [
  {
    id: 'Applied',
    label: 'Applied',
    step: 1,
    colorHex: '#7a8494',
    softHex: '#eef0f3',
  },
  {
    id: 'Screened',
    label: 'Screened',
    step: 2,
    colorHex: '#4a6fa5',
    softHex: '#e8eef6',
  },
  {
    id: 'Submitted',
    label: 'Submitted to Client',
    step: 3,
    colorHex: '#2c5282',
    softHex: '#e2ebf5',
  },
  {
    id: 'Interview',
    label: 'Client Interview',
    step: 4,
    colorHex: '#1a365d',
    softHex: '#dce6f2',
  },
  {
    id: 'Offer',
    label: 'Offer',
    step: 5,
    colorHex: '#c9a227',
    softHex: '#faf3d9',
  },
  {
    id: 'Hired',
    label: 'Hired',
    step: 6,
    colorHex: '#1a6b4a',
    softHex: '#d8f3e7',
  },
  {
    id: 'Rejected',
    label: 'Rejected',
    step: 0,
    colorHex: '#9ca3af',
    softHex: '#f3f4f6',
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
