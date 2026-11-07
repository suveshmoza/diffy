import { cn } from '@/shared/utils';

function toAvatarSrc(url: string) {
  try {
    const next = new URL(url);
    next.searchParams.set('s', '16');
    return next.toString();
  } catch {
    return url;
  }
}

export function AuthorAvatar({ login, src }: { login: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const base = 'size-4 shrink-0 rounded-full ring-1 ring-sidebar-border';

  // Fallback: first letter on a neutral disc, for missing or broken avatars.
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn(
          base,
          'flex items-center justify-center bg-muted text-[9px] font-medium uppercase text-muted-foreground',
        )}
      >
        {login.charAt(0)}
      </span>
    );
  }

  return (
    <img
      src={toAvatarSrc(src)}
      alt=''
      width={16}
      height={16}
      loading='lazy'
      className={base}
      onError={() => setFailed(true)}
    />
  );
}
