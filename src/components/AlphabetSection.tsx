import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  PenTool,
  Volume2,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  RUSSIAN_ALPHABET,
} from '../data/russianAlphabet';
import { LearnerProgress, RussianLetter } from '../types/learning';
import { playFeedbackTone, speakRussian } from '../utils/audio';

interface AlphabetSectionProps {
  progress: LearnerProgress;
  selectedLetterId: string;
  onSelectLetter: (id: string) => void;
  onToggleMastered: (id: string) => void;
}

type FilterOption = 'all' | 'unli' | 'undosh' | 'belgi' | 'aldamchi';

export const AlphabetSection: React.FC<AlphabetSectionProps> = ({
  progress,
  selectedLetterId,
  onSelectLetter,
  onToggleMastered,
}) => {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [slowAudio, setSlowAudio] = useState(false);

  // Canvas drawing state for handwriting practice
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const selectedLetter: RussianLetter =
    RUSSIAN_ALPHABET.find((l) => l.id === selectedLetterId) || RUSSIAN_ALPHABET[0];

  const filteredLetters = RUSSIAN_ALPHABET.filter((letter) => {
    if (filter === 'all') return true;
    if (filter === 'aldamchi') return letter.difficulty === 'aldamchi';
    return letter.category === filter;
  });

  const isMastered = progress.masteredLetters.includes(selectedLetter.id);

  // Clear canvas when selected letter changes
  useEffect(() => {
    clearCanvas();
  }, [selectedLetter.id]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function getPointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPointerPos(e);
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasDrawn(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
  }

  const currentIdx = RUSSIAN_ALPHABET.findIndex((l) => l.id === selectedLetter.id);
  const handlePrev = () => {
    const prevIdx = (currentIdx - 1 + RUSSIAN_ALPHABET.length) % RUSSIAN_ALPHABET.length;
    onSelectLetter(RUSSIAN_ALPHABET[prevIdx].id);
  };
  const handleNext = () => {
    const nextIdx = (currentIdx + 1) % RUSSIAN_ALPHABET.length;
    onSelectLetter(RUSSIAN_ALPHABET[nextIdx].id);
  };

  const handlePlayLetter = (letter: RussianLetter) => {
    speakRussian(letter.speakText, slowAudio ? 0.65 : 0.9);
  };

  const handlePlayExample = (text: string) => {
    speakRussian(text, slowAudio ? 0.65 : 0.88);
  };

  return (
    <section aria-labelledby="alifbo-heading" className="space-y-8">
      {/* Section Header & Segmented Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 id="alifbo-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">
            Rus tili alifbosi (33 ta harf)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Har bir harfni bosing, talaffuzini tinglang va pastki yozuv maydonida chizib mashq qiling.
          </p>
        </div>

        {/* Interactive Filter Tabs */}
        <div
          role="tablist"
          aria-label="Harflar toifasi"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start"
        >
          {(
            [
              { id: 'all', label: 'Barchasi (33)' },
              { id: 'unli', label: 'Unlilar (10)' },
              { id: 'undosh', label: 'Undoshlar (21)' },
              { id: 'belgi', label: 'Belgilar (2)' },
              { id: 'aldamchi', label: 'Aldamchi harflar' },
            ] as { id: FilterOption; label: string }[]
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Zone Layout: Letter Grid (Left/Top) + Detailed Inspector & Tracing Pad (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Letter Grid */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {filteredLetters.map((letter) => {
              const selected = letter.id === selectedLetter.id;
              const mastered = progress.masteredLetters.includes(letter.id);
              return (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => {
                    onSelectLetter(letter.id);
                    playFeedbackTone('click', progress.soundEnabled);
                    speakRussian(letter.speakText, slowAudio ? 0.65 : 0.9);
                  }}
                  className={`relative min-h-[84px] p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    selected
                      ? 'border-blue-700 bg-blue-50/70 ring-1 ring-blue-700'
                      : mastered
                      ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>{String(letter.order).padStart(2, '0')}</span>
                    {mastered && (
                      <CheckCircle2
                        aria-label="O'zlashtirilgan"
                        className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                      />
                    )}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 leading-none my-1">
                    {letter.upper}
                    <span className="font-normal text-slate-500 ml-0.5">{letter.lower}</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 truncate max-w-full">
                    [{letter.translit}]
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Letter Inspector + Handwriting Canvas */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 lg:sticky lg:top-20">
          {/* Header navigation */}
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="text-xs text-slate-500">
              <span>{selectedLetter.order}-harf</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{CATEGORY_LABELS[selectedLetter.category]}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span className={selectedLetter.difficulty === 'aldamchi' ? 'text-amber-700 font-medium' : ''}>
                {DIFFICULTY_LABELS[selectedLetter.difficulty]}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Oldingi harf"
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Keyingi harf"
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Specimen Display & Audio Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-4">
              <div className="text-6xl font-bold tracking-tight text-slate-900 leading-none">
                {selectedLetter.upper}{selectedLetter.lower}
              </div>
              <div className="font-serif italic text-4xl text-slate-400 leading-none">
                {selectedLetter.upper}{selectedLetter.lower}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => handlePlayLetter(selectedLetter)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Volume2 className="w-4 h-4" />
                <span>Tinglash</span>
              </button>
              <button
                type="button"
                onClick={() => setSlowAudio((s) => !s)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                {slowAudio ? 'Tezlik: Sekin (0.65x)' : 'Tezlik: Oddiy (0.9x)'}
              </button>
            </div>
          </div>

          {/* Phonetic Reading & Explanation */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">Nomi:</span>
              <span className="font-semibold text-slate-900">{selectedLetter.name}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500">Oʻqilishi:</span>
              <span className="font-mono font-semibold text-blue-700">[{selectedLetter.translit}]</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono text-xs text-slate-500">{selectedLetter.ipa}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {selectedLetter.pronunciationUz}
            </p>
          </div>

          {/* Example Word */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-0.5">Misol soʻz</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-xl font-bold text-slate-900">
                  {selectedLetter.exampleWord.displayRu}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  [{selectedLetter.exampleWord.translit}]
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-0.5">
                Tarjimasi: <span className="font-semibold">{selectedLetter.exampleWord.uz}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePlayExample(selectedLetter.exampleWord.ru)}
              aria-label={`${selectedLetter.exampleWord.ru} so'zini tinglash`}
              className="p-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors shrink-0"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Handwriting / Tracing Pad */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <PenTool className="w-3.5 h-3.5 text-blue-700" />
                <span>Yozish mashqi (ustidan chizing)</span>
              </div>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={!hasDrawn}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Tozalash</span>
              </button>
            </div>

            <div className="relative h-40 w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden select-none">
              {/* Guide lines and ghost letter template inside canvas */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
                <span className="text-8xl font-bold text-slate-200/80 tracking-wider select-none">
                  {selectedLetter.upper} {selectedLetter.lower}
                </span>
              </div>
              <canvas
                ref={canvasRef}
                width={420}
                height={160}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="relative z-10 w-full h-full touch-none cursor-crosshair"
              />
            </div>
          </div>

          {/* Mastery Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onToggleMastered(selectedLetter.id);
                playFeedbackTone(isMastered ? 'click' : 'correct', progress.soundEnabled);
              }}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                isMastered
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isMastered ? 'Oʻzlashtirilgan (bekor qilish)' : 'Oʻzlashtirdim deb belgilash'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
