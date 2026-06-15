import { type SubmitEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import logoUrl from '@/assets/logo.png';

import './style.css';

function PopupApp() {
  const [token, setToken] = useState('');
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!browser?.storage?.sync) {
      return;
    }

    browser.storage.sync
      .get('githubToken')
      .then((stored) => {
        if (typeof stored.githubToken === 'string' && stored.githubToken.trim()) {
          setToken(stored.githubToken);
          setHasSavedToken(true);
        }
      })
      .catch(() => {});
  }, []);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!browser?.storage?.sync) {
      setStatus('Extension storage is unavailable.');
      return;
    }

    const trimmed = token.trim();
    if (!trimmed) {
      setStatus('Enter a token before saving.');
      return;
    }

    await browser.storage.sync.set({ githubToken: trimmed });
    setHasSavedToken(true);
    setStatus('Saved. Reload open PR tabs to apply.');
  }

  async function clear() {
    if (!browser?.storage?.sync) {
      setStatus('Extension storage is unavailable.');
      return;
    }

    await browser.storage.sync.remove('githubToken');
    setToken('');
    setHasSavedToken(false);
    setStatus('Token cleared.');
  }

  return (
    <main>
      <header className='header'>
        <img
          className='logo'
          src={logoUrl}
          alt=''
          width={36}
          height={36}
        />
        <div className='header-copy'>
          <h1>diffy</h1>
          <p className='tagline'>Better PR diffs on GitHub</p>
        </div>
      </header>

      <p className='intro'>
        Open a pull request and click <strong>View Diff</strong> in the PR header.
      </p>

      <section className='card'>
        <div className='card-header'>
          <h2>GitHub token</h2>
          <span className={`badge${hasSavedToken ? ' badge-saved' : ''}`}>
            {hasSavedToken ? 'Saved' : 'Optional'}
          </span>
        </div>
        <p className='card-copy'>For private repos or higher API rate limits.</p>

        <form onSubmit={save}>
          <label
            className='sr-only'
            htmlFor='github-token'
          >
            GitHub token
          </label>
          <input
            id='github-token'
            type='password'
            value={token}
            placeholder='github_pat_…'
            onChange={(event) => setToken(event.currentTarget.value)}
            autoComplete='off'
            spellCheck={false}
          />
          <div className='actions'>
            <button type='submit'>Save</button>
            <button
              type='button'
              className='button-secondary'
              onClick={clear}
              disabled={!token && !hasSavedToken}
            >
              Clear
            </button>
          </div>
        </form>

        {status ? <p className='status'>{status}</p> : null}
        <p className='hint'>
          Needs pull request write access (repo or public_repo scope) to post comments.
        </p>
      </section>

      <a
        className='footer-link'
        href='https://github.com/pulls'
        target='_blank'
        rel='noreferrer'
      >
        Open GitHub pulls
      </a>

      <p className='powered-by'>
        Powered by{' '}
        <a
          href='https://trees.software'
          target='_blank'
          rel='noreferrer'
        >
          Pierre Trees
        </a>{' '}
        &{' '}
        <a
          href='https://diffs.com'
          target='_blank'
          rel='noreferrer'
        >
          Pierre Diffs
        </a>
      </p>
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<PopupApp />);
}
