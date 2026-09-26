import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

export interface FloatingHeartItem {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface FloatingHeartsProps {
  hearts: FloatingHeartItem[];
  onHeartComplete: (id: number) => void;
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({ hearts, onHeartComplete }) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{
              opacity: 1,
              scale: 0.2,
              x: h.x - 40,
              y: h.y - 40,
              rotate: h.rotation,
            }}
            animate={{
              opacity: [1, 1, 0],
              scale: [0.2, 1.4, 1.1],
              y: h.y - 140,
              rotate: h.rotation + (Math.random() * 20 - 10),
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.85,
              ease: [0.175, 0.885, 0.32, 1.275],
            }}
            onAnimationComplete={() => onHeartComplete(h.id)}
            className="absolute pointer-events-none drop-shadow-[0_0_20px_#ff0055]"
          >
            <div className="relative flex items-center justify-center pointer-events-none">
              <Heart
                size={80}
                fill="#ff0055"
                color="#ffffff"
                className="fill-[#ff0055] text-white drop-shadow-[0_0_24px_#ff0055]"
                strokeWidth={1.5}
              />
              <span className="absolute inset-0 flex items-center justify-center animate-ping opacity-60 pointer-events-none">
                <Heart size={60} fill="#ff0055" className="fill-[#ff0055] text-[#ff0055]" />
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
