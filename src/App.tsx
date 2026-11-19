/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AlphabetSection } from './components/AlphabetSection';
import { ExercisesSection } from './components/ExercisesSection';
import { GamesSection } from './components/GamesSection';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { StatisticsSection } from './components/StatisticsSection';
import { VocabularySection } from './components/VocabularySection';
import { useProgress } from './hooks/useProgress';
import { AppTab } from './types/learning';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('alifbo');
  const [selectedLetterId, setSelectedLetterId] = useState<string>('a');

  const {
    progress,
    toggleMasteredLetter,
    recordExerciseAnswer,
    recordMemoryWin,
    recordCatcherGame,
    toggleLearnedWord,
    toggleSavedWord,
    toggleSound,
    resetProgress,
  } = useProgress();

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToLetter = (letterId: string) => {
    setSelectedLetterId(letterId);
    setActiveTab('alifbo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-0">
      <Navbar activeTab={activeTab} onSelectTab={handleSelectTab} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {activeTab === 'alifbo' && (
          <>
            <HeroSection
              progress={progress}
              onSelectTab={handleSelectTab}
              onToggleSound={toggleSound}
            />
            <AlphabetSection
              progress={progress}
              selectedLetterId={selectedLetterId}
              onSelectLetter={setSelectedLetterId}
              onToggleMastered={toggleMasteredLetter}
            />
          </>
        )}

        {activeTab === 'mashqlar' && (
          <ExercisesSection
            progress={progress}
            onRecordAnswer={recordExerciseAnswer}
          />
        )}

        {activeTab === 'oyinlar' && (
          <GamesSection
            progress={progress}
            onRecordMemoryWin={recordMemoryWin}
            onRecordCatcherGame={recordCatcherGame}
          />
        )}

        {activeTab === 'lugat' && (
          <VocabularySection
            progress={progress}
            onToggleLearned={toggleLearnedWord}
            onToggleSaved={toggleSavedWord}
          />
        )}

        {activeTab === 'statistika' && (
          <StatisticsSection
            progress={progress}
            onJumpToLetter={handleJumpToLetter}
            onResetProgress={resetProgress}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>Azbuka · Rus tili alifbosi, interaktiv mashqlar va lugʻat platformasi</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleSelectTab('alifbo')}
              className="hover:text-slate-900 transition-colors"
            >
              Alifbo
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('mashqlar')}
              className="hover:text-slate-900 transition-colors"
            >
              Mashqlar
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('oyinlar')}
              className="hover:text-slate-900 transition-colors"
            >
              Oʻyinlar
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('lugat')}
              className="hover:text-slate-900 transition-colors"
            >
              Lugʻat
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('statistika')}
              className="hover:text-slate-900 transition-colors"
            >
              Statistika
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
