import { useEffect, useReducer } from 'react';

import { shouldShowReviewFlowTokenWarning } from '@/domains/github/auth/token-hints';
import {
  clearGitHubToken,
  readGitHubTokenCredentials,
  removeGitHubTokenViewer,
  setGitHubToken,
  setGitHubTokenViewer,
} from '@/domains/github/auth/token-storage';
import { fetchGitHubViewer, type GitHubViewer } from '@/domains/github/review-write';
import { createInitialPopupState, popupReducer } from '@/domains/popup/popup-reducer';

const storageAvailable = browser?.storage?.local != null;

export function usePopup() {
  const [state, dispatch] = useReducer(popupReducer, storageAvailable, createInitialPopupState);

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
          dispatch({ type: 'HYDRATE_TOKEN', tokenInput: token });

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
    if (state.ui.status === 'validating') return;

    if (!storageAvailable) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Extension storage is unavailable.',
      });
      return;
    }

    const trimmed = state.tokenInput.trim();

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
    dispatch({ type: 'CLEAR_TOKEN' });
  }

  function handleTokenChange(value: string) {
    dispatch({ type: 'SET_TOKEN', tokenInput: value });
  }

  return {
    state: state.ui,
    tokenInput: state.tokenInput,
    showReviewFlowWarning: shouldShowReviewFlowTokenWarning(state.tokenInput),
    handleSave,
    handleClear,
    handleTokenChange,
  };
}
