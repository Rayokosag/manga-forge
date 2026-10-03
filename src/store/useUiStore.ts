import { create } from 'zustand';

export type AppView =
  | 'story'
  | 'characters'
  | 'relationships'
  | 'world'
  | 'storyboard'
  | 'ai'
  | 'export';

/** Every view has shipped. */
export const ENABLED_VIEWS: AppView[] = [
  'story',
  'characters',
  'relationships',
  'world',
  'storyboard',
  'ai',
  'export',
];

interface UiState {
  activeView: AppView;
  setView: (view: AppView) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeView: 'story',
  setView: (activeView) => set({ activeView }),
}));
