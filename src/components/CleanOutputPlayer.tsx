import React, { useState } from 'react';
import { Download, Play, Pause, CheckCircle2, RotateCcw, Loader2, Sparkles, Film } from 'lucide-react';
import { KlingV4OutputFile } from '../types';

interface CleanOutputPlayerProps {
  resultVideoUrl: string;
  resultFile?: KlingV4OutputFile;
  onReset: () => void;
}

export const CleanOutputPlayer: React.FC<CleanOutputPlayerProps> = ({
  resultVideoUrl,
  resultFile,
  onReset
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDirectDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    const fileName = resultFile?.file_name || `playvear_ai_video_${Date.now()}.mp4`;

    try {
      // 1. Try client-side fetch -> Blob URL for instant native download
      const res = await fetch(resultVideoUrl);
      if (!res.ok) throw new Error('CDN fetch failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.warn('[PlayVear Labs] Client fetch download fallback to server proxy:', err);
      // 2. Server proxy fallback forces Content-Disposition attachment download inside app
      const proxyUrl = `/api/fal/download?url=${encodeURIComponent(resultVideoUrl)}&name=${encodeURIComponent(fileName)}`;
      
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full bg-[#080d19] border border-cyan-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_0_35px_rgba(0,240,255,0.25)] space-y-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Generated Video Preview
            </h3>
            <p className="text-[11px] text-cyan-300/80 font-mono">
              PlayVear AI Character Replacement Complete
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" /> New Edit
        </button>
      </div>

      {/* Clean HD Video Player (Shows ONLY the newly generated video) */}
      <div className="relative aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-cyan-500/30 shadow-2xl group">
        <video
          key={resultVideoUrl}
          src={resultVideoUrl}
          controls
          autoPlay
          loop
          playsInline
          className="w-full h-full object-contain"
        />
      </div>

      {/* Direct In-App Download Button (Direct Device Download without Fal.ai redirect) */}
      <div className="pt-2 flex flex-col items-center gap-2">
        <button
          onClick={handleDirectDownload}
          disabled={isDownloading}
          className={`w-full max-w-md py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-xl ${
            downloadSuccess
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
              : 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-slate-950 shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-[0.98]'
          }`}
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Downloading Video to Device...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Video Downloaded Successfully!</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>Download Video</span>
            </>
          )}
        </button>
        <p className="text-[11px] font-mono text-slate-400">
          Direct In-App Download (.mp4)
        </p>
      </div>
    </div>
  );
};
