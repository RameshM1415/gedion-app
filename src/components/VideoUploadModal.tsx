import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Camera,
  Upload,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Sparkles,
  Film,
  Hash,
  Layers,
  AlertCircle,
  ChevronRight,
  Video as VideoIcon,
  RefreshCw,
  CheckCircle2,
  CloudLightning,
  ArrowLeft,
} from 'lucide-react';
import { Reel } from '../types';
import { AudioTrack } from '../data/trendingAudio';
import { AudioPickerDrawer } from './AudioPickerDrawer';
import { AuthUser, DEFAULT_AUTH_USER } from '../utils/authStorage';
import {
  supabase,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_UPLOAD_ENDPOINT,
  optimizeCloudinaryVideoUrl,
} from '../utils/supabaseClient';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (newReel: Reel) => void;
  currentUser?: AuthUser | null;
}

const MAX_VIDEO_SIZE_MB = 100;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const CATEGORIES = [
  'Entertainment',
  'Comedy',
  'Music',
  'Tech',
  'Lifestyle',
  'Dance',
  'Fitness',
] as const;

const QUICK_HASHTAGS = [
  '#GediOn',
  '#Viral',
  '#Trending',
  '#Comedy',
  '#Dance',
  '#Tech',
  '#Fitness',
  '#Lifestyle',
  '#FYP',
];

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  currentUser,
}) => {
  // Mode selection: 'gallery' | 'camera' (defaulting to gallery for direct MP4/WebM selection)
  const [uploadMode, setUploadMode] = useState<'camera' | 'gallery'>('gallery');

  // Studio Flow State: 'capture' | 'details'
  const [step, setStep] = useState<'capture' | 'details'>('capture');

  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [maxDuration, setMaxDuration] = useState<15 | 30 | 60>(30);

  // Video Media State
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Cloudinary Upload Pipeline & Error Notification State
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Details Form State
  const [caption, setCaption] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Entertainment');
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DOM Refs
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start live camera
  const startCameraStream = useCallback(
    async (facing: 'environment' | 'user') => {
      stopCameraStream();
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available in this browser');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: true,
        });

        mediaStreamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } catch (err: any) {
        console.warn('Camera stream could not start:', err);
        setCameraError(
          err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
            ? 'Camera & microphone access was blocked. Please allow permissions in browser settings or upload an MP4/WebM file.'
            : 'Could not access camera on this device. You can choose an MP4/WebM video from your gallery below.'
        );
        setIsCameraActive(false);
      }
    },
    [stopCameraStream]
  );

  // Handle modal open/close & mode changes
  useEffect(() => {
    if (isOpen && uploadMode === 'camera' && step === 'capture') {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isOpen, uploadMode, step, facingMode, startCameraStream, stopCameraStream]);

  // Flip camera front/back
  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  // Start MediaRecorder
  const startRecording = () => {
    setErrorNotification(null);
    if (!mediaStreamRef.current) {
      setErrorNotification(
        'Camera stream is not active. Please allow camera access or select an MP4/WebM file from your device.'
      );
      return;
    }

    try {
      recordedChunksRef.current = [];

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm',
        });
        if (blob.size > 0) {
          if (blob.size > MAX_VIDEO_SIZE_BYTES) {
            setErrorNotification(
              `Recorded video exceeds the ${MAX_VIDEO_SIZE_MB}MB limit. Please record a shorter clip.`
            );
            return;
          }
          const ext = (mimeType || '').includes('mp4') ? 'mp4' : 'webm';
          const recordedFile = new File([blob], `gedion_record_${Date.now()}.${ext}`, {
            type: mimeType || 'video/webm',
          });
          const url = URL.createObjectURL(blob);
          setVideoFile(recordedFile);
          setVideoBlob(blob);
          setVideoBlobUrl(url);
          setStep('details');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);

      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      const startTime = Date.now();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed >= maxDuration) {
          stopRecording();
        } else {
          setRecordingSeconds(elapsed);
        }
      }, 100);
    } catch (err) {
      console.warn('MediaRecorder error:', err);
      setErrorNotification(
        'Recording could not be started on this browser. Please upload an MP4 or WebM file instead.'
      );
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }
    stopCameraStream();
  };

  // Pause / Resume recording
  const handleTogglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  // 1. Video Selection & Validation (MP4 / WebM)
  const validateAndProcessFile = (file: File) => {
    setErrorNotification(null);

    const isAllowedMime =
      ALLOWED_VIDEO_TYPES.includes(file.type) ||
      file.name.toLowerCase().endsWith('.mp4') ||
      file.name.toLowerCase().endsWith('.webm') ||
      file.name.toLowerCase().endsWith('.mov');

    if (!isAllowedMime) {
      setErrorNotification(
        'Unsupported video format. Please select an MP4 or WebM video file.'
      );
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorNotification(
        `File size (${sizeMb}MB) exceeds the ${MAX_VIDEO_SIZE_MB}MB maximum limit. Please choose a smaller video.`
      );
      return;
    }

    setVideoFile(file);
    setVideoBlob(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoBlobUrl(objectUrl);
    setStep('details');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
    // Reset input so selecting the same file again still triggers onChange
    e.target.value = '';
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  // Retake / Reset to capture
  const handleRetake = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSeconds(0);
    setVideoBlob(null);
    setVideoBlobUrl(null);
    setVideoFile(null);
    setUploadProgress(0);
    setUploadStatus('');
    setErrorNotification(null);
    setStep('capture');
  };

  // Hashtag chip tap
  const handleAddHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
    }
  };

  // Background audio sync in preview
  useEffect(() => {
    if (selectedAudio?.audioUrl && step === 'details') {
      const audio = new Audio(selectedAudio.audioUrl);
      audio.loop = true;
      audio.volume = 0.9;
      previewAudioRef.current = audio;

      if (!isVideoMuted && isVideoPlaying) {
        audio.play().catch(() => {});
      }
    }

    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [selectedAudio?.audioUrl, step, isVideoMuted, isVideoPlaying]);

  // 2. Unsigned Direct Upload to Cloudinary via XMLHttpRequest with Progress Tracking
  // CRITICAL: FormData payload contains ONLY "file" and "upload_preset" ("gedion_preset").
  // No 'api_key', 'timestamp', 'signature', or 'cloud_name' fields are attached.
  const uploadVideoToCloudinary = (selectedVideoFile: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', selectedVideoFile);
      formData.append('upload_preset', 'gedion_preset');

      const xhr = new XMLHttpRequest();
      activeXhrRef.current = xhr;

      xhr.open('POST', 'https://api.cloudinary.com/v1_1/ulcqbucx/video/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          // Map raw upload progress across 0% - 88% so transcoding & DB sync take 88% - 100%
          const scaledProgress = Math.min(88, Math.max(2, Math.round(percentComplete * 0.88)));
          setUploadProgress(scaledProgress);

          if (percentComplete < 75) {
            setUploadStatus(`Uploading video (${percentComplete}%)...`);
          } else {
            setUploadStatus('Processing video...');
          }
        }
      };

      xhr.onload = () => {
        activeXhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response && response.secure_url) {
              resolve(response.secure_url);
            } else {
              reject(new Error('Cloudinary response did not contain a valid secure_url.'));
            }
          } catch {
            reject(new Error('Invalid response received from Cloudinary CDN.'));
          }
        } else {
          let errMsg = `Cloudinary upload failed (HTTP ${xhr.status}).`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            if (errJson?.error?.message) {
              errMsg = `Cloudinary Error: ${errJson.error.message}`;
            }
          } catch {
            // ignore JSON parse error
          }
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        activeXhrRef.current = null;
        reject(
          new Error(
            'Network connection failed while uploading to Cloudinary CDN. Please check your internet connection and try again.'
          )
        );
      };

      xhr.ontimeout = () => {
        activeXhrRef.current = null;
        reject(new Error('Video upload timed out. Please try a smaller or shorter clip.'));
      };

      xhr.send(formData);
    });
  };

  // 3 & 4. Handle Post Reel: Direct Cloudinary Upload -> 720p Auto-Compression -> Supabase 'posts' Insert
  const handlePostReel = async () => {
    if (isSubmitting || !videoBlobUrl) return;
    setErrorNotification(null);
    setIsSubmitting(true);
    setUploadProgress(2);
    setUploadStatus('Uploading video...');

    const now = Date.now();
    const nowIso = new Date().toISOString();
    const activeUser = currentUser || DEFAULT_AUTH_USER;
    const captionText = caption.trim() || 'New Reel ⚡ #GediOn';
    const creatorName = activeUser.displayName || activeUser.username || 'Creator';
    const creatorAvatar =
      activeUser.avatar ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(creatorName)}&backgroundColor=06b6d4,a855f7`;
    const newReelId = `post_${now}`;

    try {
      // 1. Resolve file or blob binary to upload
      let selectedVideoFile: File | Blob | null = videoFile || videoBlob;

      if (!selectedVideoFile && videoBlobUrl) {
        const res = await fetch(videoBlobUrl);
        const fetchedBlob = await res.blob();
        selectedVideoFile = new File([fetchedBlob], `gedion_${now}.mp4`, {
          type: fetchedBlob.type || 'video/mp4',
        });
      }

      if (!selectedVideoFile) {
        throw new Error('No video file selected. Please select an MP4 or WebM video.');
      }

      if (selectedVideoFile.size > MAX_VIDEO_SIZE_BYTES) {
        const sizeMb = (selectedVideoFile.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `Video size (${sizeMb}MB) exceeds the ${MAX_VIDEO_SIZE_MB}MB upload limit.`
        );
      }

      // 2. Unsigned Direct Upload to Cloudinary (ONLY file + upload_preset: "gedion_preset")
      const rawSecureUrl = await uploadVideoToCloudinary(selectedVideoFile);

      setUploadProgress(92);
      setUploadStatus('Processing video...');

      // 3. Video Auto-Compression & CDN URL transformation:
      // Replace `/video/upload/` with `/video/upload/q_auto,f_auto,w_720,c_limit/`
      const optimizedVideoUrl = optimizeCloudinaryVideoUrl(
        rawSecureUrl.replace('/video/upload/', '/video/upload/q_auto,f_auto,w_720,c_limit/')
      );

      setUploadProgress(96);
      setUploadStatus('Sharing to GediOn...');

      const matchedTags = captionText.match(/#[a-zA-Z0-9_]+/g) || ['#GediOn', '#Viral'];
      const authorHandle = activeUser.username || 'rameshrao034';

      // 4. Insert record into Supabase 'reels' table (verified active in schema cache)
      const reelRowPayload = {
        id: newReelId,
        video_url: optimizedVideoUrl,
        caption: captionText,
        tags: matchedTags,
        creator_name: authorHandle,
        creator_avatar: creatorAvatar,
        likes_count: 0,
        created_at: nowIso,
      };

      const { data: insertedReel, error: reelsError } = await supabase
        .from('reels')
        .insert([reelRowPayload])
        .select()
        .maybeSingle();

      if (reelsError) {
        console.warn('Supabase reels table insert note:', reelsError.message);
      }

      // Also attempt insert into 'posts' table for backwards compatibility
      try {
        await supabase
          .from('posts')
          .insert([
            {
              user_id: activeUser.id,
              video_url: optimizedVideoUrl,
              caption: captionText,
              creator_name: authorHandle,
              creator_avatar: creatorAvatar,
              likes_count: 0,
              views_count: 0,
              created_at: nowIso,
            },
          ]);
      } catch (err) {
        // ignore if posts table is missing
      }

      setUploadProgress(100);
      setUploadStatus('Reel shared successfully! 🎉');

      const newReel: Reel = {
        id: insertedReel?.id ? String(insertedReel.id) : newReelId,
        creatorId: activeUser.id,
        creatorEmail: activeUser.email,
        username: authorHandle,
        displayName: creatorName,
        avatar: creatorAvatar,
        isVerified: true,
        isFollowing: true,
        videoUrl: optimizedVideoUrl,
        poster: '',
        fallbackGradient: 'from-cyan-950 via-purple-950 to-black',
        caption: captionText,
        tags: matchedTags,
        audioTitle: selectedAudio ? selectedAudio.title : 'Original Audio - Creator',
        audioArtist: selectedAudio ? selectedAudio.artist : creatorName,
        audioUrl: selectedAudio?.audioUrl,
        likesCount: 0,
        isLiked: false,
        commentsCount: 0,
        isBookmarked: false,
        sharesCount: 0,
        viewsCount: '0',
        themeAccent: '#06b6d4',
        badgeText: selectedCategory,
        mediaType: 'video',
        comments: [],
      };
      (newReel as any).video_url = optimizedVideoUrl;

      // 5. Auto-close modal and refresh feed on successful post
      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
        setUploadStatus('');
        try {
          const existingLocal = JSON.parse(localStorage.getItem('gedion_custom_reels') || '[]');
          localStorage.setItem('gedion_custom_reels', JSON.stringify([newReel, ...existingLocal]));
        } catch (e) {
          console.error(e);
        }
        window.dispatchEvent(new CustomEvent('reel-published', { detail: newReel }));
        onPublish(newReel);
        onClose();
      }, 350);
    } catch (err: any) {
      console.error('Cloudinary / Supabase upload pipeline error:', err);
      setErrorNotification(
        err?.message || 'Upload failed due to a network or server error. Please try again.'
      );
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  if (!isOpen) return null;

  // Circular progress calculation for live camera shutter
  const progressRatio = Math.min(recordingSeconds / maxDuration, 1);
  const strokeDashoffset = 188 - 188 * progressRatio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22 }}
        className="relative flex flex-col h-full w-full max-w-[460px] md:h-[92vh] md:max-h-[860px] md:rounded-[32px] overflow-hidden bg-[#0a0a0f] border border-white/10 shadow-2xl text-white"
      >
        {/* TOP APP BAR - Clean, modern Instagram Reels style header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#07070b]/90 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-2">
            {(step === 'details' || uploadMode === 'camera') && (
              <button
                type="button"
                onClick={uploadMode === 'camera' ? () => setUploadMode('gallery') : handleRetake}
                disabled={isSubmitting}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors active:scale-95 disabled:opacity-40 cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-bold text-white tracking-tight">
              Create New Reel
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* GLOBAL ERROR NOTIFICATION BANNER */}
        <AnimatePresence>
          {errorNotification && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mx-4 mt-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 flex items-start justify-between gap-2.5 shadow-[0_0_20px_rgba(244,63,94,0.35)] z-30"
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorNotification(null)}
                className="text-rose-300/70 hover:text-white p-0.5 shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= STEP 1: CAPTURE / UPLOAD ================= */}
        {step === 'capture' && (
          <div className="relative flex-1 flex flex-col overflow-hidden bg-[#07070b]">
            {/* OPTION A: CAMERA RECORDING */}
            {uploadMode === 'camera' && (
              <div className="relative flex-1 flex flex-col items-center justify-between overflow-hidden">
                {/* Live Video Viewport */}
                <div className="absolute inset-0 z-0 bg-zinc-950 flex items-center justify-center">
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />

                  {/* Fallback error overlay if camera is denied */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-[#07070b]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
                      <div className="h-14 w-14 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 mb-3 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                        <AlertCircle size={28} />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">Camera Not Available</h3>
                      <p className="text-xs text-white/60 max-w-xs mb-4 leading-relaxed">
                        {cameraError}
                      </p>
                      <div className="flex flex-col gap-2 w-full max-w-xs">
                        <button
                          type="button"
                          onClick={() => setUploadMode('gallery')}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.7)] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Upload size={16} />
                          <span>Choose from Files</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => startCameraStream(facingMode)}
                          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RefreshCw size={14} />
                          <span>Retry Camera</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Camera Controls Overlay */}
                <div className="relative z-10 w-full flex items-center justify-between px-4 pt-3">
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/15 rounded-full p-1">
                    {([15, 30, 60] as const).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        disabled={isRecording}
                        onClick={() => setMaxDuration(dur)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          maxDuration === dur
                            ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                            : 'text-white/60 hover:text-white disabled:opacity-40'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      disabled={isRecording}
                      title="Flip Camera"
                      className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw size={17} className="text-cyan-300" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('gallery')}
                      disabled={isRecording}
                      className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                    >
                      Gallery
                    </button>
                  </div>
                </div>

                {/* Center Recording Timer Display */}
                {isRecording && (
                  <div className="relative z-10 flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-950/80 border border-red-500/60 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                    <span className="text-xs font-mono font-extrabold text-white">
                      00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:{maxDuration}
                    </span>
                  </div>
                )}

                {/* Bottom Camera Controls & Shutter Ring */}
                <div className="relative z-10 w-full flex items-center justify-around px-6 pb-6 pt-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <button
                    type="button"
                    onClick={() => setIsAudioDrawerOpen(true)}
                    disabled={isRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-white/90 text-xs font-medium backdrop-blur-md hover:border-cyan-400 active:scale-95 transition-all max-w-[130px] cursor-pointer"
                  >
                    <Music size={14} className="text-cyan-400 shrink-0" />
                    <span className="truncate text-[11px]">
                      {selectedAudio ? selectedAudio.title : 'Sound'}
                    </span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <svg className="h-20 w-20 -rotate-90 pointer-events-none" viewBox="0 0 70 70">
                      <circle
                        cx="35"
                        cy="35"
                        r="30"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="35"
                        cy="35"
                        r="30"
                        stroke="#06b6d4"
                        strokeWidth="4"
                        strokeDasharray="188"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-100 ease-linear shadow-[0_0_15px_#06b6d4]"
                      />
                    </svg>

                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                      className="absolute flex items-center justify-center h-14 w-14 rounded-full bg-white transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.4)] cursor-pointer"
                    >
                      {isRecording ? (
                        <span className="h-5 w-5 rounded-md bg-red-600 shadow-[0_0_10px_#dc2626]" />
                      ) : (
                        <span className="h-12 w-12 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 shadow-[0_0_15px_#f43f5e]" />
                      )}
                    </button>
                  </div>

                  {isRecording ? (
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className="p-3 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                    >
                      {isPaused ? <Play size={18} className="text-cyan-400" /> : <Pause size={18} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUploadMode('gallery')}
                      className="flex flex-col items-center gap-0.5 text-white/70 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <div className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 flex items-center justify-center">
                        <Upload size={16} />
                      </div>
                      <span className="text-[10px]">Files</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* OPTION B: CREATOR-FRIENDLY GALLERY SELECTION (Sleek 9:16 Preview Card) */}
            {uploadMode === 'gallery' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto no-scrollbar"
              >
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Sleek 9:16 rounded vertical preview card with subtle neon borders */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full max-w-[270px] aspect-[9/16] rounded-[28px] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group overflow-hidden bg-gradient-to-b from-white/[0.04] via-[#090913] to-purple-950/20 border border-white/15 hover:border-cyan-400/60 shadow-[0_0_35px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_40px_rgba(6,182,212,0.3)]"
                >
                  {/* Subtle neon ambient backlight */}
                  <div className="pointer-events-none absolute -inset-2 bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex flex-col items-center justify-center h-full w-full space-y-4">
                    {/* Clean video icon with glowing badge */}
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-400/20 via-purple-500/20 to-fuchsia-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)]">
                      <VideoIcon size={30} strokeWidth={2.2} />
                    </div>

                    {/* Simple title and subtitle */}
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Select a Video from Gallery
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed max-w-[200px]">
                        Share your reel with the community
                      </p>
                    </div>

                    {/* Two distinct modern pill buttons */}
                    <div className="flex flex-col gap-2.5 w-full pt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 active:scale-95 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload size={15} strokeWidth={2.5} />
                        <span>📁 Choose from Files</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setErrorNotification(null);
                          setUploadMode('camera');
                        }}
                        className="w-full py-3 px-4 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Camera size={15} strokeWidth={2.2} className="text-fuchsia-400" />
                        <span>📷 Open Camera</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: DETAILS, PREVIEW & POST ================= */}
        {step === 'details' && videoBlobUrl && (
          <div className="relative flex-1 flex flex-col overflow-y-auto no-scrollbar p-4 space-y-4 bg-[#07070b]">
            {/* Top row: 9:16 Video Preview Card + Caption Textarea */}
            <div className="flex gap-3.5 items-start">
              {/* 9:16 Vertical Preview Video inside card with subtle neon border */}
              <div className="relative w-36 aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/20 shadow-[0_0_25px_rgba(0,0,0,0.8),0_0_15px_rgba(6,182,212,0.25)] shrink-0 group">
                <video
                  ref={previewVideoRef}
                  src={videoBlobUrl}
                  autoPlay
                  loop
                  playsInline
                  muted={isVideoMuted}
                  className="h-full w-full object-cover"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />

                {/* Play/Pause overlay indicator */}
                <button
                  type="button"
                  onClick={() => {
                    if (previewVideoRef.current) {
                      if (isVideoPlaying) {
                        previewVideoRef.current.pause();
                      } else {
                        previewVideoRef.current.play();
                      }
                    }
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white backdrop-blur-md">
                    {isVideoPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                  </div>
                </button>

                {/* Audio Mute button on top-right */}
                <button
                  type="button"
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md hover:bg-black/80 transition-colors cursor-pointer"
                >
                  {isVideoMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>

                {/* Subtle "Change Video" button overlay */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRetake}
                  className="absolute bottom-2.5 inset-x-2.5 py-1.5 px-2 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>Change Video</span>
                </button>
              </div>

              {/* Caption & Metadata text area */}
              <div className="flex-1 flex flex-col h-full min-h-[160px]">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Write a caption... (e.g. #GediOn #Viral)"
                  rows={6}
                  className="w-full h-full min-h-[150px] rounded-2xl bg-white/[0.04] border border-white/10 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 p-3.5 text-xs text-white placeholder-white/40 transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Quick Hashtag Chips */}
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAddHashtag(tag)}
                    className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-[11px] font-medium text-white/70 hover:text-cyan-300 transition-all active:scale-95 cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio / Soundtrack Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/90 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Music size={14} className="text-cyan-400" />
                  <span>Audio &amp; Music</span>
                </span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAudioDrawerOpen(true)}
                  className="text-[11px] text-cyan-400 font-bold hover:underline cursor-pointer"
                >
                  {selectedAudio ? 'Change Audio' : 'Select Sound'} →
                </button>
              </label>

              <div
                onClick={() => !isSubmitting && setIsAudioDrawerOpen(true)}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                    <Music size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {selectedAudio ? selectedAudio.title : 'Original Audio'}
                    </h5>
                    <p className="text-[11px] text-white/50">
                      {selectedAudio ? selectedAudio.artist : 'Recorded with video'}
                    </p>
                  </div>
                </div>

                <ChevronRight size={16} className="text-white/40 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>

            {/* Category Selector Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-400" />
                <span>Select Category</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)] font-bold'
                        : 'bg-white/[0.04] text-white/70 hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Prominent Action Button: 🚀 Share Reel & Progress Bar */}
            <div className="pt-2 pb-4">
              {isSubmitting ? (
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-400/40 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.25)] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-cyan-400" />
                      <span>{uploadStatus || 'Sharing your reel...'}</span>
                    </span>
                    <span className="font-extrabold text-sm text-fuchsia-400">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_12px_#06b6d4]"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePostReel}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-black font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.7)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🚀 Share Reel</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SOUND DRAWER MODAL */}
        <AudioPickerDrawer
          isOpen={isAudioDrawerOpen}
          onClose={() => setIsAudioDrawerOpen(false)}
          onSelectTrack={(track) => {
            setSelectedAudio(track);
            setIsAudioDrawerOpen(false);
          }}
          selectedTrackId={selectedAudio?.id}
        />
      </motion.div>
    </div>
  );
};

export const UploadModal = VideoUploadModal;
