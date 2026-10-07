import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Image as ImageIcon,
  Film,
  Upload,
  RotateCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Hash,
  MapPin,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Reel } from '../types';
import { AuthUser, DEFAULT_AUTH_USER } from '../utils/authStorage';
import {
  supabase,
  uploadMediaToSupabaseStorage,
  uploadVideoToCloudinaryUnsigned,
  optimizeCloudinaryVideoUrl,
} from '../utils/supabaseClient';
import { useTheme } from '../context/ThemeContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (newPost: Reel) => void;
  currentUser?: AuthUser | null;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const QUICK_HASHTAGS = [
  '#GediOn',
  '#Viral',
  '#Trending',
  '#Reels',
  '#PhotoOfTheDay',
  '#Creator',
  '#FYP',
  '#Explore',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  currentUser,
}) => {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Active creator details
  const activeUser = currentUser || DEFAULT_AUTH_USER;

  // Selected file & preview states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [aspectRatioMode, setAspectRatioMode] = useState<'cover' | 'contain'>('cover');

  // Video playback controls
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);

  // Post configuration
  const [postType, setPostType] = useState<'post' | 'reel'>('post');
  const [caption, setCaption] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [allowComments, setAllowComments] = useState<boolean>(true);

  // Upload progress & submission state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cleanup object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  // Handle file selection from input or drag-and-drop
  const handleProcessFile = (file: File) => {
    setErrorMessage(null);

    // Validate size limit (100MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setErrorMessage('Please select a valid image (JPG, PNG, WebP) or video (MP4, WebM) file.');
      return;
    }

    // Revoke previous blob url if exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setMediaType(isVideo ? 'video' : 'image');

    // Automatically suggest post type based on media
    if (isVideo) {
      setPostType('reel');
    } else {
      setPostType('post');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleResetMedia = () => {
    if (isUploading) return;
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadStatus('');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
    }
  };

  const toggleVideoPlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoPreviewRef.current) return;
    if (videoPreviewRef.current.paused) {
      videoPreviewRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoPreviewRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleVideoMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoPreviewRef.current) return;
    const nextMuted = !videoPreviewRef.current.muted;
    videoPreviewRef.current.muted = nextMuted;
    setIsVideoMuted(nextMuted);
  };

  // Submit and Upload to Supabase Storage & Database
  const handleSharePost = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(15);
    setUploadStatus('Preparing media...');

    try {
      let finalMediaUrl: string = '';

      // Step 1: Upload to Supabase Storage (bucket: 'reels' or 'posts')
      setUploadStatus('Uploading to Supabase Storage...');
      try {
        finalMediaUrl = await uploadMediaToSupabaseStorage(
          selectedFile,
          'reels',
          (progress) => {
            setUploadProgress(Math.min(progress, 80));
          }
        );
      } catch (storageErr) {
        console.warn('Supabase storage direct upload note:', storageErr);
        // Fallback: If video, try Cloudinary unsigned; if image, convert or retry
        if (mediaType === 'video') {
          setUploadStatus('Syncing video to CDN...');
          try {
            const cloudUrl = await uploadVideoToCloudinaryUnsigned(selectedFile);
            finalMediaUrl = optimizeCloudinaryVideoUrl(cloudUrl);
          } catch (cloudErr) {
            console.warn('Cloudinary upload note:', cloudErr);
            throw storageErr; // rethrow storage error
          }
        } else {
          throw storageErr;
        }
      }

      setUploadProgress(85);
      setUploadStatus('Saving post record to database...');

      const nowIso = new Date().toISOString();
      const newPostId = `${postType === 'reel' ? 'reel' : 'post'}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`;
      const cleanCaption = caption.trim() || (mediaType === 'video' ? 'New Reel #GediOn' : 'New Post #GediOn');
      const matchedTags = cleanCaption.match(/#[a-zA-Z0-9_]+/g) || ['#GediOn'];
      const authorHandle = activeUser.username || 'rameshrao034';
      const authorName = activeUser.displayName || 'GediOn Creator';
      const authorAvatar = activeUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';

      // Step 2: Insert into Supabase database
      // 2A. Attempt insert into 'posts' table (user_id, media_url, media_type, caption, created_at)
      try {
        await supabase.from('posts').insert([
          {
            user_id: activeUser.id || null,
            media_url: finalMediaUrl,
            media_type: mediaType,
            caption: cleanCaption,
            created_at: nowIso,
          },
        ]);
      } catch (postsErr) {
        // Table might not exist in schema, proceed safely
        console.warn('Supabase posts table insert note:', postsErr);
      }

      // 2B. Insert into Supabase 'reels' table (actively queried by Feed, Reels, Explore, and Profile)
      const reelRowPayload = {
        id: newPostId,
        video_url: finalMediaUrl,
        caption: cleanCaption,
        tags: matchedTags,
        creator_name: authorHandle,
        creator_avatar: authorAvatar,
        likes_count: 0,
        created_at: nowIso,
      };

      const { error: reelsError } = await supabase
        .from('reels')
        .insert([reelRowPayload])
        .select()
        .maybeSingle();

      if (reelsError) {
        console.warn('Supabase reels table insert note:', reelsError.message);
      }

      setUploadProgress(100);
      setUploadStatus('Published successfully! 🎉');

      // Construct enriched Reel object matching the app's feed schema
      const createdReel: Reel = {
        id: newPostId,
        creatorId: activeUser.id,
        creatorEmail: activeUser.email,
        username: authorHandle,
        displayName: authorName,
        avatar: authorAvatar,
        isVerified: true,
        isFollowing: true,
        videoUrl: finalMediaUrl,
        poster: mediaType === 'image' ? finalMediaUrl : '',
        fallbackGradient: 'from-cyan-950 via-purple-950 to-black',
        caption: cleanCaption,
        tags: matchedTags,
        audioTitle: mediaType === 'video' ? `Original Audio - ${authorName}` : '',
        audioArtist: authorName,
        likesCount: 0,
        isLiked: false,
        commentsCount: 0,
        isBookmarked: false,
        sharesCount: 0,
        viewsCount: '0',
        themeAccent: '#06b6d4',
        mediaType: mediaType,
        location: location.trim() || undefined,
        comments: [],
      };

      // Broadcast live event for ProfileScreen and other views
      window.dispatchEvent(new CustomEvent('reel-published', { detail: createdReel }));

      // Invoke parent handler to prepend to Home Feed and Profile Grid
      onPublish(createdReel);

      // Brief delay to display complete state before closing
      setTimeout(() => {
        handleResetMedia();
        onClose();
      }, 400);
    } catch (err: any) {
      console.error('Error sharing post to Supabase:', err);
      setErrorMessage(
        err?.message || 'Failed to upload media. Please check your network connection and try again.'
      );
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className={`relative w-full max-w-[580px] h-full sm:h-[88vh] max-h-[780px] rounded-none sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl border ${
          isDark
            ? 'bg-[#121212] border-zinc-800 text-white'
            : 'bg-white border-zinc-200 text-black'
        }`}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* TOP MODAL HEADER */}
        <header
          className={`flex items-center justify-between px-4 h-13 border-b shrink-0 ${
            isDark ? 'border-zinc-800 bg-[#121212]' : 'border-zinc-200 bg-white'
          }`}
        >
          {/* Left Action: Cancel / Discard */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              if (selectedFile) {
                if (window.confirm('Discard your changes and close?')) {
                  handleResetMedia();
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className={`p-1.5 rounded-full hover:opacity-70 active:scale-90 transition-transform cursor-pointer ${
              isUploading ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            aria-label="Close"
          >
            <X size={22} />
          </button>

          {/* Center Title */}
          <h2 className="font-bold text-base tracking-tight">
            {selectedFile ? 'Create New Post' : 'Select Media'}
          </h2>

          {/* Right Action: Share / Post Button */}
          {selectedFile ? (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleSharePost}
              className={`text-sm font-bold text-[#0095f6] hover:text-[#1877f2] active:opacity-60 transition-all cursor-pointer flex items-center gap-1.5 ${
                isUploading ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0095f6] border-t-transparent rounded-full animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <span>Share</span>
              )}
            </button>
          ) : (
            <div className="w-8" />
          )}
        </header>

        {/* UPLOAD PROGRESS BAR (When active) */}
        {isUploading && (
          <div className="w-full bg-zinc-800/40 h-1 relative overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0095f6] via-[#a855f7] to-[#ec4899]"
              initial={{ width: '0%' }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {/* ERROR BANNER */}
          {errorMessage && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-start gap-2.5 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="hover:opacity-75"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {!selectedFile ? (
            /* STEP 1: EMPTY STATE / FILE SELECTOR */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-5 flex items-center justify-center">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-zinc-800/80 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <ImageIcon size={38} className="translate-x-[-6px] translate-y-[-4px]" />
                    <Film size={34} className="translate-x-[8px] translate-y-[6px] text-[#0095f6]" />
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1.5 tracking-tight">
                Drag photos and videos here
              </h3>
              <p className={`text-xs max-w-xs mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Share your best moments to GediOn Feed or Reels. Supports high-res JPG, PNG, and MP4 up to 100MB.
              </p>

              {/* Primary Select Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={16} />
                  <span>Select from Computer / Phone</span>
                </button>
              </div>

              {/* Secondary Media Mode Suggestions */}
              <div className="mt-8 flex items-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/jpeg,image/png,image/webp,image/gif';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    isDark
                      ? 'border-zinc-800 hover:border-zinc-700 text-zinc-300 bg-zinc-900/40'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-zinc-50'
                  }`}
                >
                  <ImageIcon size={14} className="text-emerald-500" />
                  <span>Photo (JPG, PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'video/mp4,video/webm,video/quicktime';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    isDark
                      ? 'border-zinc-800 hover:border-zinc-700 text-zinc-300 bg-zinc-900/40'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-zinc-50'
                  }`}
                >
                  <Film size={14} className="text-[#0095f6]" />
                  <span>Video / Reel (MP4)</span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: LIVE MEDIA PREVIEW & POST DETAILS */
            <div className="flex-1 flex flex-col">
              {/* Media Preview Box */}
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black flex items-center justify-center overflow-hidden shrink-0 group">
                {mediaType === 'image' && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={`w-full h-full transition-all duration-200 ${
                      aspectRatioMode === 'contain' ? 'object-contain' : 'object-cover'
                    }`}
                  />
                ) : mediaType === 'video' && previewUrl ? (
                  <video
                    ref={videoPreviewRef}
                    src={previewUrl}
                    autoPlay
                    loop
                    playsInline
                    muted={isVideoMuted}
                    onClick={toggleVideoPlayback}
                    className={`w-full h-full transition-all duration-200 cursor-pointer ${
                      aspectRatioMode === 'contain' ? 'object-contain' : 'object-cover'
                    }`}
                  />
                ) : null}

                {/* Floating Media Controls Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 uppercase tracking-wide flex items-center gap-1">
                    {mediaType === 'video' ? (
                      <>
                        <Film size={12} className="text-[#0095f6]" />
                        <span>Video / Reel</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={12} className="text-emerald-400" />
                        <span>Photo</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Floating Top-Right Buttons: Aspect Ratio & Change Media */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  {/* Aspect Ratio Toggle (Cover vs Contain) */}
                  <button
                    type="button"
                    onClick={() =>
                      setAspectRatioMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))
                    }
                    title="Toggle Aspect Ratio"
                    className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer active:scale-95"
                  >
                    <Layers size={14} />
                  </button>

                  {/* Change File Button */}
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    title="Change selected file"
                    className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCw size={12} />
                    <span>Change</span>
                  </button>
                </div>

                {/* Video Playback and Audio Controls */}
                {mediaType === 'video' && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={toggleVideoPlayback}
                      className="p-1.5 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-white transition-all cursor-pointer"
                    >
                      {isVideoPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleVideoMute}
                      className="p-1.5 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-white transition-all cursor-pointer"
                    >
                      {isVideoMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* POST DETAILS & CONFIGURATION */}
              <div className="p-4 flex flex-col gap-4">
                {/* Creator Chip Preview */}
                <div className="flex items-center gap-3">
                  <img
                    src={activeUser.avatar}
                    alt={activeUser.displayName}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-500/20"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">{activeUser.username}</span>
                      <span className="text-[#0095f6] text-[10px]">●</span>
                    </div>
                    <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      GediOn Creator
                    </span>
                  </div>
                </div>

                {/* Publish Format Toggle (Feed Post vs Reel) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Publish As
                  </label>
                  <div
                    className={`grid grid-cols-2 p-1 rounded-xl border ${
                      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setPostType('post')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        postType === 'post'
                          ? isDark
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'bg-white text-black shadow-sm'
                          : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-zinc-600 hover:text-black'
                      }`}
                    >
                      <ImageIcon size={14} />
                      <span>Feed Post</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPostType('reel')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        postType === 'reel'
                          ? isDark
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'bg-white text-black shadow-sm'
                          : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-zinc-600 hover:text-black'
                      }`}
                    >
                      <Film size={14} className="text-[#0095f6]" />
                      <span>Reel</span>
                    </button>
                  </div>
                </div>

                {/* Caption & Hashtags Textarea */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Caption & Tags
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      {caption.length}/2,200
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={2200}
                    disabled={isUploading}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption or add hashtags (e.g. #GediOn, #Viral)..."
                    className={`w-full p-3 rounded-xl border text-xs resize-none outline-none transition-colors ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-[#0095f6]'
                        : 'bg-zinc-50 border-zinc-200 text-black placeholder-zinc-400 focus:border-[#0095f6]'
                    }`}
                  />

                  {/* Quick Hashtag Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_HASHTAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddHashtag(tag)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
                          caption.includes(tag)
                            ? 'bg-[#0095f6]/10 text-[#0095f6] border-[#0095f6]/40'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                            : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-black hover:border-zinc-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Location Input */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl border">
                  <MapPin size={16} className="text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    disabled={isUploading}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location (optional)"
                    className={`w-full text-xs bg-transparent outline-none ${
                      isDark ? 'text-white placeholder-zinc-500' : 'text-black placeholder-zinc-400'
                    }`}
                  />
                </div>

                {/* Status Message during Upload */}
                {isUploading && (
                  <div className="p-3 rounded-xl bg-[#0095f6]/10 border border-[#0095f6]/20 flex items-center justify-between text-xs font-semibold text-[#0095f6]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0095f6] border-t-transparent rounded-full animate-spin" />
                      <span>{uploadStatus || 'Processing upload...'}</span>
                    </div>
                    <span>{uploadProgress}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR (When file is selected) */}
        {selectedFile && (
          <footer
            className={`p-3 border-t shrink-0 flex items-center justify-between gap-3 ${
              isDark ? 'border-zinc-800 bg-[#121212]' : 'border-zinc-200 bg-white'
            }`}
          >
            <button
              type="button"
              disabled={isUploading}
              onClick={handleResetMedia}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                  : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
              } ${isUploading ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={handleSharePost}
              className={`flex-1 py-2.5 px-4 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing to GediOn ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Share {postType === 'reel' ? 'Reel' : 'Post'}</span>
                </>
              )}
            </button>
          </footer>
        )}
      </motion.div>
    </div>
  );
};
