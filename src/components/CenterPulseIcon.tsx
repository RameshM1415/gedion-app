import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

interface CenterPulseIconProps {
  isPlaying: boolean;
  visible: boolean;
}

export const CenterPulseIcon: React.FC<CenterPulseIconProps> = ({ isPlaying, visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.1 }}
          exit={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] text-white">
            {isPlaying ? (
              <Play size={40} className="ml-1 fill-white text-white drop-shadow-md" />
            ) : (
              <Pause size={40} className="fill-white text-white drop-shadow-md" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
