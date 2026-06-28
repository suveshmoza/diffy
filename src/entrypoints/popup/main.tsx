import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader,
  IconLoader2,
  IconUser,
} from '@tabler/icons-react';
import { createRoot } from 'react-dom/client';

import logoUrl from '@/assets/logo.png';
import { usePopup } from '@/hooks/use-popup';
import {
  FINE_GRAINED_WARNING_DETAIL,
  FINE_GRAINED_WARNING_SUMMARY,
} from '@/lib/github/token-hints';

import './style.css';

function ViewedFilesTokenHint() {
  return (
    <p
      className='token-warning'
      role='note'
      title={FINE_GRAINED_WARNING_DETAIL}
    >
      <IconAlertTriangle
        size={14}
        stroke={2}
        aria-hidden
      />
      <span>{FINE_GRAINED_WARNING_SUMMARY}</span>
    </p>
  );
}

function PopupApp() {
  const { state, tokenInput, showReviewFlowWarning, handleSave, handleClear, handleTokenChange } =
    usePopup();

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

      {state.status === 'loading' && (
        <section
          className='card card-centered'
          role='status'
          aria-live='polite'
        >
          <IconLoader
            className='popup-spinner'
            size={28}
            stroke={2}
          />
          <p className='status-text'>Loading&hellip;</p>
        </section>
      )}

      {(state.status === 'empty' || state.status === 'error' || state.status === 'validating') && (
        <section className={`card ${state.status === 'error' ? 'card-error' : ''}`}>
          <div className='card-header'>
            <h2>GitHub token</h2>
            <span className='badge'>Optional</span>
          </div>
          <p className='card-copy'>Private repos, comments, and higher rate limits.</p>

          {state.status === 'error' && (
            <div
              className='error-banner'
              role='alert'
            >
              <IconAlertCircle
                size={16}
                stroke={2}
              />
              <span>{state.message}</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <label
              className='input-label'
              htmlFor='github-token'
            >
              Personal access token
            </label>
            <input
              id='github-token'
              type='password'
              value={tokenInput}
              placeholder='ghp_… or github_pat_…'
              onChange={(event) => handleTokenChange(event.currentTarget.value)}
              autoComplete='off'
              spellCheck={false}
              aria-invalid={state.status === 'error'}
              disabled={state.status === 'validating'}
            />
            <div className='actions actions-single'>
              <button
                type='submit'
                disabled={state.status === 'validating'}
              >
                {state.status === 'validating' ? (
                  <IconLoader2
                    className='popup-spinner'
                    size={20}
                    stroke={2}
                  />
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </form>

          {showReviewFlowWarning ? <ViewedFilesTokenHint /> : null}
        </section>
      )}

      {state.status === 'saved' && (
        <section className='card card-saved'>
          <div className='card-header'>
            <h2>GitHub token</h2>
            <span className='badge badge-saved'>
              <IconCircleCheck
                size={12}
                stroke={2}
              />
              Verified
            </span>
          </div>

          {state.viewer ? (
            <div className='viewer-row'>
              {state.viewer.avatar_url ? (
                <img
                  className='viewer-avatar'
                  src={state.viewer.avatar_url}
                  alt=''
                  width={32}
                  height={32}
                />
              ) : (
                <div className='viewer-avatar viewer-avatar-fallback'>
                  <IconUser
                    size={18}
                    stroke={2}
                  />
                </div>
              )}
              <span className='viewer-login'>@{state.viewer.login}</span>
            </div>
          ) : (
            <p className='status-text status-text-saved'>Token saved.</p>
          )}

          {showReviewFlowWarning ? <ViewedFilesTokenHint /> : null}

          <div className='actions actions-single'>
            <button
              type='button'
              className='button-secondary'
              onClick={handleClear}
            >
              Remove token
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<PopupApp />);
}
