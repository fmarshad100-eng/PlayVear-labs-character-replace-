import React, { useState } from 'react';
import { Plus, Sliders, Zap, ShieldAlert, Monitor, Ratio, Mic, Video, Sparkles, ArrowUp, X } from 'lucide-react';
import { FalConfig, AspectRatioType } from '../types';

interface PromptAndSettingsProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  selectedPipeline: string;
  onPipelineChange: (pipeline: string) => void;
  resolution: '720p' | '1080p';
  onResolutionChange: (res: '720p' | '1080p') => void;
  aspectRatio: AspectRatioType;
  onAspectRatioChange: (ar: AspectRatioType) => void;
  voiceId?: string;
  onVoiceIdChange?: (voiceId: string) => void;
  referenceVideoUrl?: string;
  onReferenceVideoUrlChange?: (url: string) => void;
  config: FalConfig | null;
  onReplaceClick: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  onOpenCharacterModal: () => void;
  characterImages: string[];
}

export const PromptAndSettings: React.FC<PromptAndSettingsProps> = ({
  prompt,
  onPromptChange,
  selectedPipeline,
  onPipelineChange,
  resolution,
  onResolutionChange,
  aspectRatio,
  onAspectRatioChange,
  voiceId = '',
  onVoiceIdChange,
  referenceVideoUrl = '',
  onReferenceVideoUrlChange,
  config,
  onReplaceClick,
  isGenerating,
  canGenerate,
  onOpenCharacterModal,
  characterImages
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const quickPresets = [
    { label: 'Dance Scene', text: 'In @Video1, replace lead actor with @Image1, keeping choreography, stage lights, and audio.' },
    { label: 'Action Motion', text: 'In @Video1, replace character with @Image1, locking camera dynamics and background.' },
    { label: 'Lip-Sync Voice', text: 'In @Video1, replace character with @Image1 and sync voice with @Voice1.' }
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canGenerate && !isGenerating) {
        onReplaceClick();
      }
    }
  };

  return (
    <div className="w-full mt-4 flex flex-col items-center">
      {/* ChatGPT-Style Command Box */}
      <div className="w-full max-w-4xl bg-[#090d18] border border-cyan-500/35 hover:border-cyan-400/60 focus-within:border-cyan-400 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.25)] rounded-2xl p-2.5 sm:p-3 transition-all duration-300">
        
        {/* Attached Character Photo Chips (Horizontal Bar) */}
        {characterImages.length > 0 && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/15 overflow-x-auto scrollbar-none px-1">
            <span className="text-[10px] font-mono text-cyan-400/90 whitespace-nowrap flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Attached Character ({characterImages.length} angles):
            </span>
            <div className="flex items-center gap-1.5">
              {characterImages.slice(0, 6).map((imgUrl, idx) => (
                <div
                  key={idx}
                  onClick={onOpenCharacterModal}
                  title={`@Image${idx + 1} - Click to edit angles`}
                  className="group relative w-7 h-12 rounded border border-cyan-400/40 bg-black overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 hover:border-cyan-300 transition-all shadow-sm"
                >
                  <img src={imgUrl} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] font-mono text-center text-cyan-300">
                    @{idx + 1}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={onOpenCharacterModal}
              className="text-[10px] font-mono text-cyan-400 hover:text-white px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer whitespace-nowrap ml-auto"
            >
              Edit 9:16 Angles &rarr;
            </button>
          </div>
        )}

        {/* Main Input Row */}
        <div className="flex items-end gap-2">
          {/* ChatGPT-style '+' Add Character Button */}
          <button
            type="button"
            onClick={onOpenCharacterModal}
            title="Open Character Photos (6 Angles)"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 shadow-[0_0_12px_rgba(0,240,255,0.2)] cursor-pointer group"
          >
            <Plus className="w-5 h-5 stroke-[2.2] group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Prompt Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="In @Video1, replace the lead actor with @Image1, maintaining original dance moves, stage lighting, and audio..."
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed py-1"
            />
          </div>

          {/* Action Replace Button */}
          <button
            type="button"
            onClick={onReplaceClick}
            disabled={!canGenerate || isGenerating}
            title={canGenerate ? 'Start Character Replacement' : 'Select video and photos to start'}
            className={`h-10 px-4 sm:px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer ${
              !canGenerate || isGenerating
                ? 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(255,0,127,0.45)] hover:shadow-[0_0_28px_rgba(255,0,127,0.7)] border border-pink-400/60'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1.5 text-pink-200">
                <Zap className="w-3.5 h-3.5 animate-bounce text-pink-300" />
                <span className="hidden sm:inline">Generating</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Replace</span>
              </span>
            )}
          </button>
        </div>

        {/* Bottom Bar: Badges, Resolution & Settings Toggle */}
        <div className="mt-2.5 pt-2 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick 1080p Toggle */}
            <div className="flex items-center bg-[#060a14] border border-cyan-500/30 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onResolutionChange('1080p')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                  resolution === '1080p'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-2.5 h-2.5 text-cyan-400" /> 1080p
              </button>
              <button
                type="button"
                onClick={() => onResolutionChange('720p')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  resolution === '720p'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                720p
              </button>
            </div>

            {/* Aspect Ratio */}
            <div className="flex items-center bg-[#060a14] border border-cyan-500/30 rounded-lg p-0.5">
              <span className="px-1 text-cyan-400/70">
                <Ratio className="w-2.5 h-2.5" />
              </span>
              {(['auto', '16:9', '9:16', '1:1'] as AspectRatioType[]).map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => onAspectRatioChange(ar)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all ${
                    aspectRatio === ar
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/50 shadow-[0_0_6px_rgba(0,240,255,0.25)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>

            {/* Presets */}
            <div className="hidden sm:flex items-center gap-1 text-slate-400">
              {quickPresets.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onPromptChange(qp.text)}
                  className="px-2 py-0.5 rounded-full bg-slate-900/80 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-[9px] text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!config?.isConfigured && (
              <span className="text-amber-400/90 flex items-center gap-1 font-mono text-[9px]">
                <ShieldAlert className="w-2.5 h-2.5" />
                Demo / Fal Key
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="text-[10px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 font-mono transition-colors cursor-pointer"
            >
              <Sliders className="w-2.5 h-2.5" />
              {showSettings ? 'Hide Options' : 'More Options'}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Settings Drawer */}
      {showSettings && (
        <div className="w-full max-w-4xl mt-2 p-3 bg-[#080d1a] border border-cyan-500/20 rounded-xl text-xs space-y-3 animate-in fade-in duration-150">
          <div>
            <span className="text-[10px] font-mono text-cyan-300 block mb-1">
              Fal.ai Model Pipeline:
            </span>
            <select
              value={selectedPipeline}
              onChange={(e) => onPipelineChange(e.target.value)}
              className="w-full bg-[#050811] border border-cyan-500/30 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
            >
              <option value="kling/v4/video-to-video/edit">
                Kling 4.0 Video-to-Video Edit (kling/v4/video-to-video/edit) &bull; Standard
              </option>
              <option value="fal-ai/kling-video/v3/standard/motion-control">
                Kling Motion Control (Choreography Transfer)
              </option>
              <option value="ai-face-swap/faceswapvideo">
                AI Video Face Swap Pro
              </option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1 mb-1">
                <Mic className="w-3 h-3 text-cyan-400" /> Voice ID (<code className="text-cyan-400">@Voice1</code>)
              </span>
              <input
                type="text"
                placeholder="Optional voice ID from kling-video/create-voice"
                value={voiceId}
                onChange={(e) => onVoiceIdChange && onVoiceIdChange(e.target.value)}
                className="w-full bg-[#050811] border border-cyan-500/30 rounded px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div>
              <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1 mb-1">
                <Video className="w-3 h-3 text-cyan-400" /> Reference Video (<code className="text-cyan-400">@Video2</code>)
              </span>
              <input
                type="url"
                placeholder="https://.../reference_motion.mp4"
                value={referenceVideoUrl}
                onChange={(e) => onReferenceVideoUrlChange && onReferenceVideoUrlChange(e.target.value)}
                className="w-full bg-[#050811] border border-cyan-500/30 rounded px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
