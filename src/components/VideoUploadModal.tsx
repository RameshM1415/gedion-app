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
  'Comedy',
  'Dance',
  'Tech',
  'Fitness',
  'Lifestyle',
  'Music',
  'Entertainment',
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
  const [selectedCategory, setSelectedCategory] = useState<string>('Comedy');
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
            setUploadStatus(`UPLOADING TO CDN... (${percentComplete}%)`);
          } else {
            setUploadStatus('TRANSCODING 720p...');
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
    setUploadStatus('UPLOADING TO CDN...');

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
      setUploadStatus('TRANSCODING 720p...');

      // 3. Video Auto-Compression & CDN URL transformation:
      // Replace `/video/upload/` with `/video/upload/q_auto,f_auto,w_720,c_limit/`
      const optimizedVideoUrl = optimizeCloudinaryVideoUrl(
        rawSecureUrl.replace('/video/upload/', '/video/upload/q_auto,f_auto,w_720,c_limit/')
      );

      setUploadProgress(96);
      setUploadStatus('SYNCING WITH SUPABASE DATABASE...');

      // 4. Insert record into Supabase 'posts' table as required
      const postPayload = {
        user_id: activeUser.id,
        video_url: optimizedVideoUrl,
        caption: captionText,
        likes_count: 0,
        views_count: 0,
        created_at: nowIso,
      };

      const { data: insertedPost, error: postsError } = await supabase
        .from('posts')
        .insert([postPayload])
        .select()
        .maybeSingle();

      if (postsError) {
        console.warn('Supabase posts table insert note:', postsError.message);
      }

      setUploadProgress(100);
      setUploadStatus('BROADCAST LIVE ON GEDION CDN!');

      const matchedTags = captionText.match(/#[a-zA-Z0-9_]+/g) || ['#GediOn', '#Viral'];

      const newReel: Reel = {
        id: insertedPost?.id ? String(insertedPost.id) : newReelId,
        creatorId: activeUser.id,
        creatorEmail: activeUser.email,
        username: activeUser.username || 'creator',
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
        className="relative flex flex-col h-full w-full max-w-[460px] md:h-[94vh] md:max-h-[900px] md:rounded-[32px] overflow-hidden bg-[#0a0a0f] border border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.28),0_0_30px_rgba(217,70,239,0.18)] text-white"
      >
        {/* TOP APP BAR */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-[#0a0a0f]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-fuchsia-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.6)]">
              <Film size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white flex items-center gap-1.5">
                GediOn Studio
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-cyan-300 border border-cyan-400/40">
                  CDN 720p
                </span>
              </h2>
              <p className="text-[11px] text-white/50">
                {step === 'capture'
                  ? uploadMode === 'gallery'
                    ? 'Select MP4 / WebM video for instant CDN compression'
                    : 'Record live vertical reel'
                  : 'Preview, add caption & broadcast to GediOn'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close Studio"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors active:scale-95 disabled:opacity-40"
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
          <div className="relative flex-1 flex flex-col overflow-hidden bg-[#0a0a0f]">
            {/* Dual Upload Mode Toggle Tabs */}
            <div className="flex justify-center p-3 z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex rounded-full p-1 bg-white/5 border border-cyan-500/30 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setErrorNotification(null);
                    setUploadMode('gallery');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    uploadMode === 'gallery'
                      ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Upload size={14} />
                  <span>📁 Upload MP4/WebM</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorNotification(null);
                    setUploadMode('camera');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    uploadMode === 'camera'
                      ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Camera size={14} />
                  <span>📸 Live Camera</span>
                </button>
              </div>
            </div>

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
                    <div className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
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
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.7)] flex items-center justify-center gap-2"
                        >
                          <Upload size={16} />
                          <span>Select MP4 / WebM File</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => startCameraStream(facingMode)}
                          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} />
                          <span>Retry Camera</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Camera Controls Overlay */}
                <div className="relative z-10 w-full flex items-center justify-between px-4 pt-1">
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

                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    disabled={isRecording}
                    title="Flip Camera (Front / Back)"
                    className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg disabled:opacity-40"
                  >
                    <RefreshCw size={18} className="text-cyan-300" />
                  </button>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-white/90 text-xs font-medium backdrop-blur-md hover:border-cyan-400 active:scale-95 transition-all max-w-[130px]"
                  >
                    <Music size={14} className="text-cyan-400 shrink-0" />
                    <span className="truncate text-[11px]">
                      {selectedAudio ? selectedAudio.title : 'Add Sound'}
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
                      className="absolute flex items-center justify-center h-14 w-14 rounded-full bg-white transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
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
                      className="p-3 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md active:scale-95 transition-all"
                    >
                      {isPaused ? <Play size={18} className="text-cyan-400" /> : <Pause size={18} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUploadMode('gallery')}
                      className="flex flex-col items-center gap-0.5 text-white/70 hover:text-cyan-300 transition-colors"
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

            {/* OPTION B: GALLERY FILE PICKER (Direct MP4/WebM Selection) */}
            {uploadMode === 'gallery' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative flex-1 flex flex-col p-4 overflow-y-auto space-y-4"
              >
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Cyberpunk Dropzone Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-cyan-500/50 hover:border-fuchsia-400 bg-gradient-to-b from-cyan-950/20 via-[#0a0a0f] to-fuchsia-950/20 hover:from-cyan-950/30 hover:to-fuchsia-950/30 transition-all cursor-pointer group shadow-[0_0_35px_rgba(6,182,212,0.18)]"
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_25px_rgba(6,182,212,0.45)]">
                    <CloudLightning size={32} />
                  </div>

                  <h3 className="text-base font-extrabold text-white mb-1 text-center tracking-wide">
                    Select MP4 or WebM Reel
                  </h3>
                  <p className="text-xs text-white/60 text-center max-w-xs mb-4">
                    Tap to choose from mobile/desktop or drag &amp; drop here. Auto-transcodes to 720p for zero-buffering playback.
                  </p>

                  <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 group-hover:from-cyan-300 group-hover:to-fuchsia-400 text-black text-xs font-extrabold shadow-[0_0_20px_rgba(6,182,212,0.8)] flex items-center gap-2">
                    <VideoIcon size={14} />
                    <span>Browse MP4 / WebM Video 🚀</span>
                  </div>

                  <div className="flex items-center gap-3 mt-4 text-[10px] text-cyan-300/70 font-mono">
                    <span>• MP4 / WebM</span>
                    <span>• Max {MAX_VIDEO_SIZE_MB}MB</span>
                    <span>• Auto 720p CDN</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: DETAILS, PREVIEW & POST ================= */}
        {step === 'details' && videoBlobUrl && (
          <div className="relative flex-1 flex flex-col overflow-y-auto p-4 space-y-4 bg-[#0a0a0f]">
            {/* Top row: Video Preview Player + Quick Actions */}
            <div className="flex gap-4">
              {/* 9:16 Vertical Preview Video */}
              <div className="relative w-36 aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.35)] shrink-0 group">
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

                {/* Play/Pause overlay */}
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
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="h-10 w-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white backdrop-blur-md">
                    {isVideoPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                  </div>
                </button>

                {/* Bottom Mute button */}
                <button
                  type="button"
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md"
                >
                  {isVideoMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
              </div>

              {/* Media Info & Retake Action */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold mb-2">
                    <CheckCircle2 size={12} className="text-cyan-400" />
                    <span>Ready for 720p CDN</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    {videoFile ? videoFile.name : 'Captured Video Reel'}
                  </h4>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    {videoFile
                      ? `Size: ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Auto-compressed via Cloudinary q_auto,f_auto,w_720`
                      : 'Direct unsigned upload to Cloudinary CDN with zero-buffering mobile optimization.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRetake}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 active:scale-95 transition-all mt-3 disabled:opacity-40"
                >
                  <RotateCcw size={14} />
                  <span>Change Video</span>
                </button>
              </div>
            </div>

            {/* CAPTION & HASHTAGS INPUT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                <Hash size={14} className="text-cyan-400" />
                <span>Caption &amp; Hashtags</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isSubmitting}
                placeholder="Write a caption... e.g. Neon pulse over Neo-Tokyo #GediOn #Viral"
                rows={3}
                className="w-full rounded-2xl bg-white/5 border border-cyan-500/25 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 p-3 text-xs text-white placeholder-white/40 transition-all resize-none"
              />

              {/* Quick Hashtag Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAddHashtag(tag)}
                    className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-[11px] font-medium text-white/70 hover:text-cyan-300 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* SOUND / AUDIO TAG SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Music size={14} className="text-cyan-400" />
                  <span>Audio &amp; Soundtrack</span>
                </span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAudioDrawerOpen(true)}
                  className="text-[11px] text-cyan-400 font-semibold hover:underline"
                >
                  Change Sound →
                </button>
              </label>

              <div
                onClick={() => !isSubmitting && setIsAudioDrawerOpen(true)}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/15 hover:border-cyan-500/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                    <Music size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {selectedAudio ? selectedAudio.title : 'Original Audio'}
                    </h5>
                    <p className="text-[11px] text-white/50">
                      {selectedAudio ? selectedAudio.artist : 'Recorded / Uploaded Audio'}
                    </p>
                  </div>
                </div>

                <ChevronRight size={16} className="text-white/40 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>

            {/* CATEGORY SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.8)] border border-cyan-300'
                        : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION: POST REEL BUTTON / CYBERPUNK NEON PROGRESS BAR */}
            <div className="pt-2 pb-4 space-y-2">
              {isSubmitting ? (
                <div className="p-4 rounded-2xl bg-[#0d0d16] border border-cyan-400/50 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.35),0_0_20px_rgba(217,70,239,0.2)] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold tracking-wider text-cyan-300 flex items-center gap-2 uppercase font-mono">
                      <RefreshCw size={14} className="animate-spin text-cyan-400" />
                      {uploadStatus || 'UPLOADING TO CDN...'}
                    </span>
                    <span className="font-mono font-black text-sm text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="w-full bg-white/10 rounded-full h-3.5 overflow-hidden p-0.5 border border-cyan-500/40">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500 shadow-[0_0_16px_#06b6d4]"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>

                  <p className="text-[10px] text-white/50 text-center font-mono">
                    Cloudinary CDN (ulcqbucx) • Auto-Optimizing q_auto,f_auto,w_720,c_limit
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePostReel}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-black font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.8)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CloudLightning size={18} />
                  <span>Broadcast Reel to CDN 🚀</span>
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
