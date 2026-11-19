import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
} from 'lucide-react';
import { RUSSIAN_ALPHABET } from '../data/russianAlphabet';
import { LearnerProgress, RussianLetter } from '../types/learning';
import { playFeedbackTone, speakRussian } from '../utils/audio';

interface GamesSectionProps {
  progress: LearnerProgress;
  onRecordMemoryWin: (difficultyKey: string, moves: number) => void;
  onRecordCatcherGame: (score: number, maxCombo: number) => void;
}

type ActiveGame = 'memory' | 'catcher';
type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type MemoryDifficulty = 'oson' | 'orta' | 'qiyin';

interface MemoryCard {
  uid: string;
  pairId: string;
  kind: 'letter' | 'sound';
  display: string;
  sub: string;
  speakText: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface FallingTile {
  uid: string;
  letter: RussianLetter;
  xPercent: number; // 10 to 82
  yPx: number;
  speedPxPerSec: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MEMORY_CONFIG: Record<MemoryDifficulty, { label: string; pairs: number; cols: string }> = {
  oson: { label: 'Oson (6 juftlik)', pairs: 6, cols: 'grid-cols-3 sm:grid-cols-4' },
  orta: { label: "O'rta (8 juftlik)", pairs: 8, cols: 'grid-cols-4' },
  qiyin: { label: 'Qiyin (12 juftlik)', pairs: 12, cols: 'grid-cols-4 sm:grid-cols-6' },
};

export const GamesSection: React.FC<GamesSectionProps> = ({
  progress,
  onRecordMemoryWin,
  onRecordCatcherGame,
}) => {
  const [activeGame, setActiveGame] = useState<ActiveGame>('memory');

  // --- GAME 1: MEMORY MATCH STATE ---
  const [memState, setMemState] = useState<GameState>('TITLE_MENU');
  const [memDiff, setMemDiff] = useState<MemoryDifficulty>('oson');
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const lockBoardRef = useRef(false);

  // --- GAME 2: FALLING LETTERS CATCHER STATE ---
  const [catchState, setCatchState] = useState<GameState>('TITLE_MENU');
  const [catchScore, setCatchScore] = useState(0);
  const [catchLives, setCatchLives] = useState(3);
  const [catchCombo, setCatchCombo] = useState(0);
  const [catchMaxCombo, setCatchMaxCombo] = useState(0);
  const [catchLevel, setCatchLevel] = useState(1);
  const [targetLetter, setTargetLetter] = useState<RussianLetter>(RUSSIAN_ALPHABET[0]);
  const [fallingTiles, setFallingTiles] = useState<FallingTile[]>([]);
  const [catchFeedback, setCatchFeedback] = useState<string>('');

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const catchStateRef = useRef<GameState>('TITLE_MENU');
  const targetRef = useRef<RussianLetter>(RUSSIAN_ALPHABET[0]);
  const livesRef = useRef<number>(3);
  const scoreRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const recordedGameOverRef = useRef(false);

  useEffect(() => {
    catchStateRef.current = catchState;
  }, [catchState]);

  // Memory timer
  useEffect(() => {
    if (memState !== 'PLAYING') return;
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [memState]);

  const startMemoryGame = () => {
    const cfg = MEMORY_CONFIG[memDiff];
    const picked = shuffle(RUSSIAN_ALPHABET.filter((l) => l.category !== 'belgi')).slice(0, cfg.pairs);
    const deck: MemoryCard[] = [];
    picked.forEach((letter) => {
      deck.push({
        uid: `${letter.id}-L`,
        pairId: letter.id,
        kind: 'letter',
        display: `${letter.upper}${letter.lower}`,
        sub: 'Ruscha harf',
        speakText: letter.speakText,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        uid: `${letter.id}-S`,
        pairId: letter.id,
        kind: 'sound',
        display: `[${letter.translit}]`,
        sub: letter.name,
        speakText: letter.speakText,
        isFlipped: false,
        isMatched: false,
      });
    });

    setCards(shuffle(deck));
    setFlippedUids([]);
    setMoves(0);
    setElapsedSec(0);
    setIsNewRecord(false);
    lockBoardRef.current = false;
    setMemState('PLAYING');
  };

  const handleCardClick = (uid: string) => {
    if (memState !== 'PLAYING' || lockBoardRef.current) return;
    const clicked = cards.find((c) => c.uid === uid);
    if (!clicked || clicked.isFlipped || clicked.isMatched) return;

    playFeedbackTone('click', progress.soundEnabled);
    if (clicked.kind === 'letter') {
      speakRussian(clicked.speakText, 0.95);
    }

    const updatedCards = cards.map((c) => (c.uid === uid ? { ...c, isFlipped: true } : c));
    setCards(updatedCards);

    const nextFlipped = [...flippedUids, uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      lockBoardRef.current = true;
      const nextMoves = moves + 1;
      setMoves(nextMoves);

      const first = updatedCards.find((c) => c.uid === nextFlipped[0])!;
      const second = updatedCards.find((c) => c.uid === nextFlipped[1])!;

      if (first.pairId === second.pairId) {
        setTimeout(() => {
          setCards((prev) => {
            const matched = prev.map((c) =>
              c.pairId === first.pairId ? { ...c, isMatched: true } : c
            );
            const allDone = matched.every((c) => c.isMatched);
            if (allDone) {
              const prevBest = progress.gameStats.memoryBestMoves[memDiff];
              setIsNewRecord(prevBest === undefined || nextMoves < prevBest);
              onRecordMemoryWin(memDiff, nextMoves);
              playFeedbackTone('win', progress.soundEnabled);
              setMemState('GAME_OVER');
            } else {
              playFeedbackTone('correct', progress.soundEnabled);
            }
            return matched;
          });
          setFlippedUids([]);
          lockBoardRef.current = false;
        }, 260);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.uid === first.uid || c.uid === second.uid ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedUids([]);
          lockBoardRef.current = false;
        }, 700);
      }
    }
  };

  // --- CATCHER GAME LOGIC ---
  const spawnRoundTiles = useCallback((lvl: number): { target: RussianLetter; tiles: FallingTile[] } => {
    const pool = shuffle(RUSSIAN_ALPHABET.filter((l) => l.category !== 'belgi'));
    const nextTarget = pool[0];
    const distractors = pool.slice(1, 4);
    const allLetters = shuffle([nextTarget, ...distractors]);

    const xSlots = shuffle([12, 34, 56, 76]);
    const baseSpeed = 48 + (lvl - 1) * 11;

    const tiles: FallingTile[] = allLetters.map((letter, idx) => ({
      uid: `${letter.id}-${Date.now()}-${idx}`,
      letter,
      xPercent: xSlots[idx],
      yPx: -50 - idx * 42,
      speedPxPerSec: baseSpeed + Math.random() * 14,
    }));

    return { target: nextTarget, tiles };
  }, []);

  const endCatcherGame = useCallback(() => {
    if (recordedGameOverRef.current) return;
    recordedGameOverRef.current = true;
    setCatchState('GAME_OVER');
    catchStateRef.current = 'GAME_OVER';
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onRecordCatcherGame(scoreRef.current, maxComboRef.current);
    playFeedbackTone('wrong', progress.soundEnabled);
  }, [onRecordCatcherGame, progress.soundEnabled]);

  const startCatcherGame = () => {
    recordedGameOverRef.current = false;
    scoreRef.current = 0;
    livesRef.current = 3;
    maxComboRef.current = 0;
    levelRef.current = 1;

    const { target, tiles } = spawnRoundTiles(1);
    targetRef.current = target;

    setCatchScore(0);
    setCatchLives(3);
    setCatchCombo(0);
    setCatchMaxCombo(0);
    setCatchLevel(1);
    setTargetLetter(target);
    setFallingTiles(tiles);
    setCatchFeedback('');
    setCatchState('PLAYING');
    catchStateRef.current = 'PLAYING';
    lastFrameRef.current = performance.now();
    speakRussian(target.speakText, 0.92);
  };

  useEffect(() => {
    if (catchState !== 'PLAYING') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameRef.current = performance.now();

    const step = (now: number) => {
      if (catchStateRef.current !== 'PLAYING') return;
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const arenaHeight = arenaRef.current?.clientHeight || 400;

      setFallingTiles((prevTiles) => {
        let targetMissed = false;
        const moved = prevTiles.map((t) => ({
          ...t,
          yPx: t.yPx + t.speedPxPerSec * dt,
        }));

        for (const t of moved) {
          if (t.letter.id === targetRef.current.id && t.yPx > arenaHeight - 24) {
            targetMissed = true;
            break;
          }
        }

        if (targetMissed) {
          const nextLives = livesRef.current - 1;
          livesRef.current = nextLives;
          setCatchLives(nextLives);
          setCatchCombo(0);
          setCatchFeedback(`Oʻtkazib yuborildi: ${targetRef.current.upper} [${targetRef.current.translit}]`);
          playFeedbackTone('wrong', progress.soundEnabled);

          if (nextLives <= 0) {
            endCatcherGame();
            return [];
          }
          const nextRound = spawnRoundTiles(levelRef.current);
          targetRef.current = nextRound.target;
          setTargetLetter(nextRound.target);
          speakRussian(nextRound.target.speakText, 0.95);
          return nextRound.tiles;
        }

        return moved.filter((t) => t.yPx <= arenaHeight + 40);
      });

      if (catchStateRef.current === 'PLAYING') {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [catchState, spawnRoundTiles, endCatcherGame, progress.soundEnabled]);

  const handleTileCatch = (tile: FallingTile) => {
    if (catchState !== 'PLAYING') return;

    if (tile.letter.id === targetLetter.id) {
      const nextCombo = catchCombo + 1;
      const nextMax = Math.max(maxComboRef.current, nextCombo);
      const gained = 10 * Math.min(4, Math.max(1, Math.ceil(nextCombo / 2)));
      const nextScore = scoreRef.current + gained;
      const nextLevel = Math.floor(nextScore / 80) + 1;

      scoreRef.current = nextScore;
      maxComboRef.current = nextMax;
      levelRef.current = nextLevel;

      setCatchScore(nextScore);
      setCatchCombo(nextCombo);
      setCatchMaxCombo(nextMax);
      setCatchLevel(nextLevel);
      setCatchFeedback(`Toʻgʻri! +${gained} ball`);
      playFeedbackTone('correct', progress.soundEnabled);

      const nextRound = spawnRoundTiles(nextLevel);
      targetRef.current = nextRound.target;
      setTargetLetter(nextRound.target);
      setFallingTiles(nextRound.tiles);
      speakRussian(nextRound.target.speakText, 0.95);
    } else {
      const nextLives = livesRef.current - 1;
      livesRef.current = nextLives;
      setCatchLives(nextLives);
      setCatchCombo(0);
      setCatchFeedback(`Xato! Bu «${tile.letter.upper}» [${tile.letter.translit}] edi.`);
      playFeedbackTone('wrong', progress.soundEnabled);

      if (nextLives <= 0) {
        endCatcherGame();
      } else {
        setFallingTiles((prev) => prev.filter((t) => t.uid !== tile.uid));
      }
    }
  };

  return (
    <section aria-labelledby="oyinlar-heading" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 id="oyinlar-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">
            Harflarni oʻrganish oʻyinlari
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Xotira va tezkorlik oʻyinlari orqali ruscha harflarni tezroq eslab qoling.
          </p>
        </div>

        {/* Game Selector Tabs */}
        <div
          role="tablist"
          aria-label="O'yin tanlash"
          className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start"
        >
          <button
            role="tab"
            aria-selected={activeGame === 'memory'}
            type="button"
            onClick={() => setActiveGame('memory')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeGame === 'memory'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Xotira kartalari
          </button>
          <button
            role="tab"
            aria-selected={activeGame === 'catcher'}
            type="button"
            onClick={() => setActiveGame('catcher')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeGame === 'catcher'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tezkor harf ovchisi
          </button>
        </div>
      </div>

      {/* GAME 1: MEMORY MATCH */}
      {activeGame === 'memory' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          {memState === 'TITLE_MENU' && (
            <div className="max-w-xl mx-auto text-center py-6 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Xotira kartalari</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Kartochkalarni oching va har bir ruscha harfni uning oʻzbekcha talaffuzi bilan juftlang. Kamroq yurishda tugatishga harakat qiling.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">Qiyinlik darajasini tanlang</p>
                <div className="inline-flex flex-wrap justify-center gap-1 p-1 bg-slate-100 rounded-xl">
                  {(Object.keys(MEMORY_CONFIG) as MemoryDifficulty[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMemDiff(key)}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        memDiff === key
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {MEMORY_CONFIG[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {progress.gameStats.memoryBestMoves[memDiff] !== undefined && (
                <p className="text-sm text-slate-600 tabular-nums">
                  Eng yaxshi natija ({MEMORY_CONFIG[memDiff].label}):{' '}
                  <strong className="text-slate-900">
                    {progress.gameStats.memoryBestMoves[memDiff]} ta yurish
                  </strong>
                </p>
              )}

              <button
                type="button"
                onClick={startMemoryGame}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Oʻyinni boshlash</span>
              </button>
            </div>
          )}

          {memState === 'PLAYING' && (
            <div className="space-y-6">
              {/* Unobtrusive HUD */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4 text-sm text-slate-600 tabular-nums">
                  <span>
                    Yurishlar: <strong className="text-slate-900">{moves}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    Vaqt: <strong className="text-slate-900">{elapsedSec} s</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    Topildi:{' '}
                    <strong className="text-emerald-700">
                      {cards.filter((c) => c.isMatched).length / 2} / {MEMORY_CONFIG[memDiff].pairs}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={startMemoryGame}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Qayta boshlash</span>
                </button>
              </div>

              {/* Card Grid */}
              <div className={`grid ${MEMORY_CONFIG[memDiff].cols} gap-3 max-w-3xl mx-auto`}>
                {cards.map((card) => {
                  const revealed = card.isFlipped || card.isMatched;
                  return (
                    <button
                      key={card.uid}
                      type="button"
                      onClick={() => handleCardClick(card.uid)}
                      disabled={revealed}
                      className={`h-24 sm:h-28 rounded-xl border-2 p-3 flex flex-col items-center justify-center text-center transition-all duration-150 ${
                        card.isMatched
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                          : revealed
                          ? 'border-blue-600 bg-blue-50 text-slate-900'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200/70 hover:border-slate-300 text-slate-400'
                      }`}
                    >
                      {revealed ? (
                        <>
                          <span
                            className={`${
                              card.kind === 'letter' ? 'text-3xl font-bold' : 'text-lg font-mono font-bold text-blue-800'
                            }`}
                          >
                            {card.display}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-1">{card.sub}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-serif font-semibold text-slate-400">?</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {memState === 'GAME_OVER' && (
            <div className="max-w-md mx-auto text-center py-8 space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Barcha juftliklar topildi!</h3>
                <p className="text-sm text-slate-600 mt-1 tabular-nums">
                  {moves} ta yurish · {elapsedSec} soniya · +35 XP qoʻshildi
                </p>
                {isNewRecord && (
                  <p className="text-sm font-semibold text-blue-700 mt-2">
                    Yangi shaxsiy rekord!
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startMemoryGame}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Qayta oʻynash
                </button>
                <button
                  type="button"
                  onClick={() => setMemState('TITLE_MENU')}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  Darajani oʻzgartirish
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME 2: FALLING LETTERS CATCHER */}
      {activeGame === 'catcher' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          {catchState === 'TITLE_MENU' && (
            <div className="max-w-xl mx-auto text-center py-6 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Tezkor harf ovchisi</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Yuqorida koʻrsatilgan talaffuzga mos ruscha harfni tushib ketishidan oldin bosing. Har bir ketma-ket toʻgʻri javob ochko koeffitsiyentini oshiradi!
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-slate-600 tabular-nums">
                <span>
                  Eng yuqori ball: <strong className="text-slate-900">{progress.gameStats.catcherBestScore}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  Eng uzun seriya: <strong className="text-slate-900">{progress.gameStats.catcherBestCombo}x</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={startCatcherGame}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Oʻyinni boshlash</span>
              </button>
            </div>
          )}

          {(catchState === 'PLAYING' || catchState === 'PAUSED') && (
            <div className="space-y-4">
              {/* Top HUD */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">Toping:</span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg font-mono text-lg font-bold text-blue-800">
                      [{targetLetter.translit}]
                    </span>
                    <span className="text-sm font-medium text-slate-700">{targetLetter.name}</span>
                    <button
                      type="button"
                      onClick={() => speakRussian(targetLetter.speakText, 0.92)}
                      aria-label="Tovushni qayta tinglash"
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm tabular-nums">
                  <span>
                    Ball: <strong className="text-slate-900">{catchScore}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    Seriya: <strong className="text-amber-700">{catchCombo}x</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    Daraja: <strong className="text-slate-900">{catchLevel}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <div className="flex items-center gap-1" aria-label={`Jonlar: ${catchLives} ta`}>
                    {[1, 2, 3].map((i) => (
                      <Heart
                        key={i}
                        className={`w-4 h-4 ${
                          i <= catchLives ? 'text-red-600 fill-red-600' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCatchState((s) => (s === 'PLAYING' ? 'PAUSED' : 'PLAYING'))
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                  >
                    {catchState === 'PLAYING' ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pauza</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Davom etish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Arena */}
              <div
                ref={arenaRef}
                className="relative h-[400px] w-full bg-slate-900 rounded-xl overflow-hidden select-none"
              >
                {fallingTiles.map((tile) => (
                  <button
                    key={tile.uid}
                    type="button"
                    onClick={() => handleTileCatch(tile)}
                    style={{
                      left: `${tile.xPercent}%`,
                      transform: `translate3d(0, ${tile.yPx}px, 0)`,
                    }}
                    className="absolute top-0 w-16 h-16 sm:w-20 sm:h-20 bg-white hover:bg-blue-50 text-slate-900 rounded-xl shadow-md border-2 border-slate-200 flex flex-col items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    <span className="text-2xl sm:text-3xl font-bold leading-none">
                      {tile.letter.upper}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">{tile.letter.lower}</span>
                  </button>
                ))}

                {catchState === 'PAUSED' && (
                  <div className="absolute inset-0 bg-slate-900/75 flex flex-col items-center justify-center gap-4 text-white">
                    <p className="text-xl font-bold">Oʻyin toʻxtatildi</p>
                    <button
                      type="button"
                      onClick={() => setCatchState('PLAYING')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold"
                    >
                      Davom ettirish
                    </button>
                  </div>
                )}

                {catchFeedback && (
                  <div className="absolute bottom-3 left-4 text-xs font-medium text-slate-300 pointer-events-none">
                    {catchFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {catchState === 'GAME_OVER' && (
            <div className="max-w-md mx-auto text-center py-8 space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Oʻyin yakunlandi</h3>
                <p className="text-sm text-slate-600 mt-1 tabular-nums">
                  Yakuniy ball: <strong className="text-slate-900">{catchScore}</strong> · Eng uzun seriya:{' '}
                  <strong className="text-slate-900">{catchMaxCombo}x</strong>
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startCatcherGame}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Qayta oʻynash
                </button>
                <button
                  type="button"
                  onClick={() => setCatchState('TITLE_MENU')}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  Menyuga qaytish
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
