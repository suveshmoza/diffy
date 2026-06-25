type ReviewProgressProps = {
  viewed: number;
  total: number;
  onJumpToNextUnviewed: () => void;
};

export function ReviewProgress({ viewed, total, onJumpToNextUnviewed }: ReviewProgressProps) {
  if (total === 0) {
    return null;
  }

  const isComplete = viewed >= total;
  const percent = Math.round((viewed / total) * 100);

  return (
    <button
      type='button'
      className={`gprv-review-progress${isComplete ? ' gprv-review-progress-complete' : ''}`}
      onClick={onJumpToNextUnviewed}
      disabled={isComplete}
      title={isComplete ? 'All files viewed' : 'Jump to next unviewed file'}
    >
      <span className='gprv-review-progress-track'>
        <span
          className='gprv-review-progress-fill'
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className='gprv-review-progress-label'>
        {viewed} / {total} viewed
      </span>
    </button>
  );
}
