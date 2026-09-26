import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  Send,
  Sparkles,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InstantCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (mediaUrl: string, mediaType: 'image' | 'video', caption?: string) => void;
  recipientName: string;
}

const FILTERS = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'cyberpunk', name: 'Cyberpunk', css: 'contrast(125%) saturate(140%) hue-rotate(190deg)' },
  { id: 'neon', name: 'Tokyo Neon', css: 'contrast(135%) saturate(160%) brightness(105%)' },
  { id: 'noir', name: 'Noir B&W', css: 'grayscale(100%) contrast(150%)' },
  { id: 'golden', name: 'Golden Glow', css: 'sepia(40%) saturate(140%) contrast(110%)' },
];

export const InstantCameraModal: React.FC<InstantCameraModalProps> = ({
  isOpen,
  onClose,
  onSendMedia,
  recipientName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashMode, setFlashMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  // Captured media preview state
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string;
    type: 'image' | 'video';
  } | null>(null);
  const [caption, setCaption] = useState('');
  const [isCapturingAnimation, setIsCapturingAnimation] = useState(false);

  // Initialize camera stream
  const startCamera = async (mode: 'user' | 'environment') => {
    // Stop any existing tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCameraAccess(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraAccess(true);
    } catch (err) {
      console.warn('Camera access unavailable or declined:', err);
      setHasCameraAccess(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      // Clean up stream on modal close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCapturedMedia(null);
      setCaption('');
      setHasCameraAccess(null);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture photo from live video or fallback canvas
  const handleCapturePhoto = () => {
    setIsCapturingAnimation(true);
    setTimeout(() => setIsCapturingAnimation(false), 200);

    const canvas = document.createElement('canvas');
    const video = videoRef.current;

    if (hasCameraAccess && video && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = activeFilter.css;
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedMedia({ url: dataUrl, type: 'image' });
        return;
      }
    }

    // Creative simulated fallback photo if hardware camera is not available in environment
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Cyberpunk stylized gradient background
      const grad = ctx.createLinearGradient(0, 0, 720, 960);
      grad.addColorStop(0, '#0a0a14');
      grad.addColorStop(0.5, '#1e1035');
      grad.addColorStop(1, '#062030');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 960);

      // Neon grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 720; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 960);
        ctx.stroke();
      }
      for (let j = 0; j < 960; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(720, j);
        ctx.stroke();
      }

      // Neon center emblem
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(360, 480, 120, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GediOn Instant Snap', 360, 470);

      ctx.fillStyle = '#06b6d4';
      ctx.font = '22px sans-serif';
      ctx.fillText(new Date().toLocaleTimeString(), 360, 510);

      const fallbackUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedMedia({ url: fallbackUrl, type: 'image' });
    }
  };

  // Confirm and send
  const handleSend = () => {
    if (!capturedMedia) return;
    onSendMedia(capturedMedia.url, capturedMedia.type, caption.trim() || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-50 flex flex-col bg-black text-white overflow-hidden select-none"
      >
        {/* White Flash Animation Overlay */}
        <AnimatePresence>
          {(isCapturingAnimation || flashMode) && isCapturingAnimation && (
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-40 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {capturedMedia ? (
          /* ========================================================================= */
          /* CAPTURED MEDIA PREVIEW SCREEN */
          /* ========================================================================= */
          <div className="relative flex flex-col h-full w-full justify-between p-4 bg-black">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between z-20 pt-2">
              <button
                onClick={() => setCapturedMedia(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all hover:bg-black/80"
              >
                <RotateCcw size={14} />
                <span>Retake</span>
              </button>

              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Media Image / Video Preview */}
            <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
              <img
                src={capturedMedia.url}
                alt="Captured Snap"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Bottom Caption and Send Dock */}
            <div className="relative z-20 flex flex-col gap-3 pb-4">
              {/* Caption Input */}
              <div className="flex items-center bg-black/60 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-2.5">
                <input
                  type="text"
                  placeholder={`Add a message to ${recipientName}...`}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-white/50 focus:outline-none"
                />
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-medium">
                  Direct message to <span className="text-cyan-400 font-bold">{recipientName}</span>
                </span>
                <button
                  onClick={handleSend}
                  className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95 transition-all"
                >
                  <span>Send</span>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* LIVE VIEWFINDER SCREEN */
          /* ========================================================================= */
          <div className="relative flex flex-col h-full w-full justify-between">
            {/* Live Video Camera Viewfinder or Simulated Canvas */}
            <div className="absolute inset-0 overflow-hidden bg-[#07070b]">
              {hasCameraAccess ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ filter: activeFilter.css }}
                  className={`h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a14] via-[#120f24] to-[#040810] p-6 text-center">
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed border-cyan-400/40 bg-cyan-950/20 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                    <Camera size={38} className="text-cyan-400" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500" />
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    GediOn Instant Camera
                  </h3>
                  <p className="text-xs text-white/50 max-w-xs mt-1">
                    Ready to capture an instant snap to send directly to{' '}
                    <span className="text-cyan-300 font-semibold">{recipientName}</span>.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 font-medium">
                      <Sparkles size={12} /> Instant Neon Snap Mode
                    </span>
                  </div>
                </div>
              )}

              {/* Viewfinder Target Framing Reticle */}
              <div className="pointer-events-none absolute inset-8 border border-white/10 rounded-3xl">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-xl" />
              </div>
            </div>

            {/* Top Viewfinder Controls */}
            <div className="relative z-20 flex items-center justify-between p-4 pt-5 bg-gradient-to-b from-black/80 to-transparent">
              <button
                onClick={onClose}
                aria-label="Close Camera"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 active:scale-95 transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2.5">
                {/* Flash toggle */}
                <button
                  onClick={() => setFlashMode(!flashMode)}
                  aria-label="Toggle Flash"
                  className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md border transition-all ${
                    flashMode
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                      : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                  }`}
                >
                  {flashMode ? <Zap size={18} /> : <ZapOff size={18} />}
                </button>

                {/* Filters button */}
                <button
                  onClick={() => setShowFilterPicker(!showFilterPicker)}
                  aria-label="Color Filters"
                  className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md border transition-all ${
                    activeFilter.id !== 'normal'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                      : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                  }`}
                >
                  <Sliders size={18} />
                </button>

                {/* Flip camera */}
                <button
                  onClick={handleToggleFacingMode}
                  aria-label="Flip Camera"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 active:scale-95 transition-all"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {/* Filter Selector Tray */}
            <AnimatePresence>
              {showFilterPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="relative z-20 px-4 py-2 mx-4 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/20 flex items-center gap-2 overflow-x-auto no-scrollbar"
                >
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeFilter.id === f.id
                          ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {activeFilter.id === f.id && <Check size={12} />}
                      <span>{f.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Shutter Dock */}
            <div className="relative z-20 flex flex-col items-center gap-3 p-6 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
              <span className="text-xs text-white/70 font-medium">
                Tap to capture &amp; send to {recipientName}
              </span>

              {/* Shutter Button with pulsating neon ring */}
              <button
                onClick={handleCapturePhoto}
                aria-label="Take Photo"
                className="relative flex h-20 w-20 items-center justify-center rounded-full p-1 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_25px_rgba(6,182,212,0.7)] active:scale-90 transition-transform"
              >
                <div className="h-full w-full rounded-full border-2 border-black bg-white flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Camera size={26} className="text-black" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
