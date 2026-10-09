import React, { useState } from 'react';

interface GediOnLogoIconProps {
  className?: string;
  size?: number;
  showGlow?: boolean;
}

export const GediOnLogoIcon: React.FC<GediOnLogoIconProps> = ({
  className = 'h-9 w-9 sm:h-10 sm:w-10',
  size,
  showGlow = true,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`relative aspect-square shrink-0 flex items-center justify-center select-none ${className}`}
      style={{
        width: size ? `${size}px` : undefined,
        height: size ? `${size}px` : undefined,
      }}
    >
      {/* Outer Neon Glow Aura */}
      {showGlow && (
        <div className="pointer-events-none absolute inset-0 rounded-[24%] bg-gradient-to-tr from-purple-600/55 via-pink-500/35 to-cyan-400/55 blur-[6px] -z-10 scale-95 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      {/* Official GediOn Dark Squircle Box (border-radius: 24%) with Glowing Outer Neon Border */}
      <div className="relative h-full w-full aspect-square rounded-[24%] p-[1.5px] bg-gradient-to-tr from-purple-500/80 via-white/30 to-cyan-400/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.85),0_0_16px_rgba(168,85,247,0.4)] transition-transform duration-300 group-hover:scale-105">
        <div className="relative h-full w-full rounded-[22%] overflow-hidden bg-[#06040a] flex items-center justify-center">
          {!imageError ? (
            <img
              src="https://i.postimg.cc/1XtyC1ff/file-000000007ca8820bb8633872f223383f.png"
              alt="GediOn Official Logo Badge"
              className="h-full w-full object-contain object-center transform scale-[1.01]"
              style={{
                imageRendering: '-webkit-optimize-contrast',
              }}
              onError={() => setImageError(true)}
              loading="eager"
            />
          ) : (
            /* Complete Fallback SVG matching exact badge proportions */
            <svg
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full select-none"
            >
              <defs>
                <linearGradient id="bgDark" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0a0714" />
                  <stop offset="50%" stopColor="#040307" />
                  <stop offset="100%" stopColor="#030810" />
                </linearGradient>

                <linearGradient id="neonBorder" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>

                <linearGradient id="chromeText" x1="256" y1="60" x2="256" y2="155" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor="#f3f4f6" />
                  <stop offset="55%" stopColor="#9ca3af" />
                  <stop offset="85%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#d1d5db" />
                </linearGradient>

                <filter id="neonGlowPink" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur1" />
                  <feGaussianBlur stdDeviation="16" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="neonGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur1" />
                  <feGaussianBlur stdDeviation="16" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background with 24% radius */}
              <rect width="512" height="512" rx="122" fill="url(#bgDark)" />
              <rect x="2" y="2" width="508" height="508" rx="120" stroke="url(#neonBorder)" strokeWidth="4" />

              {/* Subtle radial sheen */}
              <circle cx="160" cy="256" r="140" fill="#ec4899" fillOpacity="0.12" filter="blur(40px)" />
              <circle cx="352" cy="256" r="140" fill="#06b6d4" fillOpacity="0.12" filter="blur(40px)" />

              {/* Top Header: 3D Metallic Silver "GediOn" */}
              <text
                x="256"
                y="125"
                textAnchor="middle"
                fontSize="68"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="1"
                fill="url(#chromeText)"
                stroke="#1f2937"
                strokeWidth="1.5"
                filter="drop-shadow(0 4px 8px rgba(0,0,0,0.9))"
              >
                GediOn
              </text>

              {/* Center Graphic: Glowing Dual-Color Neon Infinity Play Loop */}
              <g transform="translate(0, 10)">
                {/* Left Magenta / Neon Pink Loop */}
                <path
                  d="M 256 256 C 215 190, 160 175, 125 190 C 75 210, 75 302, 125 322 C 160 337, 215 322, 256 256 Z"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="28"
                  strokeLinecap="round"
                  filter="url(#neonGlowPink)"
                />
                <path
                  d="M 256 256 C 215 190, 160 175, 125 190 C 75 210, 75 302, 125 322 C 160 337, 215 322, 256 256 Z"
                  fill="none"
                  stroke="#ffe4e6"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Right Electric Cyan / Blue Loop */}
                <path
                  d="M 256 256 C 297 190, 352 175, 387 190 C 437 210, 437 302, 387 322 C 352 337, 297 322, 256 256 Z"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="28"
                  strokeLinecap="round"
                  filter="url(#neonGlowCyan)"
                />
                <path
                  d="M 256 256 C 297 190, 352 175, 387 190 C 437 210, 437 302, 387 322 C 352 337, 297 322, 256 256 Z"
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Play Triangle centered in right loop */}
                <polygon
                  points="335,218 395,256 335,294"
                  fill="#06b6d4"
                  filter="url(#neonGlowCyan)"
                />
                <polygon
                  points="338,223 390,256 338,289"
                  fill="#ffffff"
                />
              </g>

              {/* Bottom Footer Subtitle: Clean White Uppercase "SHORT VIDEOS" */}
              <text
                x="256"
                y="435"
                textAnchor="middle"
                fontSize="24"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="7"
                fill="#f3f4f6"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
              >
                SHORT VIDEOS
              </text>
            </svg>
          )}

          {/* Luxury Specular Gloss Highlight */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-60 rounded-[22%]" />
        </div>
      </div>
    </div>
  );
};
