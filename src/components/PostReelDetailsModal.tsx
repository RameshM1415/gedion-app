import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Music,
  Send,
  Download,
  MessageSquare,
  Sparkles,
  Volume2,
  VolumeX,
  Hash,
  Layers,
} from 'lucide-react';
import { Reel } from '../types';
import {
  supabase,
  uploadVideoToCloudinaryUnsigned,
  optimizeCloudinaryVideoUrl,
} from '../utils/supabaseClient';
import { getStoredAuth, DEFAULT_AUTH_USER } from '../utils/authStorage';

interface PostReelDetailsModalProps {
  videoUrl: string;
  mediaType?: 'video' | 'image';
  filterName: string;
  selectedAudio?: {
    title: string;
    artist: string;
    audioUrl?: string;
    tag?: string;
  } | null;
  onRetake: () => void;
  onPublish: (newReel: Reel) => void;
}

const CATEGORIES = [
  'Entertainment',
  'Music & Dance',
  'Comedy',
  'Lifestyle',
  'Tech & AI',
  'Gaming',
  'Fitness & Health',
  'Fashion & Beauty',
];

const QUICK_HASHTAGS = ['#GediOn', '#Viral', '#Trending', '#Studio', '#Neon', '#FYP'];

export const PostReelDetailsModal: React.FC<PostReelDetailsModalProps> = ({
  videoUrl,
  mediaType = 'video',
  filterName,
  selectedAudio,
  onRetake,
  onPublish,
}) => {
  const isImage = mediaType === 'image';
  const [caption, setCaption] = useState(
    isImage
      ? `Captured photo with ${filterName} look 📸✨ #GediOn #Photo #Viral`
      : `Live Studio capture with ${filterName} look ⚡ #GediOn #Viral #Trending`
  );
  const [category, setCategory] = useState('Entertainment');
  const [allowComments, setAllowComments] = useState(true);
  const [saveToDevice, setSaveToDevice] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync background audio playback with the video preview
  useEffect(() => {
    if (selectedAudio?.audioUrl) {
      const audio = new Audio(selectedAudio.audioUrl);
      audio.loop = true;
      audio.volume = 0.9;
      previewAudioRef.current = audio;

      if (!isMuted) {
        audio.play().catch(() => {});
      }
    }

    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [selectedAudio?.audioUrl]);

  useEffect(() => {
    if (previewAudioRef.current) {
      if (isMuted) {
        previewAudioRef.current.pause();
      } else {
        previewAudioRef.current.play().catch(() => {});
      }
    }
  }, [isMuted]);

  const handleAddHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => `${prev.trim()} ${tag}`);
    }
  };

  const handlePost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // If Save to Device is enabled, trigger download
    if (saveToDevice && videoUrl) {
      try {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `GediOn_Reel_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.warn('Could not auto-download video:', err);
      }
    }

    const now = Date.now();
    const nowIso = new Date().toISOString();
    const activeUser = getStoredAuth() || DEFAULT_AUTH_USER;
    const creatorName = activeUser.displayName || activeUser.username || 'Creator';
    const creatorAvatar =
      activeUser.avatar ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(creatorName)}&backgroundColor=06b6d4,a855f7`;

    const captionText =
      caption.trim() ||
      (isImage ? 'New photo on GediOn 📸✨ #GediOn #Photo' : 'New recorded reel on GediOn ⚡ #GediOn #Viral');
    const matchedTags = captionText.match(/#[a-zA-Z0-9_]+/g) || ['#GediOn', '#Viral'];

    let finalVideoUrl = isImage ? '' : videoUrl;
    let newReelId = `post_${now}`;

    try {
      if (!isImage && videoUrl) {
        const res = await fetch(videoUrl);
        const fetchedBlob = await res.blob();
        const selectedVideoFile = new File([fetchedBlob], `gedion_${now}.mp4`, {
          type: fetchedBlob.type || 'video/mp4',
        });

        // Direct Unsigned Upload to Cloudinary (ONLY file + upload_preset: "gedion_preset")
        const uploadedUrl = await uploadVideoToCloudinaryUnsigned(selectedVideoFile);
        finalVideoUrl = optimizeCloudinaryVideoUrl(
          uploadedUrl.replace('/video/upload/', '/video/upload/q_auto,f_auto,w_720,c_limit/')
        );

        const { data: insertedPost } = await supabase
          .from('posts')
          .insert([
            {
              user_id: activeUser.id,
              video_url: finalVideoUrl,
              caption: captionText,
              likes_count: 0,
              views_count: 0,
              created_at: nowIso,
            },
          ])
          .select()
          .maybeSingle();

        if (insertedPost?.id) {
          newReelId = String(insertedPost.id);
        }
      }
    } catch (err) {
      console.warn('Recorded reel upload note:', err);
    }

    const newReel: Reel = {
      id: newReelId,
      creatorId: activeUser.id,
      creatorEmail: activeUser.email,
      username: activeUser.username || 'creator',
      displayName: creatorName,
      avatar: creatorAvatar,
      isVerified: true,
      isFollowing: true,
      videoUrl: finalVideoUrl,
      poster: isImage ? videoUrl : '',
      fallbackGradient: 'from-purple-950 via-cyan-950 to-black',
      caption: captionText,
      tags: matchedTags,
      audioTitle: selectedAudio
        ? selectedAudio.title
        : isImage
        ? 'Original Sound - Photo'
        : 'Original Audio - Recorded',
      audioArtist: selectedAudio ? selectedAudio.artist : creatorName,
      audioUrl: selectedAudio?.audioUrl,
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      isBookmarked: false,
      sharesCount: 0,
      viewsCount: '0',
      themeAccent: '#06b6d4',
      badgeText: isImage ? 'Photo Post' : category,
      mediaType: isImage ? 'image' : 'video',
      comments: [],
    };

    setIsSubmitting(false);
    onPublish(newReel);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-hidden"
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur-md">
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <ArrowLeft size={16} />
          <span>Retake</span>
        </button>

        <h2 className="text-sm font-bold tracking-wide text-white">
          {isImage ? 'New Photo Post' : 'New Reel Post'}
        </h2>

        <div className="w-16 flex justify-end">
          <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
            Ready
          </span>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Responsive Grid: Video/Photo Preview + Details Form */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* 9:16 Vertical Media Player / Photo Loop */}
          <div className="relative w-full max-w-[210px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl shrink-0 group">
            {isImage ? (
              <img
                src={videoUrl}
                alt="Captured photo preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={videoUrl}
                autoPlay
                loop
                playsInline
                muted={selectedAudio ? true : isMuted}
                className="h-full w-full object-cover"
              />
            )}

            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Mute/Unmute audio button (for video or background audio) */}
            {(selectedAudio || !isImage) && (
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white border border-white/20"
                aria-label={isMuted ? 'Unmute preview' : 'Mute preview'}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            )}

            {/* Filter badge */}
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 border border-white/20 text-[10px] font-medium text-pink-300">
              <Sparkles size={11} className="text-pink-400" />
              <span>{filterName}</span>
            </div>

            {/* Preview indicator */}
            <div className="absolute bottom-2.5 left-2.5 z-10 text-[9px] font-bold tracking-wider uppercase text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
              {isImage ? 'Photo Preview' : 'Preview Loop'}
            </div>
          </div>

          {/* Creator Metadata Inputs */}
          <div className="flex-1 flex flex-col space-y-3.5">
            {/* Caption & Hashtags Textarea */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Caption & Hashtags
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption... #GediOn #Viral"
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-xs text-white placeholder-white/40 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
              />

              {/* Quick Hashtag Pills */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-white/50 flex items-center gap-0.5">
                  <Hash size={10} /> Quick tags:
                </span>
                {QUICK_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddHashtag(tag)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-cyan-300 font-medium border border-white/10 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Category Selector Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1">
                <Layers size={13} className="text-cyan-400" />
                <span>Category</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Tag */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1">
                <Music size={13} className="text-pink-400" />
                <span>Audio Track</span>
              </label>
              <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/15 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 shrink-0">
                    <Music size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {selectedAudio ? selectedAudio.title : 'Original Audio - Recorded'}
                    </p>
                    <p className="text-[10px] text-white/50 truncate">
                      {selectedAudio ? selectedAudio.artist : 'Captured from microphone'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                    selectedAudio
                      ? 'text-pink-400 bg-pink-500/10 border-pink-500/20'
                      : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                  }`}
                >
                  {selectedAudio ? (selectedAudio.tag || 'Soundtrack') : 'Original'}
                </span>
              </div>
            </div>

            {/* Optional Toggles */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              {/* Allow Comments */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-cyan-400" />
                  <div>
                    <p className="text-xs font-medium text-white">Allow Comments</p>
                    <p className="text-[10px] text-white/50">Viewers can comment on your reel</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowComments(!allowComments)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    allowComments ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                  role="switch"
                  aria-checked={allowComments}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform transform ${
                      allowComments ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Save to Device */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Download size={14} className="text-purple-400" />
                  <div>
                    <p className="text-xs font-medium text-white">Save to Device</p>
                    <p className="text-[10px] text-white/50">Download a local MP4 copy on post</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveToDevice(!saveToDevice)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    saveToDevice ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                  role="switch"
                  aria-checked={saveToDevice}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform transform ${
                      saveToDevice ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Button: Post Reel */}
      <div className="p-4 border-t border-white/10 bg-black/80 backdrop-blur-lg">
        <button
          type="button"
          onClick={handlePost}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Send size={16} />
          <span>{isSubmitting ? 'Posting...' : 'Post Reel'}</span>
        </button>
      </div>
    </motion.div>
  );
};
