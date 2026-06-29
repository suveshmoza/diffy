import { IconAlertSquareRounded, IconX } from '@tabler/icons-react';

type NotificationErrorBarProps = {
  message: string;
  onDismiss: () => void;
};

export function NotificationErrorBar({ message, onDismiss }: NotificationErrorBarProps) {
  return (
    <div
      className='gprv-notification-error'
      role='alert'
    >
      <div className='gprv-notification-error-content'>
        <IconAlertSquareRounded
          size={24}
          stroke={2}
          aria-hidden
        />
        <p className='gprv-notification-error-text'>{message}</p>
      </div>
      <button
        className='gprv-notification-dismiss'
        type='button'
        onClick={onDismiss}
        aria-label='Dismiss'
      >
        <IconX
          size={14}
          stroke={2}
        />
      </button>
    </div>
  );
}
