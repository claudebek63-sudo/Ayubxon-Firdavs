import React, { useState } from 'react';
import { ArrowRight, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { AppTab, LearnerProgress } from '../types/learning';

interface HeroSectionProps {
  progress: LearnerProgress;
  onSelectTab: (tab: AppTab) => void;
  onToggleSound: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  progress,
  onSelectTab,
  onToggleSound,
}) => {
  const [imgError, setImgError] = useState(false);

  const accuracy =
    progress.exerciseStats.totalAnswered > 0
      ? Math.round((progress.exerciseStats.totalCorrect / progress.exerciseStats.totalAnswered) * 100)
      : 0;

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Editorial Introduction & Primary Actions */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-blue-700 mb-3">
              Rus tili platformasi · Kirill alifbosi va muloqot
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-slate-900 leading-[1.15] mb-4">
              Rus tili harflari va soʻzlarini tizimli oʻrganing
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
              33 ta ruscha harfning aniq talaffuzi, yozma mashqlar, interaktiv testlar, xotira va tezkorlik oʻyinlari hamda tarjimali kundalik lugʻat bir joyda.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => onSelectTab('mashqlar')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <span>Interaktiv mashqlar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('oyinlar')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                <span>Harf oʻyinlari</span>
              </button>
              <button
                type="button"
                onClick={onToggleSound}
                aria-label={progress.soundEnabled ? "Ovozli effektlarni o'chirish" : "Ovozli effektlarni yoqish"}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                {progress.soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-blue-700" />
                    <span>Ovoz yoqilgan</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>Ovoz oʻchiq</span>
                  </>
                )}
              </button>
            </div>

            {/* Unboxed metadata summary with typographic separators */}
            <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 tabular-nums">
              <span>
                Oʻzlashtirilgan harflar: <strong className="text-slate-900">{progress.masteredLetters.length}/33</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                Aniqlik: <strong className="text-slate-900">{accuracy}%</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                Toʻplangan ball: <strong className="text-slate-900">{progress.exerciseStats.xp} XP</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Hero Photograph */}
        <div className="lg:col-span-5 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden min-h-[260px] lg:min-h-0 flex">
          {!imgError ? (
            <img
              src="/src/assets/images/hero_russian_study_1795059757305.jpg"
              alt="Rus tili yozuv daftari va kirill alifbosi kalligrafiyasi"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-blue-50">
              <BookOpen className="w-10 h-10 text-blue-700 mb-3" />
              <p className="font-serif text-3xl font-semibold text-slate-900 mb-1">А · Б · В · Г</p>
              <p className="text-sm text-slate-600">Rus tili alifbosi va talaffuz studiyasi</p>
            </div>
          )}
        </div>
      </div>

      {/* Full-width 4-column summary strip below hero split */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <button
          type="button"
          onClick={() => onSelectTab('alifbo')}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-5 transition-colors"
        >
          <p className="text-2xl font-bold text-slate-900 tabular-nums">33 ta harf</p>
          <p className="text-sm text-slate-600 mt-1">Audio talaffuz va yozish taxtasi</p>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('mashqlar')}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-5 transition-colors"
        >
          <p className="text-2xl font-bold text-slate-900 tabular-nums">4 xil mashq</p>
          <p className="text-sm text-slate-600 mt-1">Tinglash, oʻqish va moslashtirish</p>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('oyinlar')}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-5 transition-colors"
        >
          <p className="text-2xl font-bold text-slate-900 tabular-nums">2 ta oʻyin</p>
          <p className="text-sm text-slate-600 mt-1">Xotira kartalari va tezkor ovchi</p>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('lugat')}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-5 transition-colors"
        >
          <p className="text-2xl font-bold text-slate-900 tabular-nums">48 ta soʻz</p>
          <p className="text-sm text-slate-600 mt-1">Tarjima, misollar va kartochkalar</p>
        </button>
      </div>
    </section>
  );
};
