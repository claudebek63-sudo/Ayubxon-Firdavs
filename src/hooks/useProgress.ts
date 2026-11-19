import { useCallback, useEffect, useState } from 'react';
import { ExerciseType, LearnerProgress } from '../types/learning';

const STORAGE_KEY = 'azbuka_learner_progress_v1';

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayKey(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createInitialProgress(): LearnerProgress {
  return {
    masteredLetters: [],
    letterStats: {},
    learnedWords: [],
    savedWords: [],
    exerciseStats: {
      totalAnswered: 0,
      totalCorrect: 0,
      xp: 0,
      byType: {
        audio: { attempts: 0, correct: 0 },
        translit: { attempts: 0, correct: 0 },
        missing: { attempts: 0, correct: 0 },
        match: { attempts: 0, correct: 0 },
      },
    },
    gameStats: {
      memoryBestMoves: {},
      memoryGamesWon: 0,
      catcherBestScore: 0,
      catcherBestCombo: 0,
      gamesPlayed: 0,
    },
    dailyActivity: {},
    streakDays: 0,
    bestStreakDays: 0,
    lastActiveDate: '',
    soundEnabled: true,
  };
}

function loadProgress(): LearnerProgress {
  if (typeof window === 'undefined') return createInitialProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProgress();
    const parsed = JSON.parse(raw) as Partial<LearnerProgress>;
    const base = createInitialProgress();
    return {
      ...base,
      ...parsed,
      exerciseStats: {
        ...base.exerciseStats,
        ...(parsed.exerciseStats || {}),
        byType: {
          ...base.exerciseStats.byType,
          ...(parsed.exerciseStats?.byType || {}),
        },
      },
      gameStats: {
        ...base.gameStats,
        ...(parsed.gameStats || {}),
      },
      bestStreakDays: Math.max(parsed.bestStreakDays || 0, parsed.streakDays || 0),
    };
  } catch {
    return createInitialProgress();
  }
}

function updateStreakAndActivity(
  prev: LearnerProgress,
  delta: { exercises?: number; games?: number; words?: number; xp?: number }
): LearnerProgress {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  let nextStreak = prev.streakDays;
  if (prev.lastActiveDate !== today) {
    if (prev.lastActiveDate === yesterday) {
      nextStreak = Math.max(1, prev.streakDays + 1);
    } else {
      nextStreak = 1;
    }
  }

  const currentDay = prev.dailyActivity[today] || {
    exercises: 0,
    games: 0,
    words: 0,
    xp: 0,
    visited: true,
  };

  const nextBestStreak = Math.max(prev.bestStreakDays || 0, nextStreak);

  return {
    ...prev,
    streakDays: nextStreak,
    bestStreakDays: nextBestStreak,
    lastActiveDate: today,
    dailyActivity: {
      ...prev.dailyActivity,
      [today]: {
        exercises: currentDay.exercises + (delta.exercises || 0),
        games: currentDay.games + (delta.games || 0),
        words: currentDay.words + (delta.words || 0),
        xp: currentDay.xp + (delta.xp || 0),
        visited: true,
      },
    },
  };
}

export function useProgress() {
  const [progress, setProgress] = useState<LearnerProgress>(loadProgress);

  // Register daily app usage on initial mount so consecutive days of app usage are tracked
  useEffect(() => {
    setProgress((prev) => {
      const today = getTodayKey();
      if (prev.lastActiveDate === today && prev.dailyActivity[today]?.visited) {
        return prev;
      }
      return updateStreakAndActivity(prev, {});
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const toggleMasteredLetter = useCallback((letterId: string) => {
    setProgress((prev) => {
      const exists = prev.masteredLetters.includes(letterId);
      const nextMastered = exists
        ? prev.masteredLetters.filter((id) => id !== letterId)
        : [...prev.masteredLetters, letterId];
      const xpGain = exists ? 0 : 10;
      const updated = updateStreakAndActivity(prev, { xp: xpGain });
      return {
        ...updated,
        masteredLetters: nextMastered,
        exerciseStats: {
          ...updated.exerciseStats,
          xp: updated.exerciseStats.xp + xpGain,
        },
      };
    });
  }, []);

  const recordExerciseAnswer = useCallback(
    (type: ExerciseType, letterIds: string[], isCorrect: boolean) => {
      setProgress((prev) => {
        const xpGain = isCorrect ? 15 : 3;
        const today = getTodayKey();
        const nextLetterStats = { ...prev.letterStats };
        const newlyMastered = new Set(prev.masteredLetters);

        letterIds.forEach((lid) => {
          const existing = nextLetterStats[lid] || { attempts: 0, correct: 0, lastPracticed: today };
          const updatedStat = {
            attempts: existing.attempts + 1,
            correct: existing.correct + (isCorrect ? 1 : 0),
            lastPracticed: today,
          };
          nextLetterStats[lid] = updatedStat;
          if (updatedStat.correct >= 3 && updatedStat.correct / updatedStat.attempts >= 0.65) {
            newlyMastered.add(lid);
          }
        });

        const prevType = prev.exerciseStats.byType[type];
        const withActivity = updateStreakAndActivity(prev, { exercises: 1, xp: xpGain });

        return {
          ...withActivity,
          masteredLetters: Array.from(newlyMastered),
          letterStats: nextLetterStats,
          exerciseStats: {
            totalAnswered: withActivity.exerciseStats.totalAnswered + 1,
            totalCorrect: withActivity.exerciseStats.totalCorrect + (isCorrect ? 1 : 0),
            xp: withActivity.exerciseStats.xp + xpGain,
            byType: {
              ...withActivity.exerciseStats.byType,
              [type]: {
                attempts: prevType.attempts + 1,
                correct: prevType.correct + (isCorrect ? 1 : 0),
              },
            },
          },
        };
      });
    },
    []
  );

  const recordMemoryWin = useCallback((difficultyKey: string, moves: number) => {
    setProgress((prev) => {
      const xpGain = 35;
      const withActivity = updateStreakAndActivity(prev, { games: 1, xp: xpGain });
      const prevBest = withActivity.gameStats.memoryBestMoves[difficultyKey];
      const nextBest = prevBest === undefined ? moves : Math.min(prevBest, moves);
      return {
        ...withActivity,
        exerciseStats: {
          ...withActivity.exerciseStats,
          xp: withActivity.exerciseStats.xp + xpGain,
        },
        gameStats: {
          ...withActivity.gameStats,
          memoryGamesWon: withActivity.gameStats.memoryGamesWon + 1,
          gamesPlayed: withActivity.gameStats.gamesPlayed + 1,
          memoryBestMoves: {
            ...withActivity.gameStats.memoryBestMoves,
            [difficultyKey]: nextBest,
          },
        },
      };
    });
  }, []);

  const recordCatcherGame = useCallback((score: number, maxCombo: number) => {
    setProgress((prev) => {
      const xpGain = Math.max(10, Math.round(score / 4));
      const withActivity = updateStreakAndActivity(prev, { games: 1, xp: xpGain });
      return {
        ...withActivity,
        exerciseStats: {
          ...withActivity.exerciseStats,
          xp: withActivity.exerciseStats.xp + xpGain,
        },
        gameStats: {
          ...withActivity.gameStats,
          catcherBestScore: Math.max(withActivity.gameStats.catcherBestScore, score),
          catcherBestCombo: Math.max(withActivity.gameStats.catcherBestCombo, maxCombo),
          gamesPlayed: withActivity.gameStats.gamesPlayed + 1,
        },
      };
    });
  }, []);

  const toggleLearnedWord = useCallback((wordId: string) => {
    setProgress((prev) => {
      const exists = prev.learnedWords.includes(wordId);
      const nextLearned = exists
        ? prev.learnedWords.filter((id) => id !== wordId)
        : [...prev.learnedWords, wordId];
      const xpGain = exists ? 0 : 10;
      const withActivity = updateStreakAndActivity(prev, { words: exists ? 0 : 1, xp: xpGain });
      return {
        ...withActivity,
        learnedWords: nextLearned,
        exerciseStats: {
          ...withActivity.exerciseStats,
          xp: withActivity.exerciseStats.xp + xpGain,
        },
      };
    });
  }, []);

  const toggleSavedWord = useCallback((wordId: string) => {
    setProgress((prev) => {
      const exists = prev.savedWords.includes(wordId);
      return {
        ...prev,
        savedWords: exists
          ? prev.savedWords.filter((id) => id !== wordId)
          : [...prev.savedWords, wordId],
      };
    });
  }, []);

  const toggleSound = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    const fresh = createInitialProgress();
    setProgress(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore storage error
    }
  }, []);

  return {
    progress,
    toggleMasteredLetter,
    recordExerciseAnswer,
    recordMemoryWin,
    recordCatcherGame,
    toggleLearnedWord,
    toggleSavedWord,
    toggleSound,
    resetProgress,
  };
}
