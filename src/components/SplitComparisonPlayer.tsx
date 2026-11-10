import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Columns, Layers, RotateCcw, CheckCircle } from 'lucide-react';
import { KlingV4OutputFile } from '../types';

interface SplitComparisonPlayerProps {
  originalVideoUrl: string;
  resultVideoUrl: string;
  characterSheetUrl?: string;
  resultFile?: KlingV4OutputFile;
  onReset: () => void;
}

export const SplitComparisonPlayer: React.FC<SplitComparisonPlayerProps> = ({
  originalVideoUrl,
  resultVideoUrl,
  resultFile,
  onReset
}) => {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 to 100
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const [isDragging, setIsDragging] = useState(false);

  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync play/pause
  const togglePlay = () => {
    const orig = originalVideoRef.current;
    const res = resultVideoRef.current;
    if (!orig || !res) return;

    if (isPlaying) {
      orig.pause();
      res.pause();
      setIsPlaying(false);
    } else {
      orig.play();
      res.play();
      setIsPlaying(true);
    }
  };

  // Sync time if drift happens
  const handleTimeUpdate = () => {
    const orig = originalVideoRef.current;
    const res = resultVideoRef.current;
    if (!orig || !res) return;

    if (Math.abs(orig.currentTime - res.currentTime) > 0.15) {
      res.currentTime = orig.currentTime;
    }
  };

  // Handle slider mouse / touch dragging
  const handlePointerDown = () => setIsDragging(true);

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const offsetX = clientX - rect.left;
      const newPos = Math.max(5, Math.min(95, (offsetX / rect.width) * 100));
      setSliderPos(newPos);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = resultVideoUrl;
    a.download = resultFile?.file_name || `playvear-character-replace-${Date.now()}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mt-6 p-4 sm:p-6 bg-[#080d19] border border-cyan-500/30 rounded-md">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-400/40">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Replacement Render Complete (PlayVear AI)
            </h3>
            <p className="text-[11px] text-cyan-300/80 font-mono flex items-center gap-2">
              <span>Lead character replaced · Background motion locked</span>
              {resultFile && resultFile.file_size > 0 && (
                <span className="text-slate-400">
                  · {(resultFile.file_size / (1024 * 1024)).toFixed(2)} MB ({resultFile.content_type || 'video/mp4'})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded bg-slate-900 border border-cyan-500/25">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                viewMode === 'split'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/40'
                  : 'text-slate-400'
              }`}
            >
              <Layers className="w-3 h-3" /> Split Slider
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                viewMode === 'side-by-side'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/40'
                  : 'text-slate-400'
              }`}
            >
              <Columns className="w-3 h-3" /> Side-by-Side
            </button>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,0,127,0.35)] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download HD Video
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      {viewMode === 'split' ? (
        <div
          ref={containerRef}
          className="relative aspect-video w-full bg-black rounded overflow-hidden select-none border border-cyan-500/30"
        >
          {/* Original Video (Background / Full Width) */}
          <video
            ref={originalVideoRef}
            src={originalVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onError={(e) => console.warn('Original video playback error:', e)}
            className="absolute inset-0 w-full h-full object-contain"
          />

          {/* Replaced Video (Clipped to Slider Position) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <video
              ref={resultVideoRef}
              src={resultVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => console.warn('Result video playback error:', e)}
              className="absolute inset-0 w-full h-full object-contain max-w-none"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                height: containerRef.current ? `${containerRef.current.clientHeight}px` : '100%'
              }}
            />
            {/* Label overlay Left */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-fuchsia-950/80 border border-fuchsia-500/50 text-[10px] font-mono font-bold text-fuchsia-300">
              REPLACED CHARACTER
            </div>
          </div>

          {/* Label overlay Right */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
            ORIGINAL SINGER / ACTOR
          </div>

          {/* Draggable Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-fuchsia-500 shadow-[0_0_15px_rgba(255,0,127,0.8)] cursor-ew-resize flex items-center justify-center"
            style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            <div className="w-7 h-7 rounded-full bg-[#080d1a] border-2 border-fuchsia-400 flex items-center justify-center text-fuchsia-300 shadow-[0_0_12px_rgba(255,0,127,0.6)]">
              <span className="text-[10px] font-bold">⇄</span>
            </div>
          </div>

          {/* Bottom play/pause toggle */}
          <button
            onClick={togglePlay}
            className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-black/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative aspect-video bg-black rounded overflow-hidden border border-cyan-500/30">
            <video
              ref={originalVideoRef}
              src={originalVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => console.warn('Original video playback error:', e)}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
              Original Video
            </div>
          </div>

          <div className="relative aspect-video bg-black rounded overflow-hidden border border-fuchsia-500/40 shadow-[0_0_15px_rgba(255,0,127,0.15)]">
            <video
              ref={resultVideoRef}
              src={resultVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => console.warn('Result video playback error:', e)}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-500/50 text-[10px] font-mono text-fuchsia-300">
              Replaced Character
            </div>
          </div>
        </div>
      )}

      {/* Footer Reset */}
      <div className="flex justify-end pt-4 mt-3">
        <button
          onClick={onReset}
          className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Swap Another Character / New Video
        </button>
      </div>
    </div>
  );
};
