import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { StoryItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { AuthUser } from '../utils/authStorage';
import {
  uploadMediaToSupabaseStorage,
  insertSupabaseStory,
  fetchSupabaseActiveStories,
  supabase,
} from '../utils/supabaseClient';

interface StoriesTrayProps {
  stories: StoryItem[];
  onOpenYourStory: () => void;
  onSelectStory: (index: number) => void;
  userAvatar?: string;
  currentUser?: AuthUser | null;
  hasUserStory?: boolean;
  onPublishStory?: (newStory: StoryItem) => void;
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
  const initial = (story.username || 'S').replace(/^@/, '').charAt(0).toUpperCase();

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
  stories: initialStories,
  onOpenYourStory,
  onSelectStory,
  userAvatar,
  currentUser,
  hasUserStory = false,
  onPublishStory,
}) => {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localHasUserStory, setLocalHasUserStory] = useState(false);
  const [liveDbStories, setLiveDbStories] = useState<StoryItem[]>([]);

  // Fetch live authentic stories from Supabase on mount & listen to real-time additions
  useEffect(() => {
    let isMounted = true;
    const loadLive = async () => {
      try {
        const live = await fetchSupabaseActiveStories();
        if (isMounted && live.length > 0) {
          setLiveDbStories(live);
        }
      } catch (err) {
        console.warn('StoriesTray live fetch error:', err);
      }
    };
    loadLive();

    const channel = supabase
      .channel('stories-tray-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        loadLive();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Merge parent stories with live Supabase stories (no mock/dummy stories)
  const stories = useMemo(() => {
    const combined = [...(initialStories || []), ...liveDbStories];
    const seen = new Set<string>();
    return combined.filter((s) => {
      // Exclude any legacy mock items
      if (s.id.startsWith('mock_') || s.id.startsWith('story_mock')) return false;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [initialStories, liveDbStories]);

  // Determine user's best avatar URL (supports avatar_url, avatar, userAvatar, or authentic profile)
  const candidateAvatar =
    currentUser?.avatar_url ||
    currentUser?.avatar ||
    userAvatar ||
    '';

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
    .replace(/^@/, '')
    .charAt(0)
    .toUpperCase();

  // Find user's active story index if present in stories list
  const userStoryIndex = stories.findIndex(
    (s) =>
      s.id.startsWith('story_') ||
      (currentUser &&
        (s.username === currentUser.username ||
          s.username === `@${currentUser.username.replace(/^@/, '')}`))
  );

  const effectiveHasUserStory = hasUserStory || localHasUserStory || userStoryIndex >= 0;

  // Tapping "Your story" avatar:
  // If user already published a story and has gradient ring, viewing it opens the viewer modal!
  // If user has no story, it prompts media upload.
  const handleYourStoryClick = () => {
    if (effectiveHasUserStory) {
      onSelectStory(userStoryIndex >= 0 ? userStoryIndex : 0);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handlePlusBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Direct native media picker upload handler
  const handleNativeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Upload to Supabase Storage 'stories' bucket
      const publicUrl = await uploadMediaToSupabaseStorage(file, 'stories');
      const isVideo = file.type.startsWith('video/');
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

      const cleanHandle = currentUser?.username
        ? (currentUser.username.startsWith('@') ? currentUser.username : `@${currentUser.username}`)
        : '@you';
      const cleanName = currentUser?.displayName || currentUser?.username || 'Your story';
      const cleanAvatar =
        currentUser?.avatar_url ||
        currentUser?.avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanHandle}&backgroundColor=06b6d4,a855f7`;

      const newStoryItem: StoryItem = {
        id: `story_${Date.now()}`,
        username: cleanHandle,
        displayName: cleanName,
        avatar: cleanAvatar,
        storyMediaUrl: publicUrl,
        timestamp: 'Just now',
        isVerified: currentUser?.provider === 'google',
        isViewed: false,
      };

      // 2. Insert into Supabase `stories` table:
      // { user_id: currentUser.id, media_url: publicUrl, media_type: 'image' | 'video', created_at: NOW(), expires_at: NOW() + interval '24 hours' }
      await insertSupabaseStory({
        userId: currentUser?.id || 'anonymous_user',
        username: cleanHandle,
        displayName: cleanName,
        avatar: cleanAvatar,
        mediaUrl: publicUrl,
        mediaType,
      });

      // 3. Mark "Your story" with the active Instagram colorful gradient border ring immediately
      setLocalHasUserStory(true);

      // 4. Update parent and local state
      if (onPublishStory) {
        onPublishStory(newStoryItem);
      }
    } catch (err) {
      console.warn('Native story upload error, falling back to modal:', err);
      onOpenYourStory();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full flex justify-center py-2 select-none bg-transparent">
      {/* Hidden native media file picker for direct (+) story upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleNativeFileChange}
      />

      {/* Horizontal row displaying authentic live story circles */}
      <div className="flex items-center gap-3 px-3 w-full max-w-[440px] overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pointer-events-auto">
        {/* 1. First Item: "Your story" with true Instagram size (76px diameter) */}
        <button
          type="button"
          onClick={handleYourStoryClick}
          className="group flex flex-col items-center shrink-0 w-[calc((100%-36px)/4)] snap-start focus:outline-none active:scale-95 transition-transform cursor-pointer"
          aria-label={effectiveHasUserStory ? 'View your story' : 'Add to your story'}
        >
          {/* Prominent Circular Avatar Container 76px diameter */}
          <div className="relative">
            <div
              className={`w-[76px] h-[76px] rounded-full p-[2.5px] transition-all shadow-sm ${
                effectiveHasUserStory
                  ? 'bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]'
                  : isDark
                  ? 'bg-zinc-800'
                  : 'bg-zinc-200'
              }`}
            >
              <div
                className={`w-full h-full rounded-full p-[2.5px] ${
                  isDark ? 'bg-black' : 'bg-white'
                } overflow-hidden flex items-center justify-center relative`}
              >
                {isUploading ? (
                  <div className="w-full h-full rounded-full bg-black/60 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-white" />
                  </div>
                ) : hasValidYourStoryUrl && !hasYourStoryImgError ? (
                  <img
                    src={candidateAvatar}
                    alt=""
                    onError={() => setHasYourStoryImgError(true)}
                    className="w-full h-full rounded-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  /* Sleek gradient background with user's first letter */
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white font-black text-2xl select-none shadow-inner">
                    {userInitial}
                  </div>
                )}
              </div>
            </div>

            {/* Clean Blue '+' overlay badge at bottom-right */}
            <div
              onClick={handlePlusBadgeClick}
              className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#0095f6] text-white shadow-md border-2 ${
                isDark ? 'border-black' : 'border-white'
              } active:scale-90 transition-transform cursor-pointer`}
              title="Upload story"
            >
              <Plus size={12} strokeWidth={3.5} />
            </div>
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
        {stories
          .filter((story, idx) => {
            // If it's the current user's story, it is already represented in "Your story" slot
            if (effectiveHasUserStory && (idx === userStoryIndex || story.id.startsWith('story_'))) return false;
            return true;
          })
          .map((story) => {
            // Find true index in complete stories array for modal opening
            const trueIndex = stories.findIndex((s) => s.id === story.id);
            return (
              <FriendStoryCircle
                key={story.id}
                story={story}
                onClick={() => onSelectStory(trueIndex >= 0 ? trueIndex : 0)}
                isDark={isDark}
              />
            );
          })}
      </div>
    </div>
  );
};
