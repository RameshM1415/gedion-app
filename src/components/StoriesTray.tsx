import React from 'react';
import { Plus } from 'lucide-react';
import { StoryItem } from '../types';
import { USER_STORY_PROFILE } from '../data/mockStories';
import { useTheme } from '../context/ThemeContext';

interface StoriesTrayProps {
  stories: StoryItem[];
  onOpenYourStory: () => void;
  onSelectStory: (index: number) => void;
  userAvatar?: string;
  hasUserStory?: boolean;
}

export const StoriesTray: React.FC<StoriesTrayProps> = ({
  stories,
  onOpenYourStory,
  onSelectStory,
  userAvatar,
  hasUserStory = false,
}) => {
  const { isDark } = useTheme();
  const displayAvatar = userAvatar || USER_STORY_PROFILE.avatar;

  return (
    <div className="w-full flex justify-center py-2 select-none bg-transparent">
      {/* Horizontal row displaying exactly 4 centered story circles across standard mobile screens */}
      <div className="flex items-center gap-3 px-3 w-full max-w-[440px] overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pointer-events-auto">
        {/* 1. First Item: "Your story" with true Instagram size (76px diameter) */}
        <button
          type="button"
          onClick={onOpenYourStory}
          className="group flex flex-col items-center shrink-0 w-[calc((100%-36px)/4)] snap-start focus:outline-none active:scale-95 transition-transform cursor-pointer"
          aria-label="Add to your story"
        >
          {/* Prominent Circular Avatar Container 76px diameter */}
          <div className="relative">
            <div
              className={`w-[76px] h-[76px] rounded-full p-[2.5px] transition-all shadow-sm ${
                hasUserStory
                  ? 'bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]'
                  : isDark
                  ? 'bg-zinc-800'
                  : 'bg-zinc-200'
              }`}
            >
              <div
                className={`w-full h-full rounded-full p-[2.5px] ${
                  isDark ? 'bg-black' : 'bg-white'
                } overflow-hidden`}
              >
                <img
                  src={displayAvatar}
                  alt="Your story"
                  className="w-full h-full rounded-full object-cover select-none"
                />
              </div>
            </div>

            {/* Clean Blue '+' overlay badge at bottom-right */}
            {!hasUserStory && (
              <div
                className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#0095f6] text-white shadow-md border-2 ${
                  isDark ? 'border-black' : 'border-white'
                }`}
              >
                <Plus size={12} strokeWidth={3.5} />
              </div>
            )}
          </div>

          {/* Subtitle - 100% Flat transparent text, NO gray/dark oval pill or shadow */}
          <span
            className={`mt-1.5 text-xs font-medium truncate max-w-[76px] text-center tracking-tight transition-colors ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            Your story
          </span>
        </button>

        {/* 2. Friend stories with signature Instagram gradient ring */}
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            onClick={() => onSelectStory(index)}
            className="group flex flex-col items-center shrink-0 w-[calc((100%-36px)/4)] snap-start focus:outline-none active:scale-95 transition-transform cursor-pointer"
            aria-label={`View story by ${story.username}`}
          >
            {/* Outer Ring: Signature Instagram gradient (yellow, red/pink, purple) 76px diameter */}
            <div className="w-[76px] h-[76px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shadow-sm">
              {/* Inner gap ring */}
              <div
                className={`w-full h-full rounded-full p-[2.5px] ${
                  isDark ? 'bg-black' : 'bg-white'
                } overflow-hidden`}
              >
                <img
                  src={story.avatar}
                  alt={story.username}
                  className="w-full h-full rounded-full object-cover select-none"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Subtitle below each avatar - 100% Flat transparent text, NO gray/dark oval pill or shadow */}
            <span
              className={`mt-1.5 text-xs font-medium truncate max-w-[76px] text-center tracking-tight transition-colors ${
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              }`}
            >
              {story.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
