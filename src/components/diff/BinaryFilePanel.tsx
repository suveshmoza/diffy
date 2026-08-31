import { Button } from '@/components/ui/button';
import { formatFileChangeStatus } from '@/lib/diff/media-files';
import type { GitHubPullRequestFile } from '@/lib/github/api';
import { buildGitHubBlobUrl } from '@/lib/github/blobs';

type BinaryFilePanelProps = {
  file: GitHubPullRequestFile;
  owner: string;
  repo: string;
  baseSha: string;
  headSha: string;
};

export function BinaryFilePanel({ file, owner, repo, baseSha, headSha }: BinaryFilePanelProps) {
  const isDeleted = file.status === 'removed';
  const path = isDeleted ? (file.previous_filename ?? file.filename) : file.filename;
  const sha = isDeleted ? baseSha : headSha;
  const githubUrl = buildGitHubBlobUrl(owner, repo, sha, path);

  return (
    <div
      className='flex h-auto min-h-0 flex-col overflow-hidden bg-transparent'
      role='region'
      aria-label={`${path} binary file (${formatFileChangeStatus(file.status)})`}
    >
      <div className='flex min-h-full flex-1 flex-col items-center justify-center gap-1 overflow-auto p-4 text-center text-muted-foreground'>
        <p className='m-0 text-sm text-foreground'>
          File type not supported in Diffy.{' '}
          <Button
            variant='link'
            className='h-auto px-0 text-[13px] font-semibold'
            render={
              <a
                href={githubUrl}
                target='_blank'
                rel='noreferrer noopener'
              />
            }
          >
            Click here to open on GitHub
          </Button>
        </p>
      </div>
    </div>
  );
}
