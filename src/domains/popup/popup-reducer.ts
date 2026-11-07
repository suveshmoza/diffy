import { type GitHubViewer } from '@/domains/github/review-write';

export type PopupStatus =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'validating' }
  | { status: 'saved'; viewer?: GitHubViewer | null }
  | { status: 'error'; message: string };

export type PopupState = {
  tokenInput: string;
  ui: PopupStatus;
};

export type Action =
  | { type: 'LOADING' }
  | { type: 'SET_EMPTY' }
  | { type: 'SET_VALIDATING' }
  | { type: 'SET_TOKEN'; tokenInput: string }
  | { type: 'SET_SAVED'; viewer?: GitHubViewer | null }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'HYDRATE_TOKEN'; tokenInput: string }
  | { type: 'CLEAR_TOKEN' };

export function createInitialPopupState(storageAvailable: boolean): PopupState {
  return {
    tokenInput: '',
    ui: storageAvailable ? { status: 'loading' } : { status: 'empty' },
  };
}

export function popupReducer(state: PopupState, action: Action): PopupState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, ui: { status: 'loading' } };
    case 'SET_EMPTY':
      return { ...state, ui: { status: 'empty' } };
    case 'SET_VALIDATING':
      return { ...state, ui: { status: 'validating' } };
    case 'SET_TOKEN':
      return {
        tokenInput: action.tokenInput,
        ui: state.ui.status === 'error' ? { status: 'empty' } : state.ui,
      };
    case 'HYDRATE_TOKEN':
      return { ...state, tokenInput: action.tokenInput };
    case 'CLEAR_TOKEN':
      return { tokenInput: '', ui: { status: 'empty' } };
    case 'SET_SAVED':
      return {
        ...state,
        ui: action.viewer ? { status: 'saved', viewer: action.viewer } : { status: 'saved' },
      };
    case 'SET_ERROR':
      return { ...state, ui: { status: 'error', message: action.message } };
    default:
      return state;
  }
}
