import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Volume2, XCircle } from 'lucide-react';
import { RUSSIAN_ALPHABET } from '../data/russianAlphabet';
import { RUSSIAN_VOCABULARY } from '../data/russianVocabulary';
import { ExerciseType, LearnerProgress, RussianLetter } from '../types/learning';
import { playFeedbackTone, speakRussian } from '../utils/audio';

interface ExercisesSectionProps {
  progress: LearnerProgress;
  onRecordAnswer: (type: ExerciseType, letterIds: string[], isCorrect: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface MultipleChoiceQuestion {
  target: RussianLetter;
  options: RussianLetter[];
}

interface MissingLetterQuestion {
  wordRu: string;
  maskedWord: string;
  uz: string;
  translit: string;
  missingChar: string;
  targetLetterId: string;
  options: string[];
}

interface MatchPairItem {
  letterId: string;
  upper: string;
  translit: string;
}

const EXERCISE_MODES: { id: ExerciseType; label: string; desc: string }[] = [
  { id: 'audio', label: 'Tovushni top', desc: "Ovozli talaffuzni eshiting va to'g'ri ruscha harfni tanlang." },
  { id: 'translit', label: 'Harf va talaffuz', desc: "Ruscha harfga mos o'zbekcha talaffuzni toping." },
  { id: 'missing', label: "So'zni to'ldir", desc: "So'zdagi tushib qolgan ruscha harfni to'g'ri qo'ying." },
  { id: 'match', label: "Juftlikni bog'la", desc: "Chapdagi harflarni o'ngdagi to'g'ri o'qilishi bilan bog'lang." },
];

export const ExercisesSection: React.FC<ExercisesSectionProps> = ({
  progress,
  onRecordAnswer,
}) => {
  const [mode, setMode] = useState<ExerciseType>('audio');
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);

  // Audio & Translit state
  const [mcQuestion, setMcQuestion] = useState<MultipleChoiceQuestion | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Missing letter state
  const [missingQ, setMissingQ] = useState<MissingLetterQuestion | null>(null);
  const [selectedMissingChar, setSelectedMissingChar] = useState<string | null>(null);

  // Match pairs state
  const [leftPairs, setLeftPairs] = useState<MatchPairItem[]>([]);
  const [rightPairs, setRightPairs] = useState<MatchPairItem[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<{ left: string; right: string } | null>(null);

  const generateMC = useCallback((exerciseMode: 'audio' | 'translit') => {
    const pool =
      exerciseMode === 'audio'
        ? RUSSIAN_ALPHABET.filter((l) => l.category !== 'belgi')
        : RUSSIAN_ALPHABET;
    const shuffled = shuffle(pool);
    const target = shuffled[0];
    const distractors = shuffled.slice(1, 4);
    const options = shuffle([target, ...distractors]);
    setMcQuestion({ target, options });
    setSelectedOptionId(null);
    if (exerciseMode === 'audio') {
      speakRussian(target.speakText, 0.88);
    }
  }, []);

  const generateMissing = useCallback(() => {
    // Pick a single-word Russian entry from vocabulary
    const singleWords = RUSSIAN_VOCABULARY.filter((w) => !w.ru.includes(' ') && w.ru.length >= 4);
    const word = singleWords[Math.floor(Math.random() * singleWords.length)];
    const chars = Array.from(word.ru);
    // Choose a random index in the word (preferring non-first or any index whose letter exists in RUSSIAN_ALPHABET)
    const validIndices: number[] = [];
    chars.forEach((ch, idx) => {
      const upper = ch.toUpperCase();
      if (RUSSIAN_ALPHABET.some((l) => l.upper === upper)) {
        validIndices.push(idx);
      }
    });
    const chosenIdx = validIndices[Math.floor(Math.random() * validIndices.length)] || 1;
    const targetUpper = chars[chosenIdx].toUpperCase();
    const targetLetter = RUSSIAN_ALPHABET.find((l) => l.upper === targetUpper) || RUSSIAN_ALPHABET[0];

    const maskedWord = chars.map((ch, i) => (i === chosenIdx ? '_' : ch)).join('');

    const otherUppers = shuffle(
      RUSSIAN_ALPHABET.filter((l) => l.upper !== targetUpper && l.category !== 'belgi')
    )
      .slice(0, 4)
      .map((l) => l.upper);

    setMissingQ({
      wordRu: word.ru,
      maskedWord,
      uz: word.uz,
      translit: word.translit,
      missingChar: targetUpper,
      targetLetterId: targetLetter.id,
      options: shuffle([targetUpper, ...otherUppers]),
    });
    setSelectedMissingChar(null);
  }, []);

  const generateMatch = useCallback(() => {
    const picked = shuffle(RUSSIAN_ALPHABET.filter((l) => l.category !== 'belgi')).slice(0, 5);
    const items: MatchPairItem[] = picked.map((l) => ({
      letterId: l.id,
      upper: `${l.upper}${l.lower}`,
      translit: l.translit,
    }));
    setLeftPairs(shuffle(items));
    setRightPairs(shuffle(items));
    setSelectedLeft(null);
    setMatchedIds([]);
    setWrongFlash(null);
  }, []);

  useEffect(() => {
    if (mode === 'audio' || mode === 'translit') {
      generateMC(mode);
    } else if (mode === 'missing') {
      generateMissing();
    } else if (mode === 'match') {
      generateMatch();
    }
  }, [mode, generateMC, generateMissing, generateMatch]);

  const handleMCAnswer = (option: RussianLetter) => {
    if (!mcQuestion || selectedOptionId !== null) return;
    setSelectedOptionId(option.id);
    const isCorrect = option.id === mcQuestion.target.id;

    if (isCorrect) {
      setSessionScore((s) => s + 15);
      setSessionStreak((st) => st + 1);
      playFeedbackTone('correct', progress.soundEnabled);
    } else {
      setSessionStreak(0);
      playFeedbackTone('wrong', progress.soundEnabled);
    }

    onRecordAnswer(mode, [mcQuestion.target.id], isCorrect);
  };

  const handleMissingAnswer = (charUpper: string) => {
    if (!missingQ || selectedMissingChar !== null) return;
    setSelectedMissingChar(charUpper);
    const isCorrect = charUpper === missingQ.missingChar;

    if (isCorrect) {
      setSessionScore((s) => s + 15);
      setSessionStreak((st) => st + 1);
      playFeedbackTone('correct', progress.soundEnabled);
      speakRussian(missingQ.wordRu, 0.9);
    } else {
      setSessionStreak(0);
      playFeedbackTone('wrong', progress.soundEnabled);
    }

    onRecordAnswer('missing', [missingQ.targetLetterId], isCorrect);
  };

  const handleRightClick = (rightItem: MatchPairItem) => {
    if (!selectedLeft || matchedIds.includes(rightItem.letterId)) return;

    const isCorrect = selectedLeft === rightItem.letterId;
    if (isCorrect) {
      const nextMatched = [...matchedIds, rightItem.letterId];
      setMatchedIds(nextMatched);
      setSelectedLeft(null);
      setSessionScore((s) => s + 10);
      setSessionStreak((st) => st + 1);
      playFeedbackTone(nextMatched.length === 5 ? 'win' : 'correct', progress.soundEnabled);
      onRecordAnswer('match', [rightItem.letterId], true);
    } else {
      setWrongFlash({ left: selectedLeft, right: rightItem.letterId });
      setSessionStreak(0);
      playFeedbackTone('wrong', progress.soundEnabled);
      onRecordAnswer('match', [selectedLeft], false);
      setTimeout(() => {
        setWrongFlash(null);
        setSelectedLeft(null);
      }, 450);
    }
  };

  const currentModeMeta = EXERCISE_MODES.find((m) => m.id === mode)!;

  return (
    <section aria-labelledby="mashqlar-heading" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 id="mashqlar-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">
            Interaktiv mashqlar
          </h2>
          <p className="text-sm text-slate-600 mt-1">{currentModeMeta.desc}</p>
        </div>

        {/* Session Metrics (unboxed text with tabular numerals) */}
        <div className="flex items-center gap-3 text-sm text-slate-600 tabular-nums shrink-0">
          <span>
            Joriy ball: <strong className="text-slate-900">{sessionScore}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            Ketma-ket toʻgʻri: <strong className="text-blue-700">{sessionStreak}</strong>
          </span>
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Mashq turlari"
        className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl"
      >
        {EXERCISE_MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Active Exercise Stage */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 max-w-3xl">
        {/* MODE 1 & 2: Audio Recognition / Translit Match */}
        {(mode === 'audio' || mode === 'translit') && mcQuestion && (
          <div className="space-y-8">
            {mode === 'audio' ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <p className="text-sm font-medium text-slate-500">
                  Quyidagi tugmani bosing va eshitilgan harfni toping
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => speakRussian(mcQuestion.target.speakText, 0.9)}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>Tovushni tinglash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => speakRussian(mcQuestion.target.speakText, 0.6)}
                    className="px-4 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                  >
                    Sekin (0.6x)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-slate-500">
                  Ushbu ruscha harf qaysi tovushni bildiradi?
                </p>
                <div className="text-7xl font-bold text-slate-900 tracking-tight py-2">
                  {mcQuestion.target.upper}
                  <span className="text-slate-400 font-normal ml-2">{mcQuestion.target.lower}</span>
                </div>
              </div>
            )}

            {/* 4 Options */}
            <div className="grid grid-cols-2 gap-3.5">
              {mcQuestion.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                const isTarget = opt.id === mcQuestion.target.id;
                const answered = selectedOptionId !== null;

                let btnStyle =
                  'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-900';
                if (answered) {
                  if (isTarget) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900';
                  } else if (isSelected) {
                    btnStyle = 'border-red-400 bg-red-50 text-red-900';
                  } else {
                    btnStyle = 'border-slate-200 bg-slate-50 text-slate-400';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={answered}
                    onClick={() => handleMCAnswer(opt)}
                    className={`min-h-[76px] p-4 rounded-xl border-2 text-center flex flex-col items-center justify-center transition-all ${btnStyle}`}
                  >
                    {mode === 'audio' ? (
                      <span className="text-3xl font-bold">
                        {opt.upper} {opt.lower}
                      </span>
                    ) : (
                      <>
                        <span className="text-xl font-bold font-mono">[{opt.translit}]</span>
                        <span className="text-xs text-slate-500 mt-0.5">{opt.name}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback Banner */}
            {selectedOptionId !== null && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  {selectedOptionId === mcQuestion.target.id ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">
                      {selectedOptionId === mcQuestion.target.id
                        ? "Barakalla! To'g'ri javob."
                        : `To'g'ri javob: ${mcQuestion.target.upper}${mcQuestion.target.lower} [${mcQuestion.target.translit}]`}
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      {mcQuestion.target.pronunciationUz}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => generateMC(mode)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Keyingi savol
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: Missing Letter in Russian Word */}
        {mode === 'missing' && missingQ && (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-slate-500">
                Tarjimasi: <strong className="text-slate-900">{missingQ.uz}</strong> · Talaffuzi: [{missingQ.translit}]
              </p>
              <div className="text-4xl sm:text-5xl font-bold tracking-[0.18em] text-slate-900 py-3 font-mono">
                {selectedMissingChar !== null ? missingQ.wordRu : missingQ.maskedWord}
              </div>
              <button
                type="button"
                onClick={() => speakRussian(missingQ.wordRu, 0.85)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                <span>Soʻzni tinglash</span>
              </button>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {missingQ.options.map((ch) => {
                const answered = selectedMissingChar !== null;
                const isTarget = ch === missingQ.missingChar;
                const isSelected = selectedMissingChar === ch;

                let cls = 'border-slate-200 bg-white hover:border-blue-400 text-slate-900';
                if (answered) {
                  if (isTarget) cls = 'border-emerald-500 bg-emerald-50 text-emerald-900';
                  else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-900';
                  else cls = 'border-slate-200 bg-slate-50 text-slate-400';
                }

                return (
                  <button
                    key={ch}
                    type="button"
                    disabled={answered}
                    onClick={() => handleMissingAnswer(ch)}
                    className={`h-16 rounded-xl border-2 text-2xl font-bold transition-all ${cls}`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>

            {selectedMissingChar !== null && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-sm">
                  {selectedMissingChar === missingQ.missingChar ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">
                        Toʻgʻri! «{missingQ.wordRu}» — {missingQ.uz}.
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span className="font-semibold text-slate-900">
                        Toʻgʻri harf: {missingQ.missingChar} («{missingQ.wordRu}»).
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={generateMissing}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Keyingi soʻz
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODE 4: Match Pairs */}
        {mode === 'match' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Avval chapdagi harfni, soʻng oʻngdagi oʻqilishini bosing</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {matchedIds.length} / 5 juftlik
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-8">
              {/* Left column: Cyrillic letters */}
              <div className="space-y-2.5">
                {leftPairs.map((item) => {
                  const isMatched = matchedIds.includes(item.letterId);
                  const isSelected = selectedLeft === item.letterId;
                  const isWrong = wrongFlash?.left === item.letterId;

                  let cls = 'border-slate-200 bg-white hover:border-blue-400 text-slate-900';
                  if (isMatched) cls = 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-70';
                  else if (isWrong) cls = 'border-red-500 bg-red-50 text-red-900';
                  else if (isSelected) cls = 'border-blue-700 bg-blue-50 text-blue-900 ring-1 ring-blue-700';

                  return (
                    <button
                      key={item.letterId}
                      type="button"
                      disabled={isMatched}
                      onClick={() => {
                        setSelectedLeft(item.letterId);
                        const letterObj = RUSSIAN_ALPHABET.find((l) => l.id === item.letterId);
                        if (letterObj) speakRussian(letterObj.speakText, 0.9);
                      }}
                      className={`w-full h-14 px-4 rounded-xl border-2 text-xl font-bold flex items-center justify-between transition-all ${cls}`}
                    >
                      <span>{item.upper}</span>
                      <Volume2 className="w-4 h-4 opacity-50" />
                    </button>
                  );
                })}
              </div>

              {/* Right column: Uzbek phonetic readings */}
              <div className="space-y-2.5">
                {rightPairs.map((item) => {
                  const isMatched = matchedIds.includes(item.letterId);
                  const isWrong = wrongFlash?.right === item.letterId;

                  let cls = 'border-slate-200 bg-white hover:border-blue-400 text-slate-900';
                  if (isMatched) cls = 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-70';
                  else if (isWrong) cls = 'border-red-500 bg-red-50 text-red-900';

                  return (
                    <button
                      key={item.letterId}
                      type="button"
                      disabled={isMatched || !selectedLeft}
                      onClick={() => handleRightClick(item)}
                      className={`w-full h-14 px-4 rounded-xl border-2 text-base font-mono font-semibold flex items-center justify-center transition-all ${cls} ${
                        !selectedLeft && !isMatched ? 'opacity-80' : ''
                      }`}
                    >
                      [{item.translit}]
                    </button>
                  );
                })}
              </div>
            </div>

            {matchedIds.length === 5 && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Barcha 5 ta juftlik toʻgʻri topildi!</span>
                </div>
                <button
                  type="button"
                  onClick={generateMatch}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Yangi juftliklar</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
