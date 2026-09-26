import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  ZapOff,
  Music,
  Settings,
  Type,
  Infinity as InfinityIcon,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Timer,
  Sparkles,
  RotateCcw,
  Mic,
  MicOff,
  Check,
  Disc3,
} from 'lucide-react';
import { Reel } from '../types';
import { AudioTrack } from '../data/trendingAudio';
import { AudioPickerDrawer, SoundDrawer } from './AudioPickerDrawer';
import { EffectsDrawer } from './EffectsDrawer';
import { PostReelDetailsModal } from './PostReelDetailsModal';
import { SettingsModal } from './SettingsModal';
import { formatTime } from '../utils/formatters';

// Filter Options as strictly specified
export interface CameraFilterPreset {
  id: string;
  name: string;
  shortLabel: string;
  cssFilter: string;
  gradient: string;
}

export const CAMERA_FILTER_PRESETS: CameraFilterPreset[] = [
  {
    id: 'original',
    name: 'Original',
    shortLabel: 'Original',
    cssFilter: 'none',
    gradient: 'from-zinc-700 via-zinc-800 to-zinc-950',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    shortLabel: 'Cyber',
    cssFilter: 'contrast(1.25) hue-rotate(185deg) saturate(1.45)',
    gradient: 'from-cyan-400 via-fuchsia-600 to-indigo-950',
  },
  {
    id: 'cinematic-gold',
    name: 'Cinematic Gold',
    shortLabel: 'Gold',
    cssFilter: 'sepia(0.3) contrast(1.15) brightness(1.05) saturate(1.1)',
    gradient: 'from-amber-300 via-yellow-600 to-orange-800',
  },
  {
    id: 'noir-vintage',
    name: 'Noir Vintage',
    shortLabel: 'Noir',
    cssFilter: 'grayscale(1) contrast(1.35) brightness(0.95)',
    gradient: 'from-slate-300 via-zinc-600 to-black',
  },
  {
    id: 'smooth-glow',
    name: 'Smooth Glow',
    shortLabel: 'Glow',
    cssFilter: 'brightness(1.12) saturate(1.25) contrast(1.05)',
    gradient: 'from-rose-300 via-pink-500 to-purple-700',
  },
];

export interface RecordingViewProps {
  onClose: () => void;
  reels?: Reel[];
  onPublish?: (newReel: Reel) => void;
  initialMode?: 'POST' | 'STORY' | 'PHOTO' | 'REEL' | 'LIVE';
  onOpenChatWithUser?: (username: string) => void;
}

export const RecordingView: React.FC<RecordingViewProps> = ({
  onClose,
  onPublish,
  initialMode = 'REEL',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('original');
  const [customCssFilter, setCustomCssFilter] = useState<string | null>(null);
  const [isEffectsDrawerOpen, setIsEffectsDrawerOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  type CameraMode = 'POST' | 'STORY' | 'PHOTO' | 'REEL' | 'LIVE';
  const [activeMode, setActiveMode] = useState<CameraMode>(initialMode || 'REEL');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [isBoomerangActive, setIsBoomerangActive] = useState(false);
  const [isGridActive, setIsGridActive] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isExpandedTools, setIsExpandedTools] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Video recording & timer state
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedMediaType, setRecordedMediaType] = useState<'video' | 'image'>('video');
  const [isPostDetailsOpen, setIsPostDetailsOpen] = useState(false);

  // Audio selection state (Sound Drawer)
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<AudioTrack | null>(null);

  const syncAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const filterCarouselRef = useRef<HTMLDivElement | null>(null);

  const activePreset =
    CAMERA_FILTER_PRESETS.find((p) => p.id === selectedFilterId) || CAMERA_FILTER_PRESETS[0];

  const currentFilterCss =
    customCssFilter !== null ? customCssFilter : activePreset.cssFilter;

  const stopSyncAudio = useCallback(() => {
    if (syncAudioRef.current) {
      try {
        syncAudioRef.current.onplay = null;
        syncAudioRef.current.pause();
        syncAudioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, []);

  // Preload audio for instant synchronized playback
  useEffect(() => {
    if (selectedAudioTrack?.audioUrl) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = selectedAudioTrack.audioUrl;
      audio.volume = 1.0;
      audio.load();
      syncAudioRef.current = audio;
    } else {
      if (syncAudioRef.current) {
        try {
          syncAudioRef.current.onplay = null;
          syncAudioRef.current.pause();
          syncAudioRef.current.src = '';
        } catch {
          // ignore
        }
        syncAudioRef.current = null;
      }
    }
  }, [selectedAudioTrack?.audioUrl]);

  const stopCamera = useCallback(() => {
    stopSyncAudio();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStreaming(false);
  }, [stopSyncAudio]);

  const startCamera = useCallback(async (mode: 'environment' | 'user' = 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Camera API not available');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Live camera stream not supported or permission denied:', err);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, [startCamera, stopCamera, facingMode]);

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const startMediaRecorderEngine = () => {
    if (!streamRef.current) return;
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
      const mediaRecorder = new MediaRecorder(streamRef.current, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm',
        });
        if (recordedBlob.size > 0) {
          const videoUrl = URL.createObjectURL(recordedBlob);
          setRecordedVideoUrl(videoUrl);
          setRecordedMediaType('video');
          setIsPostDetailsOpen(true);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);
    } catch (recorderError) {
      console.warn('MediaRecorder error:', recorderError);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    stopSyncAudio();
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
    }
  };

  const startRecording = () => {
    const hasSound = Boolean(selectedAudioTrack?.audioUrl);

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !hasSound && !isMicMuted;
      });
    }

    let audio = syncAudioRef.current;
    if (hasSound && !audio && selectedAudioTrack?.audioUrl) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.src = selectedAudioTrack.audioUrl;
      audio.volume = 1.0;
      audio.load();
      syncAudioRef.current = audio;
    }

    let sessionStarted = false;
    const beginSession = () => {
      if (sessionStarted) return;
      sessionStarted = true;

      const exactStartTime = Date.now();
      setIsRecording(true);

      startMediaRecorderEngine();

      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - exactStartTime) / 1000;
        if (elapsed >= 60) {
          setRecordingSeconds(60);
          stopRecording();
        } else {
          setRecordingSeconds(elapsed);
        }
      }, 50);
    };

    if (hasSound && audio) {
      audio.currentTime = 0;
      audio.volume = 1.0;

      audio.onplay = () => {
        beginSession();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            beginSession();
          })
          .catch((err) => {
            console.warn('Sync audio play promise handled:', err);
            beginSession();
          });
      }
    } else {
      beginSession();
    }
  };

  const handleToggleMic = () => {
    setIsMicMuted((prev) => {
      const nextMuted = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
      }
      return nextMuted;
    });
  };

  // Capture Photo with retained CSS filter and mirror correction
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentFilterCss && currentFilterCss !== 'none') {
      ctx.filter = currentFilterCss;
    }

    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    try {
      ctx.drawImage(video, 0, 0, width, height);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setRecordedVideoUrl(photoDataUrl);
      setRecordedMediaType('image');
      setIsPostDetailsOpen(true);
    } catch (captureErr) {
      console.warn('Canvas photo capture failed:', captureErr);
    }
  };

  const handleToggleRecord = () => {
    if (activeMode === 'PHOTO') {
      handleCapturePhoto();
      return;
    }

    if (!isRecording) {
      setRecordedMediaType('video');
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleRetake = () => {
    setIsPostDetailsOpen(false);
    setRecordedVideoUrl(null);
    setRecordingSeconds(0);
  };

  const handlePublishRecordedReel = (newReel: Reel) => {
    setIsPostDetailsOpen(false);
    stopCamera();
    if (onPublish) {
      onPublish(newReel);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImg = file.type.startsWith('image/');
      const mediaUrl = URL.createObjectURL(file);
      setRecordedVideoUrl(mediaUrl);
      setRecordedMediaType(isImg ? 'image' : 'video');
      setIsPostDetailsOpen(true);
    }
  };

  const handleFilterSelect = (preset: CameraFilterPreset, index: number) => {
    setSelectedFilterId(preset.id);
    setCustomCssFilter(null);

    // Smooth scroll the carousel to center the selected item
    if (filterCarouselRef.current) {
      const container = filterCarouselRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between bg-black text-white overflow-hidden select-none">
      {/* 1. TOP BAR CONTROLS */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-2.5 bg-black h-14 shrink-0">
        {/* Left: '✕' close button */}
        <button
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:text-white active:scale-90 transition-transform"
          aria-label="Close Camera"
        >
          <X size={26} strokeWidth={2.2} />
        </button>

        {/* Center: Audio Pill & Flash Toggle */}
        <div className="flex items-center gap-2">
          {/* Flash Toggle */}
          <button
            onClick={() => {
              setFlashMode((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
            }}
            className={`flex h-9 items-center justify-center gap-1 px-2.5 rounded-full text-xs font-semibold tracking-wider transition-all ${
              flashMode !== 'off'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                : 'text-white/80 hover:text-white'
            }`}
            aria-label="Toggle Flash"
          >
            {flashMode === 'off' ? (
              <ZapOff size={19} strokeWidth={2} />
            ) : (
              <Zap size={19} className="text-amber-400 fill-amber-400" strokeWidth={2} />
            )}
            {flashMode === 'auto' && <span className="text-[10px]">A</span>}
          </button>

          {/* Sound / Music Audio Pill Button */}
          <button
            type="button"
            onClick={() => setIsAudioDrawerOpen(true)}
            style={
              selectedAudioTrack
                ? {
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
                  }
                : undefined
            }
            className={`flex items-center gap-2 max-w-[160px] sm:max-w-[210px] rounded-full px-3.5 py-1.5 backdrop-blur-xl border text-xs font-bold transition-all active:scale-95 ${
              selectedAudioTrack
                ? 'bg-cyan-950/70 border-cyan-400/80 text-cyan-200'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white/90 hover:text-white shadow-md'
            }`}
          >
            {selectedAudioTrack ? (
              <>
                <span className="relative flex items-center justify-center">
                  <Music
                    size={13}
                    className="text-cyan-300 animate-[bounce_1.5s_infinite] drop-shadow-[0_0_6px_#06b6d4]"
                  />
                </span>
                <span className="truncate">{selectedAudioTrack.title}</span>
              </>
            ) : (
              <>
                <Music size={13} className="text-cyan-400" />
                <span>🎵 Audio</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Settings gear icon */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:text-white active:scale-90 transition-transform"
          aria-label="Camera Settings"
        >
          <Settings size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* 2. AUTHENTIC VIEWPORT & ASPECT FRAMING */}
      <div className="relative flex-1 w-full mx-auto overflow-hidden rounded-2xl bg-zinc-950 flex items-center justify-center border border-white/10 shadow-inner">
        {/* Live Camera Video Feed with Real-time CSS Filter applied */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPlaying={() => setIsStreaming(true)}
          className={`absolute inset-0 h-full w-full object-cover z-0 transition-all duration-300 ${
            isStreaming ? 'opacity-100' : 'opacity-0'
          } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          style={{
            filter: currentFilterCss !== 'none' ? currentFilterCss : undefined,
          }}
        />

        {/* Dark fallback before camera stream loads */}
        {!isStreaming && <div className="absolute inset-0 bg-[#0c0c12] z-0" />}

        {/* 3x3 Grid Overlay */}
        {isGridActive && (
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 z-10">
            <div className="border-r border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="" />
          </div>
        )}

        {/* Flash visual burst effect */}
        {flashMode === 'on' && isRecording && (
          <div className="pointer-events-none absolute inset-0 bg-white/20 z-10 animate-pulse" />
        )}

        {/* Live Recording Red Header Pill with Time & Cycle count */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/80 backdrop-blur-md px-3.5 py-1.5 border border-red-500/60 shadow-[0_0_16px_rgba(239,68,68,0.6)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="font-mono text-xs font-bold text-red-100 tracking-wider">
              {formatTime(recordingSeconds)} / 01:00
            </span>
            <span className="text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/30">
              {recordingSeconds <= 30 ? 'Cycle 1/2' : 'Cycle 2/2'}
            </span>
          </div>
        )}

        {/* Active Filter Pill Floating Indicator at top of viewport */}
        {selectedFilterId !== 'original' && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/40 text-[11px] font-bold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Sparkles size={12} className="text-cyan-400" />
            <span>{activePreset.name}</span>
          </div>
        )}

        {/* 3. LEFT VERTICAL FLOATING TOOLBAR */}
        <div className="absolute left-3 top-6 z-20 flex flex-col items-center gap-3">
          {/* 'Aa' (Create/Text) */}
          <button
            type="button"
            onClick={() => setIsEffectsDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-white border border-white/15 active:scale-95 shadow-md hover:bg-black/60 transition-all"
            title="Create / Text"
          >
            <Type size={19} strokeWidth={2.4} />
          </button>

          {/* '∞' (Boomerang) */}
          <button
            type="button"
            onClick={() => setIsBoomerangActive((prev) => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md border active:scale-95 shadow-md transition-all ${
              isBoomerangActive
                ? 'bg-pink-600/80 border-pink-400 text-white shadow-[0_0_12px_rgba(244,114,182,0.6)]'
                : 'bg-black/45 border-white/15 text-white hover:bg-black/60'
            }`}
            title="Boomerang"
          >
            <InfinityIcon size={20} strokeWidth={2.4} />
          </button>

          {/* Grid */}
          <button
            type="button"
            onClick={() => setIsGridActive((prev) => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md border active:scale-95 shadow-md transition-all ${
              isGridActive
                ? 'bg-cyan-500/80 border-cyan-300 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                : 'bg-black/45 border-white/15 text-white hover:bg-black/60'
            }`}
            title="Grid"
          >
            <LayoutGrid size={18} strokeWidth={2.4} />
          </button>

          {/* Mic Mute / Unmute */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md border active:scale-95 shadow-md transition-all ${
              isMicMuted
                ? 'bg-red-600/85 border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                : 'bg-black/45 border-white/15 text-white hover:bg-black/60'
            }`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? (
              <MicOff size={18} strokeWidth={2.4} className="text-white" />
            ) : (
              <Mic size={18} strokeWidth={2.4} className="text-white" />
            )}
          </button>

          {/* Expand more tools toggle */}
          <button
            type="button"
            onClick={() => setIsExpandedTools((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-white/90 border border-white/15 active:scale-95 shadow-md hover:bg-black/60 transition-all"
            title={isExpandedTools ? 'Collapse tools' : 'More tools'}
          >
            {isExpandedTools ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* Extended tools */}
          <AnimatePresence>
            {isExpandedTools && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center gap-3 pt-1"
              >
                {/* Timer */}
                <button
                  type="button"
                  onClick={() => setIsTimerActive((prev) => !prev)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md border active:scale-95 shadow-md transition-all ${
                    isTimerActive
                      ? 'bg-purple-600/80 border-purple-300 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                      : 'bg-black/45 border-white/15 text-white hover:bg-black/60'
                  }`}
                  title="Timer"
                >
                  <Timer size={18} strokeWidth={2.2} />
                </button>

                {/* Filters & AR Effects Drawer trigger */}
                <button
                  type="button"
                  onClick={() => setIsEffectsDrawerOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-white border border-white/15 active:scale-95 shadow-md hover:bg-black/60 transition-all"
                  title="Effects & Filters"
                >
                  <Sparkles size={18} className="text-pink-400" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* 4. LIVE CAMERA FILTERS CAROUSEL & MAIN SHUTTER CONTROLS */}
      <div className="relative z-20 flex flex-col justify-end bg-black pt-2 pb-5 px-3 shrink-0 space-y-3">
        {/* Horizontal Filter Carousel with Backlight Glow */}
        <div className="relative w-full max-w-sm mx-auto flex items-center justify-center">
          <div
            ref={filterCarouselRef}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-4 scroll-smooth"
          >
            {CAMERA_FILTER_PRESETS.map((preset, index) => {
              const isSelected = selectedFilterId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleFilterSelect(preset, index)}
                  style={
                    isSelected
                      ? {
                          boxShadow:
                            '0 0 20px rgba(6, 182, 212, 0.7), 0 0 35px rgba(217, 70, 239, 0.4)',
                        }
                      : undefined
                  }
                  className={`group relative flex flex-col items-center shrink-0 rounded-full transition-all duration-200 active:scale-90 ${
                    isSelected
                      ? 'scale-110 z-10 ring-2 ring-cyan-300'
                      : 'opacity-65 hover:opacity-100 scale-95'
                  }`}
                  title={preset.name}
                >
                  {/* Distinctive Gradient Preview Pill */}
                  <div
                    className={`h-10 w-10 rounded-full bg-gradient-to-tr ${preset.gradient} border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-white ring-2 ring-cyan-400'
                        : 'border-white/30 group-hover:border-white/60'
                    }`}
                  >
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] mt-1 font-bold tracking-tight transition-colors ${
                      isSelected ? 'text-cyan-300 drop-shadow-sm' : 'text-white/60'
                    }`}
                  >
                    {preset.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shutter Row */}
        <div className="relative flex items-center justify-between w-full max-w-sm mx-auto h-20 px-2">
          {/* Left: Gallery Thumbnail */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden border-2 border-white/80 active:scale-90 transition-transform shadow-lg bg-zinc-900"
            aria-label="Open Gallery"
          >
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80"
              alt="Gallery thumbnail"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors" />
          </button>

          {/* Shutter Button in the Center */}
          {(() => {
            const cycle1Progress = Math.min(recordingSeconds / 30, 1);
            const cycle2Progress =
              recordingSeconds > 30 ? Math.min((recordingSeconds - 30) / 30, 1) : 0;
            const circumference = 238.76;

            return (
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                {/* Red Circular Progress Ring */}
                <svg
                  className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none"
                  viewBox="0 0 90 90"
                >
                  <defs>
                    <filter id="crimsonGlowRec" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="2"
                        floodColor="#ef4444"
                        floodOpacity="0.9"
                      />
                    </filter>
                  </defs>

                  <circle
                    cx="45"
                    cy="45"
                    r="38"
                    stroke={isRecording ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)'}
                    strokeWidth={isRecording ? '4' : '3.5'}
                    fill="none"
                  />

                  {isRecording && (
                    <circle
                      cx="45"
                      cy="45"
                      r="38"
                      stroke="#ef4444"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - cycle1Progress)}
                      filter="url(#crimsonGlowRec)"
                    />
                  )}

                  {isRecording && recordingSeconds > 30 && (
                    <circle
                      cx="45"
                      cy="45"
                      r="38"
                      stroke="#ff0055"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - cycle2Progress)}
                      filter="url(#crimsonGlowRec)"
                    />
                  )}
                </svg>

                {/* Shutter Button */}
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full active:scale-90 transition-transform duration-150"
                  aria-label={
                    activeMode === 'PHOTO'
                      ? 'Take photo'
                      : isRecording
                      ? 'Stop recording'
                      : 'Record video'
                  }
                >
                  <div
                    className={`transition-all duration-300 ${
                      isRecording
                        ? 'h-7 w-7 rounded-md bg-red-600 shadow-[0_0_16px_#ef4444] animate-pulse'
                        : activeMode === 'PHOTO'
                        ? 'h-13 w-13 rounded-full bg-white ring-4 ring-white/30 shadow-lg'
                        : 'h-13 w-13 rounded-full bg-white shadow-md'
                    }`}
                  />
                </button>
              </div>
            );
          })()}

          {/* Right: Camera Flip */}
          <button
            type="button"
            onClick={handleFlipCamera}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-white/20 text-white/90 hover:text-white active:scale-90 transition-transform shadow-lg"
            aria-label="Flip Camera"
          >
            <RotateCcw size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* Camera Modes Strip */}
        <div className="flex items-center justify-center gap-5 pt-1 text-xs font-bold tracking-wider">
          {(['POST', 'STORY', 'PHOTO', 'REEL', 'LIVE'] as CameraMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveMode(mode)}
              className={`transition-all pb-1 ${
                activeMode === mode
                  ? 'text-yellow-300 scale-105 border-b-2 border-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
        )}
      </AnimatePresence>

      {/* Effects Drawer */}
      <AnimatePresence>
        {isEffectsDrawerOpen && (
          <EffectsDrawer
            isOpen={isEffectsDrawerOpen}
            onClose={() => setIsEffectsDrawerOpen(false)}
            activeFilter={customCssFilter || selectedFilterId}
            onSelectFilter={(filterKey) => {
              setCustomCssFilter(filterKey);
              setIsEffectsDrawerOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Post Details Modal after recording or photo capture */}
      <AnimatePresence>
        {isPostDetailsOpen && recordedVideoUrl && (
          <PostReelDetailsModal
            videoUrl={recordedVideoUrl}
            mediaType={recordedMediaType}
            filterName={activePreset.name}
            selectedAudio={
              selectedAudioTrack
                ? {
                    title: selectedAudioTrack.title,
                    artist: selectedAudioTrack.artist,
                    audioUrl: selectedAudioTrack.audioUrl,
                    tag: selectedAudioTrack.tag,
                  }
                : null
            }
            onRetake={handleRetake}
            onPublish={handlePublishRecordedReel}
          />
        )}
      </AnimatePresence>

      {/* Interactive Sound Drawer */}
      <AnimatePresence>
        {isAudioDrawerOpen && (
          <SoundDrawer
            isOpen={isAudioDrawerOpen}
            onClose={() => setIsAudioDrawerOpen(false)}
            selectedTrackId={selectedAudioTrack?.id || null}
            onSelectTrack={(track) => {
              setSelectedAudioTrack(track);
              if (track?.audioUrl) {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = track.audioUrl;
                audio.volume = 1.0;
                audio.load();
                syncAudioRef.current = audio;
              }
              if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach((t) => {
                  t.enabled = !track;
                });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Also export as CreateView for backward compatibility
export const CreateView = RecordingView;
