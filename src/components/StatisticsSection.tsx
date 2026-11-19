import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, Flame, RotateCcw, Trophy } from 'lucide-react';
import { RUSSIAN_ALPHABET } from '../data/russianAlphabet';
import { RUSSIAN_VOCABULARY } from '../data/russianVocabulary';
import { DailyActivityEntry, ExerciseType, LearnerProgress } from '../types/learning';

interface StatisticsSectionProps {
  progress: LearnerProgress;
  onJumpToLetter: (letterId: string) => void;
  onResetProgress: () => void;
}

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  audio: 'Tovushni top (tinglash)',
  translit: 'Harf va talaffuz',
  missing: "So'zni to'ldir",
  match: "Juftlikni bog'la",
};

function getLastNDays(count: number): { key: string; label: string; dayNum: string; isToday: boolean }[] {
  const days: { key: string; label: string; dayNum: string; isToday: boolean }[] = [];
  const weekdayUz = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
  for (let offset = count - 1; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push({
      key: `${y}-${m}-${day}`,
      label: offset === 0 ? 'Bugun' : weekdayUz[d.getDay()],
      dayNum: String(d.getDate()),
      isToday: offset === 0,
    });
  }
  return days;
}

function isDayActive(entry?: DailyActivityEntry): boolean {
  if (!entry) return false;
  return Boolean(entry.visited || entry.xp > 0 || entry.exercises > 0 || entry.games > 0 || entry.words > 0);
}

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({
  progress,
  onJumpToLetter,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const masteredCount = progress.masteredLetters.length;
  const letterPercent = Math.round((masteredCount / RUSSIAN_ALPHABET.length) * 100);

  const accuracy =
    progress.exerciseStats.totalAnswered > 0
      ? Math.round(
          (progress.exerciseStats.totalCorrect / progress.exerciseStats.totalAnswered) * 100
        )
      : 0;

  const wordsLearnedCount = progress.learnedWords.length;
  const wordsPercent = Math.round((wordsLearnedCount / RUSSIAN_VOCABULARY.length) * 100);

  const last7Days = getLastNDays(7);
  const dayValues = last7Days.map((d) => ({
    ...d,
    xp: progress.dailyActivity[d.key]?.xp || 0,
    exercises: progress.dailyActivity[d.key]?.exercises || 0,
  }));
  const maxDayXp = Math.max(50, ...dayValues.map((d) => d.xp));

  // Build 14-day streak window & identify consecutive runs
  const last14Days = getLastNDays(14).map((d) => {
    const entry = progress.dailyActivity[d.key];
    const active = isDayActive(entry);
    return {
      ...d,
      active,
      xp: entry?.xp || 0,
      exercises: entry?.exercises || 0,
      games: entry?.games || 0,
      words: entry?.words || 0,
    };
  });

  // Determine which days in the 14-day strip belong to the current consecutive streak ending today (or yesterday)
  const currentStreakKeys = new Set<string>();
  let scanIdx = last14Days.length - 1;
  if (scanIdx >= 0 && !last14Days[scanIdx].active && scanIdx > 0 && last14Days[scanIdx - 1].active) {
    scanIdx -= 1;
  }
  while (scanIdx >= 0 && last14Days[scanIdx].active) {
    currentStreakKeys.add(last14Days[scanIdx].key);
    scanIdx -= 1;
  }

  const totalActiveDays = Object.values(progress.dailyActivity).filter(isDayActive).length;
  const bestStreak = Math.max(progress.bestStreakDays || 0, progress.streakDays);
  const streakMilestones = [3, 7, 14, 30, 60];
  const nextMilestone = streakMilestones.find((m) => m > progress.streakDays) || 90;
  const milestonePct = Math.min(100, Math.round((progress.streakDays / nextMilestone) * 100));

  const categoryBreakdown = (
    [
      { id: 'unli', label: 'Unlilar' },
      { id: 'undosh', label: 'Undoshlar' },
      { id: 'belgi', label: 'Belgilar' },
    ] as const
  ).map((cat) => {
    const total = RUSSIAN_ALPHABET.filter((l) => l.category === cat.id).length;
    const done = RUSSIAN_ALPHABET.filter(
      (l) => l.category === cat.id && progress.masteredLetters.includes(l.id)
    ).length;
    return {
      ...cat,
      total,
      done,
      pct: Math.round((done / total) * 100),
    };
  });

  return (
    <section aria-labelledby="statistika-heading" className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 id="statistika-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">
            Oʻquvchi statistikasi va progress
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Mashqlar, oʻyinlar va lugʻatdagi barcha natijalaringiz avtomatik saqlanib boradi.
          </p>
        </div>

        {/* Reset Progress Controls */}
        <div className="shrink-0">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Progressni tozalash</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-medium text-red-900">Aniq oʻchirasizmi?</span>
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Ha, oʻchirish
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg"
              >
                Bekor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Oʻzlashtirilgan harflar</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
            {masteredCount} <span className="text-lg font-medium text-slate-400">/ 33</span>
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-2 tabular-nums">
            {letterPercent}% alifbo yakunlangan
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Mashqlar aniqligi</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{accuracy}%</p>
          <p className="text-xs text-slate-600 mt-2 tabular-nums">
            {progress.exerciseStats.totalCorrect} / {progress.exerciseStats.totalAnswered} toʻgʻri javob
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Oʻrganilgan soʻzlar</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
            {wordsLearnedCount}{' '}
            <span className="text-lg font-medium text-slate-400">
              / {RUSSIAN_VOCABULARY.length}
            </span>
          </p>
          <p className="text-xs text-blue-700 font-medium mt-2 tabular-nums">
            {wordsPercent}% lugʻat oʻzlashtirilgan
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Umumiy ball va seriya</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
            {progress.exerciseStats.xp} <span className="text-lg font-medium text-slate-400">XP</span>
          </p>
          <p className="text-xs text-slate-600 mt-2 tabular-nums">
            Kunlik seriya: <strong className="text-slate-900">{progress.streakDays} kun</strong>
          </p>
        </div>
      </div>

      {/* Daily Study Streak Tracker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                progress.streakDays > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">Kunlik oʻqish seriyasi</h3>
                <span className="text-sm font-semibold text-amber-700 tabular-nums">
                  {progress.streakDays} kun ketma-ket
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {progress.streakDays > 0
                  ? 'Ketma-ket faol boʻlgan kunlar ulangan zanjir koʻrinishida ajratib koʻrsatilgan.'
                  : 'Ilovadan har kuni foydalaning va ketma-ket oʻqish seriyasini boshlang.'}
              </p>
            </div>
          </div>

          {/* Unboxed streak summary metrics */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
            <span>
              Rekord seriya: <strong className="text-slate-900">{bestStreak} kun</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>
              Jami faol kunlar: <strong className="text-slate-900">{totalActiveDays} kun</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>
              Keyingi maqsad: <strong className="text-blue-700">{nextMilestone} kun</strong>
            </span>
          </div>
        </div>

        {/* 14-Day Consecutive Days Visual Strip */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <span>Soʻnggi 14 kunlik taqvim</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                <Flame className="w-3.5 h-3.5" />
                <span>Ketma-ket faol</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Oldingi faol kun</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 lg:grid-cols-14 gap-1.5 sm:gap-2">
            {last14Days.map((day, idx) => {
              const inCurrentStreak = currentStreakKeys.has(day.key);
              const prevActive = idx > 0 && last14Days[idx - 1].active;
              const nextActive = idx < last14Days.length - 1 && last14Days[idx + 1].active;
              const isConsecutive = day.active && (prevActive || nextActive);

              let cellStyle = 'border-slate-200 bg-slate-50 text-slate-400';
              if (inCurrentStreak) {
                cellStyle = 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-200';
              } else if (day.active && isConsecutive) {
                cellStyle = 'border-emerald-300 bg-emerald-50 text-emerald-900';
              } else if (day.active) {
                cellStyle = 'border-emerald-200 bg-emerald-50/70 text-emerald-800';
              }

              return (
                <div key={day.key} className="relative flex flex-col items-center">
                  {/* Connector line between consecutive active days on desktop */}
                  {day.active && nextActive && (
                    <div
                      aria-hidden="true"
                      className={`hidden lg:block absolute top-1/2 -right-2.5 w-3 h-0.5 z-0 ${
                        inCurrentStreak && currentStreakKeys.has(last14Days[idx + 1].key)
                          ? 'bg-amber-400'
                          : 'bg-emerald-300'
                      }`}
                    />
                  )}
                  <div
                    title={`${day.key}${day.active ? ` — Faol (${day.xp} XP)` : ' — Faollik yoʻq'}`}
                    className={`relative z-10 w-full py-2.5 px-1 rounded-xl border flex flex-col items-center justify-between gap-1 text-center transition-colors ${cellStyle}`}
                  >
                    <span
                      className={`text-[10px] font-semibold leading-none ${
                        day.isToday ? 'text-blue-700' : ''
                      }`}
                    >
                      {day.label}
                    </span>
                    <span className="text-xs font-mono font-bold tabular-nums leading-none">
                      {day.dayNum}
                    </span>
                    <div className="h-4 flex items-center justify-center">
                      {inCurrentStreak ? (
                        <Flame className="w-3.5 h-3.5 text-amber-600" aria-label="Ketma-ket faol kun" />
                      ) : day.active ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-label="Faol kun" />
                      ) : (
                        <span className="text-[11px] text-slate-300" aria-label="Faol emas">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">
              {nextMilestone} kunlik seriya maqsadi sari
            </span>
            <span className="font-mono text-slate-600 tabular-nums">
              {progress.streakDays} / {nextMilestone} kun ({milestonePct}%)
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${milestonePct}%` }}
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Charts Row: 7-Day Activity SVG Chart + Category & Exercise Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Activity Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Soʻnggi 7 kunlik faollik (XP)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Har bir mashq, oʻyin va oʻrganilgan soʻz kundalik faollikni oshiradi
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Jami: {dayValues.reduce((acc, d) => acc + d.xp, 0)} XP
            </span>
          </div>

          <div className="w-full pt-2">
            <svg
              viewBox="0 0 560 190"
              className="w-full h-48 overflow-visible"
              role="img"
              aria-label="So'nggi 7 kunlik faollik grafigi"
            >
              {/* Horizontal gridlines */}
              {[0, 0.5, 1].map((ratio, idx) => {
                const y = 150 - ratio * 120;
                const val = Math.round(maxDayXp * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={38}
                      y1={y}
                      x2={548}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray={ratio === 0 ? undefined : '4 4'}
                    />
                    <text
                      x={30}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[11px] font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {dayValues.map((d, i) => {
                const barWidth = 40;
                const gap = (500 - barWidth * 7) / 6;
                const x = 48 + i * (barWidth + gap);
                const barHeight = d.xp > 0 ? Math.max(8, (d.xp / maxDayXp) * 120) : 4;
                const y = 150 - barHeight;
                return (
                  <g key={d.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={6}
                      className={d.xp > 0 ? 'fill-blue-700' : 'fill-slate-200'}
                    />
                    {d.xp > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className="fill-slate-700 text-[11px] font-mono font-semibold"
                      >
                        {d.xp}
                      </text>
                    )}
                    <text
                      x={x + barWidth / 2}
                      y={172}
                      textAnchor="middle"
                      className="fill-slate-500 text-[11px] font-medium"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Category & Exercise Accuracy Breakdown */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3">Harf guruhlari boʻyicha</h3>
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.label}</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {cat.done}/{cat.total} ({cat.pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${cat.pct}%` }}
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-3">Mashq turlari natijasi</h3>
            <div className="space-y-2.5">
              {(Object.keys(EXERCISE_LABELS) as ExerciseType[]).map((type) => {
                const st = progress.exerciseStats.byType[type];
                const pct = st.attempts > 0 ? Math.round((st.correct / st.attempts) * 100) : 0;
                return (
                  <div key={type} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-700 truncate">{EXERCISE_LABELS[type]}</span>
                    <span className="font-mono text-slate-600 tabular-nums shrink-0">
                      {st.attempts > 0 ? `${pct}% (${st.correct}/${st.attempts})` : 'Boshlanmagan'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 33-Letter Mastery Heatmap */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">33 ta harf xaritasi</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Istalgan harfni bosib, alifbo boʻlimida qayta mashq qilishingiz mumkin
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Oʻzlashtirilgan</span>
            </span>
            <span>·</span>
            <span className="text-blue-700 font-medium">Mashq qilingan</span>
            <span>·</span>
            <span className="text-slate-400">Yangi</span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
          {RUSSIAN_ALPHABET.map((letter) => {
            const isMastered = progress.masteredLetters.includes(letter.id);
            const stat = progress.letterStats[letter.id];
            const isPracticed = !!stat && stat.attempts > 0;

            return (
              <button
                key={letter.id}
                type="button"
                onClick={() => onJumpToLetter(letter.id)}
                title={`${letter.upper}${letter.lower} [${letter.translit}]`}
                className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                  isMastered
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                    : isPracticed
                    ? 'border-blue-200 bg-blue-50/70 text-blue-900 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className="text-lg leading-none">{letter.upper}</span>
                <span className="text-[10px] font-mono mt-1 tabular-nums">
                  {isMastered ? 'Tayyor' : isPracticed ? `${stat.correct}/${stat.attempts}` : '0'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Records */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-600" />
          <h3 className="text-base font-bold text-slate-900">Oʻyin rekordlari</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm tabular-nums">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">Xotira kartalari (yutilgan)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {progress.gameStats.memoryGamesWon} marta
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">Tezkor harf ovchisi (rekord)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {progress.gameStats.catcherBestScore} ball
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">Eng uzun ketma-ketlik</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {progress.gameStats.catcherBestCombo}x
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
