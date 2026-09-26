import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Play,
  Pause,
  Check,
  Music,
  Flame,
  Sparkles,
  Upload,
  FileAudio,
  Video,
  CheckCircle2,
  Trash2,
  Volume2,
  Disc3,
  Headphones,
  Zap,
} from 'lucide-react';
import {
  AudioTrack,
  AUDIO_CATEGORIES,
  AudioCategory,
  TRENDING_AUDIO_TRACKS,
} from '../data/trendingAudio';

export interface SoundDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: AudioTrack | null) => void;
  selectedTrackId?: string | null;
}

export const AudioPickerDrawer: React.FC<SoundDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
  selectedTrackId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AudioCategory>('Trending');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Device imported & extracted tracks
  const [deviceTracks, setDeviceTracks] = useState<AudioTrack[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccessMessage, setExtractionSuccessMessage] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio playback when drawer is closed
  useEffect(() => {
    if (!isOpen) {
      stopCurrentAudio();
    }
  }, [isOpen]);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingTrackId(null);
  };

  const handleTogglePlay = (track: AudioTrack, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingTrackId === track.id) {
      stopCurrentAudio();
      return;
    }

    stopCurrentAudio();
    setPlayingTrackId(track.id);

    if (track.audioUrl) {
      try {
        const audio = new Audio(track.audioUrl);
        audio.volume = 0.85;
        audio.onended = () => setPlayingTrackId(null);
        audio.onerror = () => {
          playFallbackSynth();
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            playFallbackSynth();
          });
        }
        audioRef.current = audio;
      } catch {
        playFallbackSynth();
      }
    } else {
      playFallbackSynth();
    }
  };

  const playFallbackSynth = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Synth audio fallback not supported:', e);
    }
  };

  // Combine standard catalog with any imported device tracks
  const allTracks = useMemo(() => {
    return [...deviceTracks, ...TRENDING_AUDIO_TRACKS];
  }, [deviceTracks]);

  const currentSelectedTrack = useMemo(() => {
    return allTracks.find((t) => t.id === selectedTrackId) || null;
  }, [allTracks, selectedTrackId]);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (selectedCategory === 'My Device') {
      if (!q) return deviceTracks;
      return deviceTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.tag && t.tag.toLowerCase().includes(q))
      );
    }

    return TRENDING_AUDIO_TRACKS.filter((track) => {
      const matchesSearch =
        !q ||
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        (track.tag && track.tag.toLowerCase().includes(q));

      if (q) return matchesSearch;
      return track.category === selectedCategory;
    });
  }, [searchQuery, selectedCategory, deviceTracks]);

  const handleUseSound = (track: AudioTrack) => {
    stopCurrentAudio();
    onSelectTrack(track);
    onClose();
  };

  const handleRemoveSound = () => {
    stopCurrentAudio();
    onSelectTrack(null);
  };

  // Handle Select MP3 / Audio from device
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioUrl = URL.createObjectURL(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'Imported Audio';

    const newTrack: AudioTrack = {
      id: `device-audio-${Date.now()}`,
      title: cleanTitle,
      artist: 'My Device Audio',
      duration: 'Custom',
      category: 'My Device',
      cover:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
      playsCount: 'Local File',
      tag: 'Imported MP3',
      audioUrl,
    };

    try {
      const tempAudio = new Audio(audioUrl);
      tempAudio.preload = 'auto';
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          const m = Math.floor(tempAudio.duration / 60);
          const s = Math.floor(tempAudio.duration % 60);
          newTrack.duration = `${m}:${s.toString().padStart(2, '0')}`;
          setDeviceTracks((prev) => [newTrack, ...prev]);
        }
      };
    } catch {
      // fallback
    }

    setDeviceTracks((prev) => [newTrack, ...prev]);
    onSelectTrack(newTrack);
    setExtractionSuccessMessage(`"${newTrack.title}" imported & selected!`);
    setTimeout(() => setExtractionSuccessMessage(null), 4000);

    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  // Handle Extract Audio from Video
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);

    try {
      const videoBlobUrl = URL.createObjectURL(file);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').trim();

      const extractedTrack: AudioTrack = {
        id: `extracted-video-${Date.now()}`,
        title: cleanFileName ? `Extracted Reel Audio (${cleanFileName})` : 'Extracted Reel Audio',
        artist: 'Extracted from Video',
        duration: '0:30',
        category: 'My Device',
        cover:
          'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=200&auto=format&fit=crop&q=80',
        playsCount: 'Extracted Track',
        tag: 'Extracted Reel Audio',
        audioUrl: videoBlobUrl,
        isExtracted: true,
      };

      const probeAudio = new Audio(videoBlobUrl);
      probeAudio.preload = 'auto';
      probeAudio.onloadedmetadata = () => {
        if (probeAudio.duration && isFinite(probeAudio.duration)) {
          const m = Math.floor(probeAudio.duration / 60);
          const s = Math.floor(probeAudio.duration % 60);
          extractedTrack.duration = `${m}:${s.toString().padStart(2, '0')}`;
          setDeviceTracks((prev) => [
            extractedTrack,
            ...prev.filter((t) => t.id !== extractedTrack.id),
          ]);
        }
      };

      setDeviceTracks((prev) => [extractedTrack, ...prev]);
      onSelectTrack(extractedTrack);

      setExtractionSuccessMessage('⚡ Audio extracted successfully! Set as active lip-sync sound.');
      setTimeout(() => setExtractionSuccessMessage(null), 4500);
    } catch (err) {
      console.error('Audio extraction failed:', err);
    } finally {
      setIsExtracting(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDeviceTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingTrackId === id) {
      stopCurrentAudio();
    }
    if (selectedTrackId === id) {
      onSelectTrack(null);
    }
    setDeviceTracks((prev) => prev.filter((t) => t.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xl transition-all">
      {/* Click outside backdrop */}
      <div
        className="absolute inset-0"
        onClick={() => {
          stopCurrentAudio();
          onClose();
        }}
      />

      {/* Hidden native file pickers */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoFileChange}
      />

      {/* Dark Glassmorphic Bottom Sheet Container with Neon Glow */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative z-10 flex flex-col w-full max-w-lg max-h-[90vh] h-[84vh] rounded-t-[32px] bg-[#09090f]/95 backdrop-blur-2xl border-t border-cyan-500/30 shadow-[0_-15px_60px_rgba(6,182,212,0.2),0_0_40px_rgba(0,0,0,0.9)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top electric neon halo bar */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4]" />

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-white/25 hover:bg-cyan-400/60 transition-colors" />
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-fuchsia-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]">
              <Disc3 size={18} className="animate-[spin_4s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-1.5">
                  Sound Drawer
                </h2>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  Synced Beats
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Preview waveforms & pick audio for your reel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCurrentAudio();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/10"
            aria-label="Close sound drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Currently Selected Active Track Bar */}
        {currentSelectedTrack && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-gradient-to-r from-cyan-950/70 via-[#0d1b2a]/80 to-purple-950/60 border-b border-cyan-500/30 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-black shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                <Check size={13} strokeWidth={3.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-cyan-200 truncate flex items-center gap-1.5">
                  <Music size={12} className="text-cyan-400 animate-bounce" />
                  Active: {currentSelectedTrack.title}
                </p>
                <p className="text-[10px] text-white/60 truncate">
                  {currentSelectedTrack.artist} • Ready for synced recording
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveSound}
              className="text-[11px] text-pink-400 hover:text-pink-300 underline font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              Clear (Use Mic)
            </button>
          </div>
        )}

        {/* Success toast notification */}
        <AnimatePresence>
          {extractionSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 mx-4 my-2 px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <CheckCircle2 size={16} className="shrink-0 text-cyan-400" />
              <span className="flex-1 truncate">{extractionSuccessMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar with Electric Cyan Glowing Search Icon */}
        <div className="px-5 pt-3.5 pb-2.5">
          <div className="relative flex items-center group">
            <Search
              size={18}
              className="absolute left-3.5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none transition-transform group-focus-within:scale-110"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search music, artists or viral beats..."
              className="w-full rounded-2xl bg-white/[0.07] border border-white/15 pl-11 pr-10 py-3 text-xs font-medium text-white placeholder-white/45 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tags Carousel */}
        <div className="px-5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {AUDIO_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat && !searchQuery;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(6,182,212,0.5)] border border-cyan-300/40'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  {cat === 'Trending' && <Flame size={13} className={isActive ? 'text-yellow-200' : 'text-orange-400'} />}
                  {cat === 'Punjabi Vibes' && <Sparkles size={13} className={isActive ? 'text-yellow-200' : 'text-amber-400'} />}
                  {cat === 'Desi Hip-Hop' && <Headphones size={13} className={isActive ? 'text-cyan-200' : 'text-cyan-400'} />}
                  {cat === 'Lo-Fi Beats' && <Volume2 size={13} className={isActive ? 'text-pink-200' : 'text-pink-400'} />}
                  {cat === 'EDM Bass' && <Zap size={13} className={isActive ? 'text-cyan-100' : 'text-purple-400'} />}
                  {cat === 'My Device' && <Upload size={13} className="text-emerald-400" />}
                  <span>{cat}</span>
                  {cat === 'My Device' && deviceTracks.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[9px] rounded-full bg-white/20 text-white">
                      {deviceTracks.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
          {/* If 'My Device' tab is selected, display import & extraction controls */}
          {selectedCategory === 'My Device' && (
            <div className="space-y-2.5 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Select MP3 / Audio */}
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 to-black border border-purple-500/30 hover:border-purple-400/60 transition-all text-left group active:scale-[0.98] shadow-md hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <FileAudio size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                      Select MP3 / Audio
                    </h3>
                    <p className="text-[10px] text-white/50 leading-tight mt-0.5">
                      Upload any MP3 or WAV song from device
                    </p>
                  </div>
                </button>

                {/* 2. Extract Audio from Video */}
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => videoInputRef.current?.click()}
                  className={`flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-black border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-left group active:scale-[0.98] shadow-md hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] ${
                    isExtracting ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <Video size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        Extract Audio from Video
                      </h3>
                      {isExtracting && (
                        <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </div>
                    <p className="text-[10px] text-white/50 leading-tight mt-0.5">
                      {isExtracting
                        ? 'Extracting ad-free sound...'
                        : 'Import Reel / Video (MP4) to extract sound'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Native Web Audio extraction • Instant Synced Recording
                </span>
                <span className="font-mono text-cyan-400 font-bold">Lip-Sync Ready</span>
              </div>
            </div>
          )}

          {/* Track list */}
          {filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-white/40">
              <Music size={36} className="mb-2 text-cyan-400/60 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              <p className="text-xs font-bold text-white/70">
                {selectedCategory === 'My Device'
                  ? 'No imported sounds yet'
                  : 'No audio tracks found'}
              </p>
              <p className="text-[11px] mt-1 text-white/40 max-w-xs">
                {selectedCategory === 'My Device'
                  ? 'Tap "Select MP3" or "Extract Audio from Video" above to add sounds.'
                  : 'Try searching for other artists, genres, or keywords.'}
              </p>
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isPlaying = playingTrackId === track.id;
              const isSelected = selectedTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handleUseSound(track)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-cyan-500/30'
                  }`}
                >
                  {/* Left: Thumbnail with Mini Play/Pause button + waveform indicator */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black group-hover:shadow-[0_0_14px_rgba(6,182,212,0.3)] transition-all">
                      <img
                        src={track.cover}
                        alt={track.title}
                        className={`h-full w-full object-cover transition-transform duration-300 ${
                          isPlaying ? 'scale-110' : 'group-hover:scale-105'
                        }`}
                      />

                      {/* Mini Play / Pause button overlay with waveform preview */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity ${
                          isPlaying ? 'opacity-100' : 'opacity-80 group-hover:opacity-95'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleTogglePlay(track, e)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90 ${
                            isPlaying
                              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                              : 'bg-white/30 text-white hover:bg-white/50 border border-white/20'
                          }`}
                          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                        </button>
                      </div>

                      {/* Animated Waveform Indicator overlay on playing cover */}
                      {isPlaying && (
                        <div className="absolute bottom-1 left-0 right-0 flex items-end justify-center gap-[3px] h-3 px-1 pointer-events-none">
                          <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.5s_infinite_100ms] h-full shadow-[0_0_6px_#06b6d4]" />
                          <span className="w-1 bg-fuchsia-400 rounded-full animate-[bounce_0.6s_infinite_250ms] h-3/4 shadow-[0_0_6px_#e879f9]" />
                          <span className="w-1 bg-cyan-300 rounded-full animate-[bounce_0.4s_infinite_150ms] h-5/6 shadow-[0_0_6px_#67e8f9]" />
                          <span className="w-1 bg-blue-400 rounded-full animate-[bounce_0.7s_infinite_300ms] h-2/3 shadow-[0_0_6px_#60a5fa]" />
                        </div>
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[210px]">
                          {track.title}
                        </h3>
                        {track.tag && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                              track.isExtracted
                                ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                            }`}
                          >
                            {track.tag}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-white/60 truncate mt-0.5">{track.artist}</p>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-white/45">
                        {/* Waveform indicator symbol */}
                        <div className="flex items-center gap-0.5 text-cyan-400/80">
                          <span className="h-2 w-0.5 rounded-full bg-cyan-400/80" />
                          <span className="h-3 w-0.5 rounded-full bg-cyan-400/80" />
                          <span className="h-1.5 w-0.5 rounded-full bg-cyan-400/80" />
                          <span className="h-2.5 w-0.5 rounded-full bg-cyan-400/80" />
                        </div>
                        <span className="font-mono text-cyan-300 font-semibold">
                          {track.duration}
                        </span>
                        <span>•</span>
                        <span>{track.playsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Vivid Electric Cyan Neon "Use Sound" button */}
                  <div className="shrink-0 flex items-center gap-2 pl-2">
                    {track.category === 'My Device' && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDeviceTrack(track.id, e)}
                        className="p-1.5 rounded-full text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="Delete track"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseSound(track);
                      }}
                      style={{
                        boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)',
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-cyan-400 text-black border border-cyan-200'
                          : 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 text-black hover:brightness-110 border border-cyan-300/60'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} strokeWidth={3.5} />
                          <span>Selected</span>
                        </>
                      ) : (
                        <>
                          <Music size={12} strokeWidth={2.5} />
                          <span>Use Sound</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Also export as SoundDrawer for seamless interoperability
export const SoundDrawer = AudioPickerDrawer;
