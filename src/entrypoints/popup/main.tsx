import { useState, type ReactNode, type SVGProps } from 'react';
import { createRoot } from 'react-dom/client';

import logoUrl from '@/assets/logo.png';
import { usePopup } from '@/hooks/use-popup';
import {
  FINE_GRAINED_WARNING_DETAIL,
  FINE_GRAINED_WARNING_SUMMARY,
} from '@/lib/github/token-hints';

import './style.css';

const REPO_URL = 'https://github.com/suveshmoza/diffy';
const TOKEN_SETTINGS_URL = 'https://github.com/settings/tokens';

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      aria-hidden
      {...props}
    />
  );
}

function IconEye() {
  return (
    <Icon>
      <path d='M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z' />
      <circle
        cx='12'
        cy='12'
        r='3'
      />
    </Icon>
  );
}

function IconEyeOff() {
  return (
    <Icon>
      <path d='M3 3l18 18M10.6 5.1A9.6 9.6 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A16.6 16.6 0 002 12s3.6 7 10 7a9.8 9.8 0 004.3-1M9.9 9.9a3 3 0 004.2 4.2' />
    </Icon>
  );
}

function IconWarn() {
  return (
    <Icon>
      <circle
        cx='12'
        cy='12'
        r='9'
      />
      <path d='M12 8v4M12 16h.01' />
    </Icon>
  );
}

function IconSpin() {
  return (
    <Icon className='spn'>
      <path d='M12 3a9 9 0 019 9' />
    </Icon>
  );
}

function IconStar() {
  return (
    <Icon>
      <path d='M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' />
    </Icon>
  );
}

function StarFooter() {
  return (
    <footer className='f'>
      <span>If you like diffy,</span>
      <a
        href={REPO_URL}
        target='_blank'
        rel='noreferrer'
      >
        <IconStar />
        star it on GitHub
      </a>
    </footer>
  );
}

function ReviewFlowNote() {
  return (
    <p
      className='note'
      title={FINE_GRAINED_WARNING_DETAIL}
    >
      {FINE_GRAINED_WARNING_SUMMARY}
    </p>
  );
}

function PopupApp() {
  const { state, tokenInput, showReviewFlowWarning, handleSave, handleClear, handleTokenChange } =
    usePopup();
  const [tokenVisible, setTokenVisible] = useState(false);
  const [confirmRequested, setConfirmRequested] = useState(false);
  const confirmingRemove = confirmRequested && state.status === 'saved';

  const showTokenWarning = tokenInput.trim().length > 0 && showReviewFlowWarning;
  let card: ReactNode;

  if (state.status === 'loading') {
    card = (
      <section
        className='card'
        key='loading'
        aria-live='polite'
      >
        <div className='row'>
          <h2>GitHub token</h2>
        </div>
        <p
          className='note loading-note'
          role='status'
        >
          <IconSpin />
          Checking token…
        </p>
      </section>
    );
  } else if (state.status === 'saved' && confirmingRemove) {
    card = (
      <section
        className='card'
        key='confirm'
        aria-live='polite'
      >
        <div className='row'>
          <h2>Remove token?</h2>
        </div>
        <p className='note'>
          Private repos, comments, and higher rate limits need a token. Removing it doesn’t change
          your GitHub account.
        </p>
        <div className='two'>
          <button
            type='button'
            className='btn'
            onClick={() => setConfirmRequested(false)}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn danger'
            onClick={() => {
              setConfirmRequested(false);
              void handleClear();
            }}
          >
            Remove
          </button>
        </div>
      </section>
    );
  } else if (state.status === 'saved') {
    const viewer = state.viewer;
    const login = viewer?.login;
    const initial = login?.charAt(0).toUpperCase() ?? '?';

    card = (
      <section
        className='card'
        key='saved'
        aria-live='polite'
      >
        <div className='row'>
          <h2>GitHub token</h2>
          <span className='st ok'>
            <i />
            Verified
          </span>
        </div>
        <div className='acct'>
          {viewer?.avatar_url ? (
            <img
              className='av'
              src={viewer.avatar_url}
              alt=''
              width={32}
              height={32}
            />
          ) : (
            <div
              className='av'
              aria-hidden
            >
              {initial}
            </div>
          )}
          <div className='who'>
            <b>{login ? `@${login}` : 'Token saved'}</b>
            <small>{login ? 'Connected account' : 'Connected'}</small>
          </div>
          <button
            type='button'
            className='btn sm'
            onClick={() => setConfirmRequested(true)}
          >
            Remove token
          </button>
        </div>
        {showTokenWarning ? <ReviewFlowNote /> : null}
      </section>
    );
  } else {
    const validating = state.status === 'validating';
    const invalid = state.status === 'error';

    card = (
      <section
        className='card'
        key='form'
        aria-live='polite'
      >
        <div className='row'>
          <h2>GitHub token</h2>
          <span className='st'>
            <i />
            Not connected
          </span>
        </div>
        <form onSubmit={handleSave}>
          <div className={invalid ? 'fld bad' : 'fld'}>
            <input
              id='github-token'
              type={tokenVisible ? 'text' : 'password'}
              value={tokenInput}
              placeholder='Paste a personal access token'
              onChange={(event) => handleTokenChange(event.currentTarget.value)}
              autoComplete='off'
              spellCheck={false}
              aria-label='GitHub token'
              aria-invalid={invalid}
              disabled={validating}
            />
            <button
              type='button'
              className='eye'
              aria-label={tokenVisible ? 'Hide token' : 'Show token'}
              onClick={() => setTokenVisible((visible) => !visible)}
              disabled={validating}
            >
              {tokenVisible ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          {invalid ? (
            <p
              className='err'
              role='alert'
            >
              <IconWarn />
              {state.message}
            </p>
          ) : null}
          <button
            type='submit'
            className='btn pri'
            disabled={validating || tokenInput.trim().length === 0}
          >
            {validating ? (
              <>
                <IconSpin />
                Verifying…
              </>
            ) : (
              'Save token'
            )}
          </button>
        </form>
        <a
          className='help'
          href={TOKEN_SETTINGS_URL}
          target='_blank'
          rel='noreferrer'
        >
          Create a token on GitHub ↗
        </a>
        {showTokenWarning ? <ReviewFlowNote /> : null}
      </section>
    );
  }

  return (
    <main className='pop'>
      <header className='h'>
        <img
          className='logo'
          src={logoUrl}
          alt=''
          width={36}
          height={36}
        />
        <div>
          <h1>diffy</h1>
          <p>Fast PR reviews on GitHub, even for large PRs</p>
        </div>
      </header>
      {card}
      <StarFooter />
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<PopupApp />);
}
