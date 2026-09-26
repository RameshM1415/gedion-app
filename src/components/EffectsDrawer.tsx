import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, RotateCcw, Check } from 'lucide-react';
import {
  EffectPreset,
  EffectCategory,
  EFFECT_CATEGORIES,
  EFFECT_PRESETS,
} from '../data/effectsPresets';

interface EffectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilterName: string;
  onSelectFilter: (preset: EffectPreset) => void;
}

export const EffectsDrawer: React.FC<EffectsDrawerProps> = ({
  isOpen,
  onClose,
  activeFilterName,
  onSelectFilter,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory>(
    'Viral'
  );

  const filteredPresets = useMemo(() => {
    return EFFECT_PRESETS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const normalPreset = useMemo(
    () => EFFECT_PRESETS.find((p) => p.id === 'normal') || EFFECT_PRESETS[0],
    []
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 flex flex-col max-h-[72vh] w-full rounded-t-3xl border-t border-white/15 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-2xl overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/25" />
            </div>

            {/* Header: Title, Reset / Normal Button, and Close ✕ Button */}
            <div className="flex items-center justify-between px-4 pb-2.5 pt-1 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-cyan-400 p-0.5">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-black">
                    <Sparkles size={14} className="text-pink-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                    Trending Effects
                  </h3>
                  <p className="text-[10px] text-white/50">
                    Active: <span className="text-cyan-300 font-medium">{activeFilterName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Normal / Reset button */}
                <button
                  onClick={() => onSelectFilter(normalPreset)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                    activeFilterName === 'Normal'
                      ? 'bg-white/20 border-white/40 text-white shadow-sm'
                      : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Reset to original camera feed"
                >
                  <RotateCcw size={11} />
                  <span>Normal / Reset</span>
                </button>

                {/* Close X Button */}
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white active:scale-95 transition-all"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Category Switcher Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 border-b border-white/5">
              {EFFECT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] font-semibold scale-[1.02]'
                        : 'bg-white/8 text-white/70 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 4-Column Grid of Effect Cards */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-8">
              <div className="grid grid-cols-4 gap-2.5">
                {filteredPresets.map((preset) => {
                  const isActive = activeFilterName === preset.name;
                  return (
                    <motion.button
                      key={preset.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => onSelectFilter(preset)}
                      className={`group relative flex flex-col items-center p-1.5 rounded-2xl transition-all duration-200 text-left ${
                        isActive
                          ? 'bg-white/15 ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.6)]'
                          : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Thumbnail Preview Box */}
                      <div
                        className={`relative w-full aspect-square rounded-xl bg-gradient-to-tr ${preset.previewGradient} flex items-center justify-center shadow-inner overflow-hidden`}
                        style={{ filter: preset.cssFilter !== 'none' ? preset.cssFilter : undefined }}
                      >
                        {/* Shimmer / vignette overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10" />

                        {isActive ? (
                          <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-black shadow-md">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        ) : (
                          <Sparkles
                            size={14}
                            className="relative z-10 text-white/60 group-hover:text-white transition-colors"
                          />
                        )}

                        {/* Optional Tag badge */}
                        {preset.tag && (
                          <span className="absolute top-1 right-1 z-10 rounded px-1 py-0.2 text-[8px] font-bold bg-black/60 text-white/90 backdrop-blur-xs">
                            {preset.tag}
                          </span>
                        )}
                      </div>

                      {/* Preset Name */}
                      <span
                        className={`mt-1.5 text-[11px] leading-tight text-center line-clamp-2 w-full px-0.5 ${
                          isActive ? 'text-cyan-300 font-bold' : 'text-white/80 group-hover:text-white'
                        }`}
                      >
                        {preset.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Bottom Comfortable Safe Padding */}
              <div className="h-6" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
