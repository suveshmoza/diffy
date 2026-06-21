import { type GitHubViewer } from '@/lib/github/review-write';

export type PopupState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'validating' }
  | { status: 'saved'; viewer?: GitHubViewer | null }
  | { status: 'error'; message: string };

export type Action =
  | { type: 'LOADING' }
  | { type: 'SET_EMPTY' }
  | { type: 'SET_VALIDATING' }
  | { type: 'SET_TOKEN' }
  | { type: 'SET_SAVED'; viewer?: GitHubViewer | null }
  | { type: 'SET_ERROR'; message: string };

export function popupReducer(state: PopupState, action: Action): PopupState {
  switch (action.type) {
    case 'LOADING':
      return { status: 'loading' };
    case 'SET_EMPTY':
      return { status: 'empty' };
    case 'SET_VALIDATING':
      return { status: 'validating' };
    case 'SET_TOKEN':
      return state.status === 'error' ? { status: 'empty' } : state;
    case 'SET_SAVED':
      return action.viewer ? { status: 'saved', viewer: action.viewer } : { status: 'saved' };
    case 'SET_ERROR':
      return { status: 'error', message: action.message };
    default:
      return state;
  }
}
