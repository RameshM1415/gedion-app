import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { StoryItem } from '../types';
import { USER_STORY_PROFILE } from '../data/mockStories';
import { useTheme } from '../context/ThemeContext';
import { AuthUser } from '../utils/authStorage';

interface StoriesTrayProps {
  stories: StoryItem[];
  onOpenYourStory: () => void;
  onSelectStory: (index: number) => void;
  userAvatar?: string;
  currentUser?: AuthUser | null;
  hasUserStory?: boolean;
}

// Helper to determine if an avatar string is a valid non-empty URL
const isValidUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  );
};

// Sub-component for individual friend story with error-safe fallback
const FriendStoryCircle: React.FC<{
  story: StoryItem;
  onClick: () => void;
  isDark: boolean;
}> = ({ story, onClick, isDark }) => {
  const [hasError, setHasError] = useState(false);
  const avatarUrl = story.avatar;
  const isValid = isValidUrl(avatarUrl);
  const initial = (story.username || 'S').charAt(0).toUpperCase();

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center shrink-0 w-[calc((100%-36px)/4)] snap-start focus:outline-none active:scale-95 transition-transform cursor-pointer"
      aria-label={`View story by ${story.username}`}
    >
      {/* Outer Ring: Signature Instagram gradient (yellow, red/pink, purple) 76px diameter */}
      <div className="w-[76px] h-[76px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shadow-sm">
        {/* Inner gap ring */}
        <div
          className={`w-full h-full rounded-full p-[2.5px] ${
            isDark ? 'bg-black' : 'bg-white'
          } overflow-hidden flex items-center justify-center`}
        >
          {isValid && !hasError ? (
            <img
              src={avatarUrl}
              alt=""
              onError={() => setHasError(true)}
              className="w-full h-full rounded-full object-cover select-none pointer-events-none"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white font-bold text-xl select-none">
              {initial}
            </div>
          )}
        </div>
      </div>

      {/* Subtitle below each avatar */}
      <span
        className={`mt-1.5 text-xs font-medium truncate max-w-[76px] text-center tracking-tight transition-colors ${
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        }`}
      >
        {story.username}
      </span>
    </button>
  );
};

export const StoriesTray: React.FC<StoriesTrayProps> = ({
  stories,
  onOpenYourStory,
  onSelectStory,
  userAvatar,
  currentUser,
  hasUserStory = false,
}) => {
  const { isDark } = useTheme();

  // Determine user's best avatar URL (supports avatar_url, avatar, userAvatar, or mock)
  const candidateAvatar =
    currentUser?.avatar_url ||
    currentUser?.avatar ||
    userAvatar ||
    USER_STORY_PROFILE.avatar;

  const [hasYourStoryImgError, setHasYourStoryImgError] = useState(false);

  // Reset error state when avatar candidate changes
  useEffect(() => {
    setHasYourStoryImgError(false);
  }, [candidateAvatar]);

  const hasValidYourStoryUrl = isValidUrl(candidateAvatar);

  // Compute clean user first letter (fallback for avatar)
  const userInitial = (
    currentUser?.displayName?.trim() ||
    currentUser?.username?.trim() ||
    'Y'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <div className="w-full flex justify-center py-2 select-none bg-transparent">
      {/* Horizontal row displaying story circles across standard mobile screens */}
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
                } overflow-hidden flex items-center justify-center`}
              >
                {hasValidYourStoryUrl && !hasYourStoryImgError ? (
                  <img
                    src={candidateAvatar}
                    alt=""
                    onError={() => setHasYourStoryImgError(true)}
                    className="w-full h-full rounded-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  /* Sleek gradient background with user's first letter (no broken HTML alt text) */
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white font-black text-2xl select-none shadow-inner">
                    {userInitial}
                  </div>
                )}
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

          {/* Subtitle - 100% Flat transparent text */}
          <span
            className={`mt-1.5 text-xs font-medium truncate max-w-[76px] text-center tracking-tight transition-colors ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            Your story
          </span>
        </button>

        {/* 2. Friend stories with signature Instagram gradient ring & safe avatar fallback */}
        {stories.map((story, index) => (
          <FriendStoryCircle
            key={story.id}
            story={story}
            onClick={() => onSelectStory(index)}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
};
