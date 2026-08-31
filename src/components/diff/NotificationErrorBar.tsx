import { IconWarningOctogonFill, IconX } from '@pierre/icons';

import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotificationErrorBarProps = {
  message: string;
  onDismiss: () => void;
};

export function NotificationErrorBar({ message, onDismiss }: NotificationErrorBarProps) {
  return (
    <Alert
      variant='destructive'
      className={cn(
        'shrink-0 rounded-none border-0 border-b border-destructive/25 bg-destructive/10 py-1.5 pr-2 pl-3',
      )}
    >
      <IconWarningOctogonFill aria-hidden='true' />
      <AlertDescription className='min-w-0 truncate text-xs'>{message}</AlertDescription>
      <AlertAction>
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          className='text-destructive hover:bg-destructive/10 hover:text-destructive'
          onClick={onDismiss}
          aria-label='Dismiss'
        >
          <IconX size={14} />
        </Button>
      </AlertAction>
    </Alert>
  );
}
