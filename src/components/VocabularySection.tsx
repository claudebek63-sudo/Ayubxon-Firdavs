import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  Volume2,
} from 'lucide-react';
import { RUSSIAN_VOCABULARY, VOCAB_CATEGORIES } from '../data/russianVocabulary';
import { LearnerProgress, VocabCategory } from '../types/learning';
import { playFeedbackTone, speakRussian } from '../utils/audio';

interface VocabularySectionProps {
  progress: LearnerProgress;
  onToggleLearned: (wordId: string) => void;
  onToggleSaved: (wordId: string) => void;
}

export const VocabularySection: React.FC<VocabularySectionProps> = ({
  progress,
  onToggleLearned,
  onToggleSaved,
}) => {
  const [category, setCategory] = useState<VocabCategory | 'all' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'flashcard'>('list');
  const [cardIndex, setCardIndex] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return RUSSIAN_VOCABULARY.filter((w) => {
      if (category === 'saved' && !progress.savedWords.includes(w.id)) return false;
      if (category !== 'all' && category !== 'saved' && w.category !== category) return false;
      if (!q) return true;
      return (
        w.ru.toLowerCase().includes(q) ||
        w.uz.toLowerCase().includes(q) ||
        w.translit.toLowerCase().includes(q)
      );
    });
  }, [category, searchQuery, progress.savedWords]);

  const safeCardIndex =
    filteredWords.length > 0 ? Math.min(cardIndex, filteredWords.length - 1) : 0;
  const activeCard = filteredWords[safeCardIndex];

  return (
    <section aria-labelledby="lugat-heading" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 id="lugat-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">
            Ruscha-oʻzbekcha lugʻat
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Eng koʻp ishlatiladigan ruscha soʻzlar, urgʻu belgilari, audio talaffuz va oʻzbekcha tarjimalar.
          </p>
        </div>

        {/* View Mode Switch */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lugʻat roʻyxati
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('flashcard');
              setCardRevealed(false);
            }}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'flashcard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kartochka rejimi
          </button>
        </div>
      </div>

      {/* Search + Category Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative w-full lg:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCardIndex(0);
            }}
            placeholder="Soʻz yoki tarjima qidiring..."
            aria-label="So'z yoki tarjima qidirish"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
          {VOCAB_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id);
                setCardIndex(0);
                setCardRevealed(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                category === cat.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCategory('saved');
              setCardIndex(0);
              setCardRevealed(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              category === 'saved'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Saqlanganlar ({progress.savedWords.length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredWords.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">Mos soʻzlar topilmadi</p>
          <p className="text-sm text-slate-600">
            Qidiruv soʻzini oʻzgartiring yoki barcha toifalarni tanlang.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            Barcha soʻzlarni koʻrsatish
          </button>
        </div>
      )}

      {/* LIST VIEW */}
      {filteredWords.length > 0 && viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.map((word) => {
            const isLearned = progress.learnedWords.includes(word.id);
            const isSaved = progress.savedWords.includes(word.id);

            return (
              <article
                key={word.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900">{word.displayRu}</h3>
                        <span className="font-mono text-xs text-slate-500">[{word.translit}]</span>
                      </div>
                      <p className="text-base font-semibold text-blue-700 mt-0.5">{word.uz}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => speakRussian(word.ru, 0.88)}
                        aria-label={`${word.ru} so'zini tinglash`}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSaved(word.id)}
                        aria-label={isSaved ? "Saqlanganlardan olib tashlash" : "So'zni saqlash"}
                        className={`p-2.5 rounded-xl border transition-colors ${
                          isSaved
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-600' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Example sentence */}
                  <div className="pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-800 font-medium">{word.exampleRu}</p>
                      <button
                        type="button"
                        onClick={() => speakRussian(word.exampleRu, 0.85)}
                        aria-label="Misol gapni tinglash"
                        className="text-xs font-medium text-blue-700 hover:underline shrink-0"
                      >
                        Eshitish
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{word.exampleUz}</p>
                  </div>
                </div>

                {/* Card footer with unboxed metadata & learned toggle */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {word.partOfSpeech} · {VOCAB_CATEGORIES.find((c) => c.id === word.category)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleLearned(word.id);
                      playFeedbackTone(isLearned ? 'click' : 'correct', progress.soundEnabled);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isLearned
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isLearned ? 'Oʻrganilgan' : 'Oʻrgandim'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* FLASHCARD STUDY VIEW */}
      {filteredWords.length > 0 && viewMode === 'flashcard' && activeCard && (
        <div className="max-w-xl mx-auto space-y-5">
          <div className="flex items-center justify-between text-sm text-slate-600 tabular-nums">
            <span>
              Kartochka: <strong className="text-slate-900">{safeCardIndex + 1}</strong> / {filteredWords.length}
            </span>
            <span>
              Oʻrganilgan: <strong className="text-emerald-700">{progress.learnedWords.length} ta</strong>
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">
                {activeCard.partOfSpeech} · {VOCAB_CATEGORIES.find((c) => c.id === activeCard.category)?.label}
              </p>
              <div className="text-4xl sm:text-5xl font-bold text-slate-900 py-2">
                {activeCard.displayRu}
              </div>
              <p className="font-mono text-sm text-slate-500">[{activeCard.translit}]</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => speakRussian(activeCard.ru, 0.88)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                <span>Tinglash</span>
              </button>
              <button
                type="button"
                onClick={() => setCardRevealed((r) => !r)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                <span>{cardRevealed ? 'Tarjimani yashirish' : 'Tarjimani koʻrish'}</span>
              </button>
            </div>

            {cardRevealed && (
              <div className="pt-5 border-t border-slate-100 space-y-2">
                <p className="text-2xl font-bold text-blue-700">{activeCard.uz}</p>
                <p className="text-sm text-slate-700">{activeCard.exampleRu}</p>
                <p className="text-xs text-slate-500">{activeCard.exampleUz}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setCardIndex((i) => (i - 1 + filteredWords.length) % filteredWords.length);
                  setCardRevealed(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Oldingi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!progress.learnedWords.includes(activeCard.id)) {
                    onToggleLearned(activeCard.id);
                  }
                  playFeedbackTone('correct', progress.soundEnabled);
                  setCardIndex((i) => (i + 1) % filteredWords.length);
                  setCardRevealed(false);
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors"
              >
                Bilaman · Keyingisi
              </button>

              <button
                type="button"
                onClick={() => {
                  setCardIndex((i) => (i + 1) % filteredWords.length);
                  setCardRevealed(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                <span>Keyingi</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
