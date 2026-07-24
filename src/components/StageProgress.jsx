import { getStage, ACTIVE_STEPS } from '../lib/stages';

/** 5-block progress: fill up to current stage (Rejected = empty muted) */
export default function StageProgress({ stageId, size = 8 }) {
  const stage = getStage(stageId);
  const isRejected = stage.id === 'Rejected';
  const filled = isRejected ? 0 : stage.step;

  return (
    <div
      title={`${stage.label}${isRejected ? '' : ` · step ${stage.step} of ${ACTIVE_STEPS}`}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
    >
      {Array.from({ length: ACTIVE_STEPS }, (_, i) => {
        const n = i + 1;
        const on = !isRejected && n <= filled;
        return (
          <span
            key={n}
            style={{
              width: size,
              height: size,
              borderRadius: 2,
              background: isRejected
                ? stage.colorHex
                : on
                  ? stage.colorHex
                  : 'var(--surface-3)',
              opacity: isRejected ? 0.45 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
