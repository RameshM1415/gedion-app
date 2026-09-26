import React, { useMemo } from 'react';

interface ProfileQRCodeProps {
  value: string;
  size?: number;
  className?: string;
  logoSrc?: string;
}

// Simple deterministic hash to seed pseudo-random modules for non-empty patterns
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const ProfileQRCode: React.FC<ProfileQRCodeProps> = ({
  value,
  size = 200,
  className = '',
  logoSrc,
}) => {
  const gridSize = 25; // 25x25 QR-like module grid

  // Generate matrix
  const matrix = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => false)
    );

    // 1. Draw standard finder patterns at top-left, top-right, bottom-left
    const addFinder = (rStart: number, cStart: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[rStart + r][cStart + c] = true;
          }
        }
      }
    };

    addFinder(0, 0); // Top-left
    addFinder(0, gridSize - 7); // Top-right
    addFinder(gridSize - 7, 0); // Bottom-left

    // 2. Timing patterns
    for (let i = 8; i < gridSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // 3. Center cutout for logo (7x7 in center)
    const centerStart = Math.floor((gridSize - 7) / 2);
    const centerEnd = centerStart + 7;

    // 4. Fill remaining data modules deterministically based on input value
    let seed = simpleHash(value);
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Skip finder zones
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= gridSize - 8) ||
          (r >= gridSize - 8 && c < 8)
        ) {
          continue;
        }
        // Skip center logo zone
        if (r >= centerStart && r < centerEnd && c >= centerStart && c < centerEnd) {
          grid[r][c] = false;
          continue;
        }
        // Skip timing lines
        if (r === 6 || c === 6) continue;

        seed = (seed * 9301 + 49297) % 233280;
        grid[r][c] = seed / 233280 > 0.48;
      }
    }

    return grid;
  }, [value, gridSize]);

  const moduleSize = size / gridSize;

  return (
    <div
      className={`relative flex items-center justify-center p-3 rounded-2xl bg-white shadow-xl ${className}`}
      style={{ width: size + 24, height: size + 24 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shape-rendering-crisp"
      >
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) return null;
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx * moduleSize}
                y={rIdx * moduleSize}
                width={moduleSize - 0.1}
                height={moduleSize - 0.1}
                rx={moduleSize * 0.25}
                fill="#090a10"
              />
            );
          })
        )}
      </svg>

      {/* Center GediOn 3D Logo / Icon */}
      <div
        className="absolute flex items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-cyan-400 p-[2px] shadow-lg"
        style={{
          width: size * 0.26,
          height: size * 0.26,
        }}
      >
        <div className="h-full w-full rounded-[10px] bg-black flex items-center justify-center overflow-hidden">
          {logoSrc ? (
            <img src={logoSrc} alt="GediOn Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="font-extrabold text-sm tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
              G
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
