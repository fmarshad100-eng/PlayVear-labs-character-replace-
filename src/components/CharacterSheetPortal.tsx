import React, { useRef, useState, useEffect } from 'react';
import { Plus, User, Sparkles, X, CheckCircle, RotateCcw, Maximize2, Loader2 } from 'lucide-react';
import { CharacterAngleSlot } from '../types';
import { SAMPLE_CHARACTER_SLOTS, fileToCompressedDataUrl } from '../utils/sampleData';
import { ImagePreviewModal } from './ImagePreviewModal';

interface CharacterSheetPortalProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  onCompositeReady?: (compositeUrl: string) => void;
  compositeUrl?: string;
}

const DEFAULT_SLOTS: CharacterAngleSlot[] = [
  { id: '1', type: 'front', label: 'Full Front', angleDescription: 'Head-to-toe front', url: null },
  { id: '2', type: 'profile', label: 'Close Side Right', angleDescription: 'Right side profile', url: null },
  { id: '3', type: 'profile', label: 'Close Side Left', angleDescription: 'Left side profile', url: null },
  { id: '4', type: 'expression', label: 'Dynamic Smile', angleDescription: 'Expressive smile', url: null }
];

export const CharacterSheetPortal: React.FC<CharacterSheetPortalProps> = ({
  images,
  onImagesChange,
  onCompositeReady
}) => {
  const [slots, setSlots] = useState<CharacterAngleSlot[]>(() => {
    return DEFAULT_SLOTS.map((s, idx) => ({
      ...s,
      url: images[idx] || null
    }));
  });

  const activeSlotInputRef = useRef<HTMLInputElement>(null);
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null);
  const [previewSlotId, setPreviewSlotId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleCardClick = (slot: CharacterAngleSlot) => {
    setTargetSlotId(slot.id);
    if (activeSlotInputRef.current) {
      activeSlotInputRef.current.value = '';
      activeSlotInputRef.current.click();
    }
  };

  const handleOpenPreview = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewSlotId(slotId);
    setIsPreviewOpen(true);
  };

  // Sync slots to images array
  useEffect(() => {
    const validUrls = slots.map((s) => s.url).filter((u): u is string => Boolean(u));
    onImagesChange(validUrls);
    if (onCompositeReady && validUrls[0]) {
      onCompositeReady(validUrls[0]);
    }
  }, [slots]);

  const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = targetSlotId;
    if (!file || !targetId) return;

    setLoadingSlotId(targetId);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 640, 0.78);
      const url = dataUrl || URL.createObjectURL(file);
      setSlots((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, url, file } : s))
      );
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      setLoadingSlotId(null);
      setTargetSlotId(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleUseSampleCharacter = () => {
    setSlots(SAMPLE_CHARACTER_SLOTS);
  };

  const handleClearSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, url: null, file: undefined } : s)));
  };

  const handleClearAll = () => {
    setSlots(DEFAULT_SLOTS);
  };

  const filledCount = slots.filter((s) => s.url).length;

  return (
    <div className="flex flex-col h-full">
      {/* Clean, short header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold tracking-wider text-white uppercase">
            Character Photos (Max 4)
          </h2>
          {filledCount > 0 && (
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-400/30">
              {filledCount}/4 Loaded
            </span>
          )}
        </div>

        {filledCount > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[10px] text-slate-400 hover:text-pink-400 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Clear
          </button>
        )}
      </div>

      <input
        ref={activeSlotInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={handleSlotUpload}
      />

      {/* 4-Photo Palette Grid */}
      <div className="flex-1 flex flex-col justify-between border border-cyan-500/25 bg-[#080d19]/60 rounded-sm p-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {slots.map((slot, idx) => (
            <div
              key={slot.id}
              onClick={() => handleCardClick(slot)}
              onDoubleClick={(e) => handleOpenPreview(slot.id, e)}
              title={slot.url ? "Click to pick from gallery • Double-click for preview" : "Click to upload from gallery"}
              className={`group relative aspect-square rounded border transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${
                slot.url
                  ? 'border-cyan-400/50 bg-black/60 shadow-[0_0_10px_rgba(0,240,255,0.15)] hover:border-cyan-300'
                  : 'border-cyan-500/20 bg-slate-900/40 hover:border-cyan-400/50 hover:bg-cyan-950/20'
              }`}
            >
              {loadingSlotId === slot.id ? (
                <div className="h-full w-full flex flex-col items-center justify-center bg-black/80">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
              ) : slot.url ? (
                <>
                  <img
                    src={slot.url}
                    alt={slot.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Subtle schema tag */}
                  <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono font-bold text-cyan-300 border border-cyan-400/40">
                    @Image{idx + 1}
                  </div>

                  {/* Top-Right Quick Preview & Remove Buttons */}
                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenPreview(slot.id, e)}
                      title="Full-screen preview"
                      className="w-4 h-4 rounded-full bg-black/80 hover:bg-cyan-400 text-cyan-300 hover:text-black flex items-center justify-center border border-cyan-400/40"
                    >
                      <Maximize2 className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => handleClearSlot(slot.id, e)}
                      title="Remove"
                      className="w-4 h-4 rounded-full bg-black/80 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-1">
                    <span className="text-[9px] font-mono text-cyan-300 truncate w-full">
                      {slot.label}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-all mb-1">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-mono text-cyan-400/90 font-bold">
                    @Image{idx + 1}
                  </span>
                  <span className="text-[10px] font-medium text-slate-300 text-center leading-tight">
                    {slot.label}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Clean, short footer */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-cyan-500/15">
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            {filledCount >= 1 ? (
              <span className="text-cyan-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Ready
              </span>
            ) : (
              <span>Add at least 1 photo</span>
            )}
          </span>

          <button
            onClick={handleUseSampleCharacter}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 py-1 px-2.5 rounded bg-cyan-950/50 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Load Demo Actor (4 Photos)
          </button>
        </div>

        {/* Full-Screen Image Lightbox Preview */}
        <ImagePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          slots={slots}
          initialSlotId={previewSlotId}
        />
      </div>
    </div>
  );
};
