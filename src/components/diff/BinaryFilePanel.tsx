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
      className='gprv-media-panel'
      role='region'
      aria-label={`${path} binary file (${formatFileChangeStatus(file.status)})`}
    >
      <div className='gprv-media-panel-body gprv-media-panel-body-centered'>
        <p className='gprv-media-panel-message'>
          This is a binary file and can’t be previewed in Diffy yet.
        </p>
        <p className='gprv-media-panel-hint'>
          PDFs and other non-image binaries open on GitHub for now.
        </p>
        <a
          className='gprv-media-panel-link'
          href={githubUrl}
          target='_blank'
          rel='noreferrer noopener'
        >
          Open on GitHub
        </a>
      </div>
    </div>
  );
}
