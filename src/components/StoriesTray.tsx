import React from 'react';
import { Plus } from 'lucide-react';
import { StoryItem } from '../types';
import { USER_STORY_PROFILE } from '../data/mockStories';

interface StoriesTrayProps {
  stories: StoryItem[];
  onOpenYourStory: () => void;
  onSelectStory: (index: number) => void;
}

export const StoriesTray: React.FC<StoriesTrayProps> = ({
  stories,
  onOpenYourStory,
  onSelectStory,
}) => {
  return (
    <div className="w-full bg-transparent overflow-hidden select-none pointer-events-auto">
      {/* Horizontal smooth scrolling row with hidden scrollbars */}
      <div className="flex items-center gap-3.5 px-3.5 py-1 overflow-x-auto no-scrollbar scroll-smooth">
        {/* 1. First Item: "Your story" with '+' badge */}
        <button
          type="button"
          onClick={onOpenYourStory}
          className="group flex flex-col items-center shrink-0 focus:outline-none active:scale-95 transition-transform"
          aria-label="Add to your story"
        >
          {/* Avatar Container ~58px diameter */}
          <div className="relative w-[58px] h-[58px] rounded-full p-[2px] bg-white/20 group-hover:bg-white/40 transition-colors">
            <img
              src={USER_STORY_PROFILE.avatar}
              alt="Your story"
              className="w-full h-full rounded-full object-cover border-2 border-black/80 shadow-md"
            />
            {/* Small '+' badge at the bottom-right */}
            <div className="absolute -bottom-0.5 -right-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 border-2 border-black text-white shadow-md">
              <Plus size={12} strokeWidth={3.5} />
            </div>
          </div>

          {/* Subtitle below */}
          <span className="mt-1 text-[11px] font-medium text-white/95 text-center truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] max-w-[64px] tracking-tight">
            Your story
          </span>
        </button>

        {/* 2. Friends / Creator Stories with Glowing Neon Gradient Ring */}
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            onClick={() => onSelectStory(index)}
            className="group flex flex-col items-center shrink-0 focus:outline-none active:scale-95 transition-transform"
            aria-label={`View story by ${story.username}`}
          >
            {/* Outer ring: Glowing neon gradient border (cyan to magenta/pink gradient with subtle breathing glow) */}
            <div className="relative w-[58px] h-[58px] rounded-full p-[2.5px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 animate-story-glow shadow-md">
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

            {/* Subtitle below each avatar: Username in crisp white text with subtle shadow truncated with ellipsis */}
            <span className="mt-1 text-[11px] font-medium text-white text-center truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] max-w-[64px] tracking-tight">
              {story.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
