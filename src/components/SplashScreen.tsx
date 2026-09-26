import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1800,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        onComplete();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [minDurationMs, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020204] select-none cursor-pointer overflow-hidden"
      onClick={onComplete}
    >
      {/* Ambient Pulsing Neon Glow Background Auras */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* Violet Ambient Aura */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] rounded-full bg-purple-600/30 blur-[90px]"
        />

        {/* Cyan Ambient Aura */}
        <motion.div
          animate={{
            scale: [1.2, 0.95, 1.2],
            opacity: [0.3, 0.55, 0.3],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute h-[320px] w-[320px] sm:h-[390px] sm:w-[390px] rounded-full bg-cyan-500/25 blur-[90px]"
        />

        {/* Outer radial vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#020204]/60 to-[#020204]" />
      </div>

      {/* Main Official GediOn Branded Badge Container */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.86, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative group"
        >
          {/* Subtle Outer Neon Border Glow */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 30px 2px rgba(168, 85, 247, 0.4), 0 0 60px 10px rgba(6, 182, 212, 0.25)',
                '0 0 50px 8px rgba(168, 85, 247, 0.65), 0 0 85px 18px rgba(6, 182, 212, 0.45)',
                '0 0 30px 2px rgba(168, 85, 247, 0.4), 0 0 60px 10px rgba(6, 182, 212, 0.25)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="rounded-[32px] sm:rounded-[36px]"
          >
            {/* The Official GediOn Badge Card (exact 24% squircle) */}
            <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-[24%] p-[2px] bg-gradient-to-tr from-purple-500 via-white/30 to-cyan-400 overflow-hidden shadow-2xl">
              <div className="relative h-full w-full rounded-[22%] overflow-hidden bg-black flex items-center justify-center">
                <img
                  src="/gedion-icon.jpg"
                  alt="GediOn Official Logo Badge"
                  className="h-full w-full object-cover object-center select-none pointer-events-none"
                />
                {/* Diagonal Specular Sheen */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-70" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Brand Tagline & Loading Pulse */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          {/* Subtle Progress Capsule */}
          <div className="relative w-36 sm:w-44 h-1.5 rounded-full bg-white/10 overflow-hidden backdrop-blur-sm border border-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 shadow-[0_0_12px_#06b6d4]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] sm:text-xs tracking-[0.25em] uppercase font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-cyan-300">
              Short Videos • Ultra-Smooth
            </span>
          </div>
        </motion.div>
      </div>

      {/* Subtle Skip Hint at bottom */}
      <div className="absolute bottom-6 text-[11px] text-white/30 tracking-wider">
        Tap anywhere to enter
      </div>
    </motion.div>
  );
};
