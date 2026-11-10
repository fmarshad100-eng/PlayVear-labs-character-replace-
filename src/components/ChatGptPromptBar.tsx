import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowUp, Image as ImageIcon, Video as VideoIcon, X, Play } from 'lucide-react';
import { VideoAsset, CharacterAngleSlot, AspectRatioType } from '../types';

interface ChatGptPromptBarProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  video: VideoAsset | null;
  onOpenVideoModal: () => void;
  onRemoveVideo: () => void;
  characterSlots: CharacterAngleSlot[];
  onOpenCharacterModal: () => void;
  onRemoveCharacter: () => void;
  resolution?: '768p' | '720p' | '1080p';
  onResolutionChange?: (res: '768p' | '720p' | '1080p') => void;
  aspectRatio?: AspectRatioType;
  onAspectRatioChange?: (ar: AspectRatioType) => void;
}

export const ChatGptPromptBar: React.FC<ChatGptPromptBarProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  isGenerating,
  canGenerate,
  video,
  onOpenVideoModal,
  onRemoveVideo,
  characterSlots,
  onOpenCharacterModal,
  onRemoveCharacter
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const characterImages = characterSlots
    .map((s) => s.url)
    .filter((u): u is string => Boolean(u));

  const primarySlot = characterSlots.find((s) => s.type === 'front') || characterSlots[0];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canGenerate && !isGenerating) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* 80% Neon Cyan + 20% Neon Magenta Dark Theme ChatGPT Prompt Box */}
      <div className="relative bg-[#090e1c] hover:bg-[#0c1326] focus-within:bg-[#0c1326] border border-cyan-500/35 hover:border-cyan-400/60 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40 rounded-[26px] p-3 sm:p-4 transition-all shadow-[0_0_30px_rgba(0,240,255,0.18)] flex flex-col justify-between min-h-[170px]">
        
        {/* Attached Files Strip inside the ChatGPT prompt box */}
        {(video || characterImages.length > 0) && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/15 overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-500/20">
            {/* Attached Video: Thumbnail Only */}
            {video && (
              <div
                onClick={onOpenVideoModal}
                className="group relative w-11 h-14 rounded-xl bg-black border border-cyan-400/50 hover:border-cyan-300 overflow-hidden shadow-[0_0_12px_rgba(0,240,255,0.25)] flex-shrink-0 cursor-pointer transition-all hover:scale-105"
                title="Click to edit or trim video"
              >
                {video.startFrameUrl ? (
                  <img
                    src={video.startFrameUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={video.url}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                    playsInline
                    preload="metadata"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                {/* Center play icon badge */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-all">
                  <div className="w-5 h-5 rounded-full bg-black/70 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                    <Play className="w-2.5 h-2.5 fill-cyan-300 ml-0.5" />
                  </div>
                </div>
                {/* Video tag at bottom */}
                <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[7px] font-mono text-cyan-300 text-center py-0.2">
                  VIDEO
                </span>
                {/* Remove button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveVideo();
                  }}
                  title="Remove video"
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/85 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-sm"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Attached Character Photos: Show all 9 thumbnails */}
            {characterImages.length > 0 && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {characterSlots.map((slot, index) => {
                  if (!slot.url) return null;
                  return (
                    <div
                      key={slot.id}
                      onClick={onOpenCharacterModal}
                      className="group relative w-9 h-14 rounded-lg bg-black border border-cyan-500/40 hover:border-cyan-300 overflow-hidden shadow-[0_0_8px_rgba(0,240,255,0.18)] flex-shrink-0 cursor-pointer hover:scale-105 transition-all"
                      title={`Image ${index + 1}: ${slot.label} (Click for 9-photo animated preview)`}
                    >
                      <img
                        src={slot.url}
                        alt={slot.label}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[7px] font-mono font-bold text-cyan-300 text-center py-0.2 border-t border-cyan-500/30">
                        #{index + 1}
                      </span>
                    </div>
                  );
                })}

                {/* Quick button to open animated 9-photo preview modal */}
                <button
                  type="button"
                  onClick={onOpenCharacterModal}
                  className="px-2 py-1 h-14 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[9.5px] font-mono flex flex-col items-center justify-center gap-0.5 transition-all flex-shrink-0 cursor-pointer"
                  title="Open 9-photo animated preview"
                >
                  <span className="font-bold">{characterImages.length}</span>
                  <span className="text-[7.5px] text-cyan-400/80">Photos</span>
                </button>

                {/* Remove photos button */}
                <button
                  type="button"
                  onClick={onRemoveCharacter}
                  title="Clear photos"
                  className="w-5 h-5 rounded-full bg-slate-850 hover:bg-pink-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-0.5 flex-shrink-0 shadow-sm"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text Area */}
        <div className="flex-1 w-full max-h-[160px] overflow-y-auto">
          <textarea
            rows={5}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="w-full min-h-[110px] bg-transparent border-0 text-[13.5px] text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed p-1"
          />
        </div>

        {/* Bottom Toolbar inside the box (ChatGPT Style with 80% Cyan + 20% Magenta) */}
        <div className="flex items-center justify-between pt-2">
          {/* Plus (+) Button & Popover Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-9 h-9 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.2)] ${
                isMenuOpen ? 'bg-cyan-900/80 border-cyan-300 text-white shadow-[0_0_16px_rgba(0,240,255,0.4)]' : ''
              }`}
              title="Add Image or Video"
            >
              <Plus className={`w-5 h-5 transition-transform duration-200 ${isMenuOpen ? 'rotate-45 text-pink-400' : ''}`} />
            </button>

            {/* ChatGPT-style Floating Menu */}
            {isMenuOpen && (
              <div className="absolute bottom-12 left-0 w-60 bg-[#080d19] border border-cyan-500/40 rounded-2xl p-1.5 shadow-[0_0_30px_rgba(0,240,255,0.3)] z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
                {/* Add Image option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenCharacterModal();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cyan-950/50 text-left text-sm text-slate-200 hover:text-cyan-300 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 group-hover:bg-cyan-900/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400 transition-colors shadow-sm">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white text-[13px]">Add Photo</span>
                  </div>
                </button>

                {/* Add Video option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenVideoModal();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cyan-950/50 text-left text-sm text-slate-200 hover:text-cyan-300 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 group-hover:bg-cyan-900/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400 transition-colors shadow-sm">
                    <VideoIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white text-[13px]">Add Video</span>
                    <span className="text-[11px] text-cyan-400/80 font-mono">
                      Target Video · 3s–30s
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Right Action: Clean Neon Magenta Send Button (ChatGPT style, no resolution clutter) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isGenerating}
              title={canGenerate ? 'Send (Start PlayVear AI generation)' : 'Click to select video and character photos'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer ${
                isGenerating
                  ? 'bg-[#0f172a] text-slate-600 border border-slate-800 cursor-not-allowed opacity-75'
                  : canGenerate
                  ? 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(255,0,127,0.55)] hover:shadow-[0_0_28px_rgba(255,0,127,0.8)] border border-pink-400/60 active:scale-95'
                  : 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)] active:scale-95'
              }`}
            >
              {isGenerating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5 stroke-[2.75]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
