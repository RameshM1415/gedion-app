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
    <div
      className={`w-full py-2.5 border-b select-none transition-colors ${
        isDark ? 'bg-black border-[#262626]' : 'bg-white border-[#efefef]'
      }`}
    >
      {/* Horizontal scrolling row of story avatars */}
      <div className="flex items-center gap-3.5 px-3.5 overflow-x-auto no-scrollbar scroll-smooth">
        {/* 1. First Item: "Your story" with clean blue '+' overlay badge */}
        <button
          type="button"
          onClick={onOpenYourStory}
          className="group flex flex-col items-center shrink-0 w-[66px] focus:outline-none active:scale-95 transition-transform cursor-pointer"
          aria-label="Add to your story"
        >
          {/* Avatar Container ~62px diameter */}
          <div className="relative">
            <div
              className={`w-[62px] h-[62px] rounded-full p-[2.5px] transition-all ${
                hasUserStory
                  ? 'bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]'
                  : isDark
                  ? 'bg-zinc-800'
                  : 'bg-zinc-200'
              }`}
            >
              <div
                className={`w-full h-full rounded-full p-[2px] overflow-hidden ${
                  isDark ? 'bg-black' : 'bg-white'
                }`}
              >
                <img
                  src={displayAvatar}
                  alt="Your story"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>

            {/* Clean Blue '+' overlay badge at bottom-right */}
            {!hasUserStory && (
              <div
                className={`absolute bottom-0 right-0 flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#0095f6] text-white shadow-xs border-2 ${
                  isDark ? 'border-black' : 'border-white'
                }`}
              >
                <Plus size={12} strokeWidth={3.5} />
              </div>
            )}
          </div>

          {/* Subtitle */}
          <span
            className={`mt-1.5 text-[11px] font-normal truncate max-w-[66px] tracking-tight ${
              isDark ? 'text-zinc-300' : 'text-zinc-700'
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
            className="group flex flex-col items-center shrink-0 w-[66px] focus:outline-none active:scale-95 transition-transform cursor-pointer"
            aria-label={`View story by ${story.username}`}
          >
            {/* Outer Ring: Signature Instagram gradient (yellow, red/pink, purple) */}
            <div className="w-[62px] h-[62px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]">
              {/* Inner gap ring */}
              <div
                className={`w-full h-full rounded-full p-[2px] ${
                  isDark ? 'bg-black' : 'bg-white'
                }`}
              >
                <img
                  src={story.avatar}
                  alt={story.username}
                  className="w-full h-full rounded-full object-cover select-none"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Subtitle below each avatar */}
            <span
              className={`mt-1.5 text-[11px] font-normal truncate max-w-[66px] tracking-tight ${
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
