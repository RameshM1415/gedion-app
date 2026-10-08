import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1200,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#000000] select-none pointer-events-none overflow-hidden"
    >
      {/* Centered GediOn Icon with Subtle Glowing Pulse */}
      <div className="relative flex flex-col items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#fba73f]/25 via-[#dc2743]/20 to-[#bc1888]/25 blur-2xl"
        />

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[26px] p-[2.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shadow-2xl overflow-hidden"
        >
          <div className="w-full h-full rounded-[24px] overflow-hidden bg-black flex items-center justify-center">
            <img
              src="/gedion-icon.jpg"
              alt="GediOn"
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </div>
        </motion.div>
      </div>

      {/* Native Instagram-Style Bottom Branding */}
      <div className="absolute bottom-10 flex flex-col items-center gap-1 select-none pointer-events-none">
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
          from
        </span>
        <span className="text-base font-extrabold tracking-tight bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] bg-clip-text text-transparent">
          GediOn
        </span>
      </div>
    </motion.div>
  );
};
