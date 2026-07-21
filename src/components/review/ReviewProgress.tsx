type ReviewProgressProps = {
  viewed: number;
  total: number;
  onJumpToNextUnviewed: () => void;
};

const CIRCLE_SIZE = 12;
const CIRCLE_STROKE = 2.5;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export function ReviewProgress({ viewed, total, onJumpToNextUnviewed }: ReviewProgressProps) {
  if (total === 0) {
    return null;
  }

  const isComplete = viewed >= total;
  const percent = Math.round((viewed / total) * 100);
  const circleOffset = CIRCLE_CIRCUMFERENCE * (1 - percent / 100);

  return (
    <button
      type='button'
      className={`gprv-review-progress${isComplete ? ' gprv-review-progress-complete' : ''}`}
      onClick={onJumpToNextUnviewed}
      disabled={isComplete}
      title={isComplete ? 'All files viewed' : 'Jump to next unviewed file'}
      aria-label={`${viewed} of ${total} files viewed`}
    >
      <span className='gprv-review-progress-track'>
        <span
          className='gprv-review-progress-fill'
          style={{ width: `${percent}%` }}
        />
      </span>
      <svg
        className='gprv-review-progress-circle'
        width={CIRCLE_SIZE}
        height={CIRCLE_SIZE}
        viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
        aria-hidden='true'
      >
        <circle
          className='gprv-review-progress-circle-track'
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={CIRCLE_RADIUS}
          fill='none'
          strokeWidth={CIRCLE_STROKE}
        />
        <circle
          className='gprv-review-progress-circle-fill'
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={CIRCLE_RADIUS}
          fill='none'
          strokeWidth={CIRCLE_STROKE}
          strokeLinecap='round'
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={circleOffset}
          transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
        />
      </svg>
      <span className='gprv-review-progress-label'>
        {viewed} / {total} viewed
      </span>
    </button>
  );
}
