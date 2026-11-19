export type LetterCategory = 'unli' | 'undosh' | 'belgi';

export type LetterDifficulty = 'oson' | 'aldamchi' | 'maxsus';

export interface RussianLetter {
  id: string;
  order: number;
  upper: string;
  lower: string;
  name: string;
  translit: string;
  ipa: string;
  category: LetterCategory;
  difficulty: LetterDifficulty;
  pronunciationUz: string;
  speakText: string;
  exampleWord: {
    ru: string;
    displayRu: string;
    translit: string;
    uz: string;
  };
}

export type VocabCategory =
  | 'salomlashish'
  | 'oila'
  | 'ovqat'
  | 'sayohat'
  | 'raqamlar'
  | 'kundalik';

export interface RussianWord {
  id: string;
  ru: string;
  displayRu: string;
  translit: string;
  uz: string;
  partOfSpeech: string;
  category: VocabCategory;
  exampleRu: string;
  exampleUz: string;
}

export type ExerciseType = 'audio' | 'translit' | 'missing' | 'match';

export interface LetterStat {
  attempts: number;
  correct: number;
  lastPracticed: string;
}

export interface DailyActivityEntry {
  exercises: number;
  games: number;
  words: number;
  xp: number;
  visited?: boolean;
}

export interface LearnerProgress {
  masteredLetters: string[];
  letterStats: Record<string, LetterStat>;
  learnedWords: string[];
  savedWords: string[];
  exerciseStats: {
    totalAnswered: number;
    totalCorrect: number;
    xp: number;
    byType: Record<ExerciseType, { attempts: number; correct: number }>;
  };
  gameStats: {
    memoryBestMoves: Record<string, number>;
    memoryGamesWon: number;
    catcherBestScore: number;
    catcherBestCombo: number;
    gamesPlayed: number;
  };
  dailyActivity: Record<string, DailyActivityEntry>;
  streakDays: number;
  bestStreakDays: number;
  lastActiveDate: string;
  soundEnabled: boolean;
}

export type AppTab = 'alifbo' | 'mashqlar' | 'oyinlar' | 'lugat' | 'statistika';
