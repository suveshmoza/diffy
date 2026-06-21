import { useEffect, useReducer, useState } from 'react';

import { fetchGitHubViewer, GitHubViewer } from '@/lib/github/review-write';
import { popupReducer } from '@/reducers/popup-reducer';

export function usePopup() {
  const [state, dispatch] = useReducer(popupReducer, { status: 'loading' });
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    void loadFromStorage();
  }, []);

  async function loadFromStorage() {
    dispatch({ type: 'LOADING' });

    if (!browser?.storage?.sync) {
      dispatch({ type: 'SET_EMPTY' });
      return;
    }

    try {
      const stored = await browser.storage.sync.get(['githubToken', 'githubTokenViewer']);

      if (typeof stored.githubToken === 'string' && stored.githubToken.trim()) {
        setTokenInput(stored.githubToken);

        if (typeof stored.githubTokenViewer === 'string') {
          try {
            const viewer = JSON.parse(stored.githubTokenViewer) as GitHubViewer;
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
      dispatch({ type: 'SET_EMPTY' });
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === 'validating') return;

    if (!browser?.storage?.sync) {
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
      await browser.storage.sync.set({ githubToken: trimmed });

      const viewer = await fetchGitHubViewer();

      if (viewer) {
        await browser.storage.sync.set({
          githubTokenViewer: JSON.stringify(viewer),
        });
        dispatch({ type: 'SET_SAVED', viewer });
      } else {
        await browser.storage.sync.remove('githubTokenViewer');
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
    if (!browser?.storage?.sync) return;

    await browser.storage.sync.remove(['githubToken', 'githubTokenViewer']);
    setTokenInput('');
    dispatch({ type: 'SET_EMPTY' });
  }

  function handleTokenChange(value: string) {
    setTokenInput(value);
    dispatch({ type: 'SET_TOKEN' });
  }

  return { state, tokenInput, handleSave, handleClear, handleTokenChange };
}
