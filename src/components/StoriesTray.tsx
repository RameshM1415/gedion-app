import React from 'react';
import { Plus } from 'lucide-react';
import { StoryItem } from '../types';
import { USER_STORY_PROFILE } from '../data/mockStories';

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
  const displayAvatar = userAvatar || USER_STORY_PROFILE.avatar;

  return (
    <div className="w-full flex justify-center py-1 select-none bg-transparent">
      {/* Horizontal row displaying exactly 4 centered story circles across standard mobile screens */}
      <div className="flex items-center gap-2.5 px-3 w-full max-w-[440px] overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pointer-events-auto">
        {/* 1. First Item: "Your story" with prominent Instagram ring and blue '+' badge */}
        <button
          type="button"
          onClick={onOpenYourStory}
          className="group flex flex-col items-center shrink-0 w-[calc((100%-30px)/4)] snap-start focus:outline-none active:scale-95 transition-transform cursor-pointer"
          aria-label="Add to your story"
        >
          {/* Prominent Circular Avatar Container ~66px-68px diameter */}
          <div className="relative">
            <div
              className={`w-[66px] h-[66px] sm:w-[68px] sm:h-[68px] rounded-full p-[2.5px] transition-all shadow-md ${
                hasUserStory
                  ? 'bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]'
                  : 'bg-white/35'
              }`}
            >
              <div className="w-full h-full rounded-full p-[2px] bg-black overflow-hidden">
                <img
                  src={displayAvatar}
                  alt="Your story"
                  className="w-full h-full rounded-full object-cover select-none"
                />
              </div>
            </div>

            {/* Clean Blue '+' overlay badge at bottom-right */}
            {!hasUserStory && (
              <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#0095f6] text-white shadow-md border-2 border-black">
                <Plus size={12} strokeWidth={3.5} />
              </div>
            )}
          </div>

          {/* Subtitle */}
          <span className="mt-1 text-[11px] font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] truncate max-w-full text-center tracking-tight">
            Your story
          </span>
        </button>

        {/* 2. Friend stories with signature Instagram gradient ring */}
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            onClick={() => onSelectStory(index)}
            className="group flex flex-col items-center shrink-0 w-[calc((100%-30px)/4)] snap-start focus:outline-none active:scale-95 transition-transform cursor-pointer"
            aria-label={`View story by ${story.username}`}
          >
            {/* Outer Ring: Signature Instagram gradient (yellow, red/pink, purple) */}
            <div className="w-[66px] h-[66px] sm:w-[68px] sm:h-[68px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shadow-md">
              {/* Inner gap ring */}
              <div className="w-full h-full rounded-full p-[2px] bg-black">
                <img
                  src={story.avatar}
                  alt={story.username}
                  className="w-full h-full rounded-full object-cover select-none"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Subtitle below each avatar */}
            <span className="mt-1 text-[11px] font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] truncate max-w-full text-center tracking-tight">
              {story.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
