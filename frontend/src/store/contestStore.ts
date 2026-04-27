import { create } from 'zustand';
import { Contest, Problem } from '@shared/types';

interface ContestState {
  activeContest: Contest | null;
  currentProblem: Problem | null;
  setActiveContest: (contest: Contest | null) => void;
  setCurrentProblem: (problem: Problem | null) => void;
  clearContest: () => void;
}

export const useContestStore = create<ContestState>((set) => ({
  activeContest: null,
  currentProblem: null,
  setActiveContest: (contest) => set({ activeContest: contest }),
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  clearContest: () => set({ activeContest: null, currentProblem: null }),
}));
