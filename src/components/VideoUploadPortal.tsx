import React, { useRef, useState, useEffect } from 'react';
import { Plus, Video, Play, Pause, RotateCcw, Scissors, Sparkles, Image as ImageIcon, Link as LinkIcon, CloudUpload, CheckCircle, Loader2 } from 'lucide-react';
import { VideoAsset } from '../types';

interface VideoUploadPortalProps {
  video: VideoAsset | null;
  onVideoSelected: (video: VideoAsset | null) => void;
}

export const VideoUploadPortal: React.FC<VideoUploadPortalProps> = ({ video, onVideoSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [hostedUrlInput, setHostedUrlInput] = useState('');
  const [isUploadingToFal, setIsUploadingToFal] = useState(false);
  const [falStorageUrl, setFalStorageUrl] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoDims, setVideoDims] = useState<{ width: number; height: number } | null>(null);

  // Local trim state (3 to 30 seconds for Kling 4.0)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(5);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);

  useEffect(() => {
    if (video) {
      setTrimStart(video.trimStart);
      setTrimEnd(video.trimEnd);
      if (video.startFrameUrl) {
        setStartFramePreview(video.startFrameUrl);
      }
      if (video.url.includes('fal.media') || video.url.includes('fal.ai')) {
        setFalStorageUrl(video.url);
      }
    } else {
      setStartFramePreview(null);
      setFalStorageUrl(null);
    }
  }, [video]);

  // Capture current frame as high-res keyframe
  const captureFrameAt = (time: number): string | null => {
    if (!videoRef.current) return null;
    try {
      const v = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 1280;
      canvas.height = v.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch {
      return null;
    }
  };

  const updateFrames = (newStart: number, newEnd: number) => {
    if (!videoRef.current || !video) return;
    const v = videoRef.current;
    const prevTime = v.currentTime;
    v.currentTime = newStart;
    v.onseeked = () => {
      const captured = captureFrameAt(newStart);
      if (captured) {
        setStartFramePreview(captured);
        onVideoSelected({
          ...video,
          trimStart: newStart,
          trimEnd: newEnd,
          startFrameUrl: captured
        });
      }
      v.onseeked = null;
      v.currentTime = prevTime;
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = objectUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration || 10;
      const initialEnd = Math.min(dur, 5.0);
      onVideoSelected({
        id: `user-video-${Date.now()}`,
        name: file.name,
        url: objectUrl,
        duration: dur,
        trimStart: 0,
        trimEnd: initialEnd,
        isSample: false
      });
    };
  };

  const handleApplyHostedUrl = () => {
    if (!hostedUrlInput.trim()) return;
    const url = hostedUrlInput.trim();
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration || 10;
      const initialEnd = Math.min(dur, 5.0);
      onVideoSelected({
        id: `hosted-video-${Date.now()}`,
        name: url.split('/').pop()?.split('?')[0] || 'hosted-video.mp4',
        url: url,
        duration: dur,
        trimStart: 0,
        trimEnd: initialEnd,
        isSample: false
      });
    };
    tempVideo.onerror = () => {
      // Still set video even if metadata probe fails (CORS or direct video)
      onVideoSelected({
        id: `hosted-video-${Date.now()}`,
        name: 'hosted_video.mp4',
        url: url,
        duration: 10,
        trimStart: 0,
        trimEnd: 5.0,
        isSample: false
      });
    };
  };

  // Upload loaded video directly to Fal Storage via fal.storage.upload
  const handlePushToFalStorage = async () => {
    if (!video || !video.url) return;
    setIsUploadingToFal(true);
    try {
      let dataUrl = video.url;
      if (video.url.startsWith('blob:')) {
        const response = await fetch(video.url);
        const blob = await response.blob();
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const res = await fetch('/api/fal/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl,
          fileName: video.name || 'target_video.mp4',
          fileType: 'video/mp4'
        })
      });

      const data = await res.json();
      if (data.success && data.url) {
        setFalStorageUrl(data.url);
        onVideoSelected({
          ...video,
          url: data.url
        });
      }
    } catch (err) {
      console.error('Failed to upload to Fal storage:', err);
    } finally {
      setIsUploadingToFal(false);
    }
  };

  const handleLoadSample = (sample: VideoAsset) => {
    onVideoSelected(sample);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= trimEnd || videoRef.current.currentTime < trimStart) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (curr >= trimEnd) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStartTrimChange = (val: number) => {
    const newStart = Math.max(0, Math.min(val, trimEnd - 3)); // Minimum 3s for Kling 4.0
    let newEnd = trimEnd;
    if (newEnd - newStart > 30) {
      newEnd = newStart + 30; // Max 30s for Kling 4.0
    }
    setTrimStart(newStart);
    setTrimEnd(newEnd);
    if (video) {
      onVideoSelected({ ...video, trimStart: newStart, trimEnd: newEnd });
    }
    if (videoRef.current) {
      videoRef.current.currentTime = newStart;
    }
  };

  const handleEndTrimChange = (val: number) => {
    const newEnd = Math.min(duration || 10, Math.max(val, trimStart + 3)); // Minimum 3s
    let newStart = trimStart;
    if (newEnd - newStart > 30) {
      newStart = newEnd - 30; // Max 30s
    }
    setTrimStart(newStart);
    setTrimEnd(newEnd);
    if (video) {
      onVideoSelected({ ...video, trimStart: newStart, trimEnd: newEnd });
    }
    if (videoRef.current) {
      videoRef.current.currentTime = newEnd;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold tracking-wider text-white uppercase">
            Target Video (@Video1)
          </h2>
        </div>

        {/* Input Mode Selector or Reset */}
        {!video ? (
          <div className="flex items-center gap-1 p-0.5 rounded bg-slate-900 border border-cyan-500/25">
            <button
              onClick={() => setInputMode('upload')}
              className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                inputMode === 'upload'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/40 shadow-[0_0_6px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                inputMode === 'url'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/40 shadow-[0_0_6px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Link (URL)
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              onVideoSelected(null);
              setHostedUrlInput('');
              setFalStorageUrl(null);
            }}
            className="text-[10px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Change
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileUpload}
      />

      {!video ? (
        <div className="flex-1 min-h-[300px] border border-cyan-500/25 bg-[#080d19]/60 rounded-sm flex flex-col items-center justify-center p-5 text-center group hover:border-cyan-400/50 transition-all duration-300">
          {inputMode === 'upload' ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-full border border-cyan-400/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all cursor-pointer mb-3"
              >
                <Plus className="w-7 h-7 stroke-[1.75]" />
              </button>

              <span className="text-xs font-semibold text-slate-200 mb-1">
                Upload Target Video
              </span>
              <span className="text-[11px] text-slate-400 mb-4">
                MP4 / MOV · 3 to 30 seconds
              </span>
            </>
          ) : (
            <div className="w-full max-w-xs flex flex-col items-center my-auto">
              <div className="w-12 h-12 rounded-full border border-cyan-400/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 mb-2 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                <LinkIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200 mb-1">
                Enter Video URL
              </span>
              <span className="text-[10px] text-slate-400 mb-3">
                Direct public link to MP4 video
              </span>

              <div className="w-full flex gap-1.5">
                <input
                  type="url"
                  placeholder="https://.../video.mp4"
                  value={hostedUrlInput}
                  onChange={(e) => setHostedUrlInput(e.target.value)}
                  className="flex-1 bg-[#070b14] border border-cyan-500/30 rounded px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  onClick={handleApplyHostedUrl}
                  disabled={!hostedUrlInput.trim()}
                  className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Load
                </button>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="flex-1 flex flex-col border border-cyan-500/30 bg-[#070b14] rounded-sm p-3">
          {/* Video Player Display */}
          <div className="relative aspect-video w-full bg-black/80 rounded overflow-hidden group">
            <video
              ref={videoRef}
              src={video.url}
              playsInline
              className="w-full h-full object-contain"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration || 10;
                setDuration(dur);
                const w = e.currentTarget.videoWidth || 1280;
                const h = e.currentTarget.videoHeight || 720;
                setVideoDims({ width: w, height: h });
                if (!video.duration) {
                  onVideoSelected({ ...video, duration: dur });
                }
                updateFrames(trimStart, trimEnd);
              }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onError={(e) => {
                console.warn('Video load error in upload portal:', e);
              }}
            />

            {/* Play/Pause Overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 opacity-80 hover:opacity-100 hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Timecode Badge */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono tabular-nums text-cyan-300 border border-cyan-500/30">
              {formatTime(currentTime)} / {formatTime(duration || video.duration)}
            </div>

            {/* Keyframe capture badge */}
            {startFramePreview && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-950/90 text-[10px] font-mono text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-cyan-400" />
                PlayVear AI Keyframe Synced
              </div>
            )}
          </div>

          {/* Timeline Trimmer (3 to 30s) */}
          <div className="mt-2 pt-2 border-t border-cyan-500/15">
            <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1 font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <Scissors className="w-3 h-3" />
                Clip Range (3s–30s)
              </span>
              <span className="tabular-nums text-cyan-300">
                {formatTime(trimStart)} – {formatTime(trimEnd)} ({Math.round(trimEnd - trimStart)}s)
              </span>
            </div>

            {/* Compact Specs Bar */}
            <div className="flex items-center gap-2 mb-2 px-2 py-0.5 rounded bg-[#050811] border border-cyan-500/20 text-[9px] font-mono text-slate-400">
              <span className="text-cyan-400 font-bold">@Video1</span>
              <span>·</span>
              <span>{videoDims ? `${videoDims.width}×${videoDims.height}` : '1080p HD'}</span>
              <span>·</span>
              <span>{(trimEnd - trimStart).toFixed(1)}s</span>
              <span>·</span>
              <span className="text-cyan-300">&lt;300MB</span>
            </div>

            {/* Dual Slider Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-9">Start:</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(1, duration || 10)}
                  step="0.5"
                  value={trimStart}
                  onChange={(e) => handleStartTrimChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-9">End:</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(1, duration || 10)}
                  step="0.5"
                  value={trimEnd}
                  onChange={(e) => handleEndTrimChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Fal Storage Status / Push Button */}
            <div className="mt-2.5 pt-2 border-t border-cyan-500/10 flex items-center justify-between">
              {falStorageUrl ? (
                <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-cyan-400" />
                  Synced to Fal Storage CDN
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-400">
                  Storage: Ready for auto-upload
                </span>
              )}

              {!falStorageUrl && (
                <button
                  onClick={handlePushToFalStorage}
                  disabled={isUploadingToFal}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 rounded px-2 py-0.5 flex items-center gap-1 transition-all disabled:opacity-40"
                >
                  {isUploadingToFal ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-2.5 h-2.5" /> Push to fal.storage
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

