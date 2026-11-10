import React, { useState } from 'react';
import { X, Plus, Video as VideoIcon, Check, Loader2 } from 'lucide-react';
import { VideoAsset } from '../types';
import { generateVideoThumbnail, saveVideoGalleryToIDB } from '../utils/sampleData';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideo: VideoAsset | null;
  onSelectVideo: (video: VideoAsset | null) => void;
  videoList: VideoAsset[];
  onVideoListChange: (videos: VideoAsset[]) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  selectedVideo,
  onSelectVideo,
  videoList,
  onVideoListChange
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCloseModal = () => {
    if (isUploading) return;
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSizeError(null);
    setIsUploading(true);
    try {
      const newItems: VideoAsset[] = [];
      for (const file of files) {
        if (file.size > 30 * 1024 * 1024) {
          setSizeError(`"${file.name}" ফাইলের সাইজ ${(file.size / (1024 * 1024)).toFixed(1)}MB। সরাসরি আপলোডের সর্বোচ্চ লিমিট ৩০MB (৩-১৫ সেকেন্ডের ৩MB–১৫MB ভিডিও সবচেয়ে ভালো কাজ করে)।`);
          continue;
        }

        // 1. Detect actual video duration first before reading or importing
        let exactDuration = 10;
        try {
          exactDuration = await new Promise<number>((resolve) => {
            const tempVid = document.createElement('video');
            const tempUrl = URL.createObjectURL(file);
            tempVid.src = tempUrl;
            tempVid.preload = 'metadata';

            let isDone = false;
            const finish = (dur: number) => {
              if (!isDone) {
                isDone = true;
                clearTimeout(t);
                URL.revokeObjectURL(tempUrl);
                resolve(dur);
              }
            };
            const t = setTimeout(() => finish(10), 3500);

            tempVid.onloadedmetadata = () => {
              if (tempVid.duration && !isNaN(tempVid.duration) && tempVid.duration > 0 && isFinite(tempVid.duration)) {
                finish(Math.max(1, Math.round(tempVid.duration)));
              }
            };
            tempVid.onerror = () => finish(10);
          });
        } catch {
          exactDuration = 10;
        }

        // 2. Reject video if duration is strictly greater than 30 seconds
        if (exactDuration > 30) {
          setSizeError(`Warning: Selected video "${file.name}" duration is ${exactDuration} seconds. Maximum allowed video duration is 30 seconds. Video import cancelled.`);
          continue; // DO NOT IMPORT VIDEO OVER 30 SECONDS
        }

        // 3. Read file as Data URL while fresh input permission is active
        let dataUrl: string | undefined = undefined;
        try {
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error || new Error('Failed to read selected video file'));
            reader.readAsDataURL(file);
          });
        } catch (rErr) {
          console.warn('Pre-read Data URL failed, will read on demand:', rErr);
        }

        // 4. Generate static JPEG thumbnail frame and object URL
        const thumbUrl = await generateVideoThumbnail(file);
        const objectUrl = URL.createObjectURL(file);

        const newVid: VideoAsset = {
          id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          url: objectUrl,
          startFrameUrl: thumbUrl || undefined,
          duration: exactDuration,
          trimStart: 0,
          trimEnd: exactDuration,
          isSample: false,
          file,
          dataUrl
        };
        newItems.push(newVid);
      }

      if (newItems.length > 0) {
        const updatedList = [...videoList, ...newItems];
        // Automatically select the newly imported video
        const activeId = newItems[newItems.length - 1]?.id || selectedVideo?.id || updatedList[0]?.id || null;
        const activeVid = updatedList.find((v) => v.id === activeId) || null;

        onVideoListChange(updatedList);
        onSelectVideo(activeVid);

        // Save list to IndexedDB
        saveVideoGalleryToIDB(updatedList, activeId);
      }
    } catch (err) {
      console.error('Failed to import video:', err);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSelect = (vid: VideoAsset) => {
    onSelectVideo(vid);
    saveVideoGalleryToIDB(videoList, vid.id);
  };

  const handleRemove = (vidId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const updatedList = videoList.filter((v) => v.id !== vidId);
    let newSelected = selectedVideo;

    if (selectedVideo?.id === vidId) {
      newSelected = updatedList.length > 0 ? updatedList[0] : null;
      onSelectVideo(newSelected);
    }

    onVideoListChange(updatedList);
    saveVideoGalleryToIDB(updatedList, newSelected?.id || null);
  };

  return (
    <div
      onClick={handleCloseModal}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl sm:max-w-3xl sm:w-[65vw] bg-[#12151e] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Add Video in Dark Gray Theme */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#090b12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center justify-center text-slate-200">
              <VideoIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide uppercase">
              Add Video
            </h2>
          </div>

          <button
            onClick={handleCloseModal}
            disabled={isUploading}
            className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center transition-colors ${
              isUploading
                ? 'bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white cursor-pointer'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Native File Input */}
        <input
          id="video-gallery-file-input-multi"
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Body Area */}
        <div className="p-5 sm:p-6 bg-[#0c0e16] min-h-[420px] h-[70vh] max-h-[84vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          <div className="mb-3 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">
            <span>Max 30MB | Max Duration 30 sec</span>
            <span className="text-cyan-400">Best: 3MB–15MB (3-15s clips)</span>
          </div>

          {sizeError && (
            <div className="mb-3 px-3.5 py-2.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono">
              {sizeError}
            </div>
          )}

          {isUploading && (
            <div className="mb-4 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs flex flex-col gap-1.5 shadow-lg animate-pulse">
              <div className="flex items-center gap-2.5 font-bold text-cyan-100 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>গ্যালারি থেকে অ্যাপে ভিডিও ইম্পোর্ট ও প্রসেস হচ্ছে...</span>
              </div>
              <p className="text-[11px] text-cyan-300/80 font-mono">
                ১-২ সেকেন্ড অপেক্ষা করুন। ভিডিওটি পুরোপুরি মেমোরিতে রেডি হলে স্বয়ংক্রিয়ভাবে সিলেক্ট হয়ে যাবে।
              </p>
            </div>
          )}

          {/* Top-Left Horizontal / Grid Flow of Video Thumbnails + Right '+' Tile */}
          <div className="flex flex-wrap items-start justify-start gap-3">
            {/* Render imported video tiles */}
            {videoList.map((vid, idx) => {
              const isSelected = selectedVideo?.id === vid.id;

              return (
                <div
                  key={vid.id}
                  onClick={() => handleSelect(vid)}
                  className={`group relative aspect-[9/14] w-[76px] sm:w-[92px] rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex-shrink-0 bg-black ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-slate-700/80 hover:border-slate-500'
                  }`}
                  title={`${vid.name} (Click to select)`}
                >
                  {/* Thumbnail Display ONLY (No Video Playback) */}
                  {vid.startFrameUrl ? (
                    <img
                      src={vid.startFrameUrl}
                      alt={vid.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <video
                      src={vid.url}
                      className="w-full h-full object-cover pointer-events-none"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )}

                  {/* Top-Left Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(vid.id, e)}
                    title="Remove video"
                    className="absolute top-1 left-1 w-4.5 h-4.5 rounded-full bg-black/85 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-md border border-slate-700 hover:border-rose-500"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>

                  {/* Tick / Checkmark badge overlay when selected */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                      <div className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-lg animate-in zoom-in-75 duration-150">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  )}

                  {/* Video label & duration badge tag at bottom */}
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 px-1 py-0.5 text-[8px] font-mono font-bold text-slate-300 flex items-center justify-between border-t border-slate-800">
                    <span>#{idx + 1}</span>
                    <span className="text-cyan-400">{vid.duration ? `${Math.round(vid.duration)}s` : ''}</span>
                  </div>
                </div>
              );
            })}

            {/* Small Plus (+) Tile on the right side of the video layout */}
            <label
              htmlFor="video-gallery-file-input-multi"
              className="group aspect-[9/14] w-[76px] sm:w-[92px] rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/80 flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0"
              title="Add another video from gallery"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:border-slate-400 group-hover:scale-110 transition-all">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
