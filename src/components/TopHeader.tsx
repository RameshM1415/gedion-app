import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TopHeaderProps {
  onOpenCreate?: () => void;
  onOpenActivity?: () => void;
  hasUnreadActivity?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenCreate,
  onOpenActivity,
  hasUnreadActivity = false,
}) => {
  const { isDark } = useTheme();

  return (
    <header
      className={`sticky top-0 z-40 w-full h-[50px] px-4 flex items-center justify-between border-b transition-colors select-none ${
        isDark
          ? 'bg-black border-[#262626] text-white'
          : 'bg-white border-[#efefef] text-black shadow-xs'
      }`}
    >
      {/* Left: Simple '+' icon (triggers upload/create modal) */}
      <div className="flex items-center w-12">
        <button
          type="button"
          onClick={onOpenCreate}
          aria-label="Create Post or Reel"
          className={`p-1.5 -ml-1.5 rounded-full transition-transform active:scale-90 hover:opacity-75 ${
            isDark ? 'text-white' : 'text-black'
          }`}
        >
          <Plus size={24} strokeWidth={2.2} />
        </button>
      </div>

      {/* Center: Sleek brand title "GediOn" styled in classic Instagram script typography */}
      <div className="flex items-center justify-center flex-1">
        <h1
          className={`font-script text-[32px] font-normal leading-none pt-1 tracking-normal transition-colors cursor-pointer select-none ${
            isDark ? 'text-white' : 'text-zinc-950'
          }`}
        >
          GediOn
        </h1>
      </div>

      {/* Right: Notification Heart icon '❤️' (opens activity/alerts) */}
      <div className="flex items-center justify-end w-12">
        <button
          type="button"
          onClick={onOpenActivity}
          aria-label="Activity and Notifications"
          className={`relative p-1.5 -mr-1.5 rounded-full transition-transform active:scale-90 hover:opacity-75 ${
            isDark ? 'text-white' : 'text-black'
          }`}
        >
          <Heart size={24} strokeWidth={2} />
          {hasUnreadActivity && (
            <span
              className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ${
                isDark ? 'ring-black' : 'ring-white'
              }`}
            />
          )}
        </button>
      </div>
    </header>
  );
};
