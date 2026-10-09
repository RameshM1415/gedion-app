import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1400,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Smooth progress animation from 0% to 100% within the 1.2s - 1.5s target duration
    const startTime = Date.now();
    const duration = minDurationMs;

    let animId: number;
    let fadeTimer: ReturnType<typeof setTimeout>;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const current = Math.min(100, (elapsed / duration) * 100);
      setProgress(current);

      if (current < 100) {
        animId = requestAnimationFrame(updateProgress);
      } else {
        // When progress hits 100%, trigger smooth fade out without requiring manual tap
        setIsFadingOut(true);
        fadeTimer = setTimeout(() => {
          onComplete();
        }, 380);
      }
    };

    animId = requestAnimationFrame(updateProgress);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [minDurationMs, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#ffffff] select-none overflow-hidden transition-opacity duration-400 ${
        isFadingOut ? 'pointer-events-none opacity-0' : 'pointer-events-auto'
      }`}
    >
      {/* Top spacing placeholder for optical vertical centering */}
      <div className="w-full h-12" />

      {/* Centered 3D Brand Presentation & Loading Progress */}
      <div className="flex flex-col items-center justify-center -mt-6">
        {/* Modern 3D Brand Emblem Container with dimensional depth */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 16 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: [0, -5, 0],
          }}
          transition={{
            scale: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.4 },
            y: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          className="relative flex items-center justify-center"
        >
          {/* Dimensional ambient color glow under 3D emblem */}
          <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-tr from-[#f59e0b]/25 via-[#ec4899]/20 to-[#8b5cf6]/25 blur-2xl opacity-75" />

          {/* 3D Visual Box with dimensional drop-shadows */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] p-[2.5px] bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] to-[#8b5cf6] shadow-[0_20px_40px_rgba(0,0,0,0.12),0_8px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="w-full h-full rounded-[25px] overflow-hidden bg-white flex items-center justify-center shadow-inner relative">
              <img
                src="https://i.postimg.cc/1XtyC1ff/file-000000007ca8820bb8633872f223383f.png"
                alt="GediOn"
                className="w-full h-full object-contain select-none pointer-events-none"
              />
              {/* Subtle glass highlight sheen */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Animated Loading Progress Bar */}
        <div className="mt-8 flex flex-col items-center">
          {/* Track: Light neutral-200 track */}
          <div className="h-1 w-44 rounded-full overflow-hidden bg-neutral-200/80 shadow-inner">
            {/* Fill: Dynamic animated indicator with Instagram gradient */}
            <div
              className="h-full rounded-full transition-all duration-75 ease-linear"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(to right, #f59e0b, #ec4899, #8b5cf6)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Clean Bottom Brand Footer */}
      <div className="pb-10 flex flex-col items-center gap-1 select-none pointer-events-none">
        <span className="text-[11px] text-neutral-400 font-semibold tracking-[0.2em] uppercase">
          from
        </span>
        <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#f59e0b] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent">
          GediOn
        </span>
      </div>
    </motion.div>
  );
};

