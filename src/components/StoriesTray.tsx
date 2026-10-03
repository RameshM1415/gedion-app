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
    <div className="w-full bg-transparent overflow-hidden select-none pointer-events-auto">
      {/* Horizontal smooth scrolling row: Exactly 5 bubbles (Your story + 4 friends) fit comfortably across mobile screen */}
      <div className="flex items-center gap-2 px-2.5 py-1 overflow-x-auto no-scrollbar scroll-smooth">
        {/* 1. First Item: "Your story" with '+' badge */}
        <button
          type="button"
          onClick={onOpenYourStory}
          className="group flex flex-col items-center shrink-0 w-[58px] focus:outline-none active:scale-95 transition-transform"
          aria-label="Add to your story"
        >
          {/* Avatar Container ~50px diameter */}
          <div
            className={`relative w-[50px] h-[50px] rounded-full p-[2px] transition-all ${
              hasUserStory
                ? 'bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 animate-story-glow shadow-md'
                : 'bg-white/20 group-hover:bg-white/40'
            }`}
          >
            <div className="w-full h-full rounded-full p-[1.5px] bg-black/80 overflow-hidden">
              <img
                src={displayAvatar}
                alt="Your story"
                className="w-full h-full rounded-full object-cover shadow-md"
              />
            </div>
            {/* Small '+' badge at the bottom-right */}
            <div className="absolute -bottom-0.5 -right-0.5 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 border-2 border-black text-white shadow-md">
              <Plus size={10} strokeWidth={3.5} />
            </div>
          </div>

          {/* Subtitle below */}
          <span className="mt-1 text-[10.5px] font-medium text-white/95 text-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] max-w-[58px] tracking-tight">
            Your story
          </span>
        </button>

        {/* 2. Friends / Creator Stories with Glowing Neon Gradient Ring */}
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            onClick={() => onSelectStory(index)}
            className="group flex flex-col items-center shrink-0 w-[58px] focus:outline-none active:scale-95 transition-transform"
            aria-label={`View story by ${story.username}`}
          >
            {/* Outer ring: Glowing neon gradient border */}
            <div className="relative w-[50px] h-[50px] rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 animate-story-glow shadow-md">
              {/* Inner dark gap ring */}
              <div className="w-full h-full rounded-full p-[1.5px] bg-black/80">
                <img
                  src={story.avatar}
                  alt={story.username}
                  className="w-full h-full rounded-full object-cover select-none"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Subtitle below each avatar */}
            <span className="mt-1 text-[10.5px] font-medium text-white text-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] max-w-[58px] tracking-tight">
              {story.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
