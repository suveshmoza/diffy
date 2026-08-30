import { useEffect, useReducer, useState } from 'react';

import { fetchGitHubViewer, type GitHubViewer } from '@/lib/github/review-write';
import { shouldShowReviewFlowTokenWarning } from '@/lib/github/token-hints';
import {
  clearGitHubToken,
  readGitHubTokenCredentials,
  removeGitHubTokenViewer,
  setGitHubToken,
  setGitHubTokenViewer,
} from '@/lib/github/token-storage';
import { popupReducer } from '@/reducers/popup-reducer';

const storageAvailable = browser?.storage?.local != null;

export function usePopup() {
  const [state, dispatch] = useReducer(
    popupReducer,
    storageAvailable ? { status: 'loading' } : { status: 'empty' },
  );
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    if (!storageAvailable) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { token, viewerJson } = await readGitHubTokenCredentials();
        if (cancelled) {
          return;
        }

        if (token) {
          setTokenInput(token);

          if (viewerJson) {
            try {
              const viewer = JSON.parse(viewerJson) as GitHubViewer;
              dispatch({ type: 'SET_SAVED', viewer });
              return;
            } catch {
              // Corrupt cache — fall through to saved without viewer
            }
          }

          dispatch({ type: 'SET_SAVED' });
        } else {
          dispatch({ type: 'SET_EMPTY' });
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'SET_EMPTY' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === 'validating') return;

    if (!storageAvailable) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Extension storage is unavailable.',
      });
      return;
    }

    const trimmed = tokenInput.trim();

    if (trimmed.length < 10) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Token looks too short. GitHub tokens are at least 10 characters.',
      });
      return;
    }

    dispatch({ type: 'SET_VALIDATING' });

    try {
      await setGitHubToken(trimmed);

      const viewer = await fetchGitHubViewer();

      if (viewer) {
        const { login, avatar_url } = viewer;
        await setGitHubTokenViewer(JSON.stringify({ login, avatar_url }));
        dispatch({ type: 'SET_SAVED', viewer });
      } else {
        await removeGitHubTokenViewer();
        dispatch({
          type: 'SET_ERROR',
          message: 'GitHub token invalid. Make sure you are entering a valid token.',
        });
      }
    } catch {
      dispatch({
        type: 'SET_ERROR',
        message: 'Could not reach the GitHub API. Check your network and try again.',
      });
    }
  }

  async function handleClear() {
    if (!storageAvailable) return;

    await clearGitHubToken();
    setTokenInput('');
    dispatch({ type: 'SET_EMPTY' });
  }

  function handleTokenChange(value: string) {
    setTokenInput(value);
    dispatch({ type: 'SET_TOKEN' });
  }

  return {
    state,
    tokenInput,
    showReviewFlowWarning: shouldShowReviewFlowTokenWarning(tokenInput),
    handleSave,
    handleClear,
    handleTokenChange,
  };
}
