import React, { useState } from 'react';
import { X, Upload, Sparkles, Check, Trash2, Camera, UserCheck, Maximize2, Loader2, Save, FolderOpen } from 'lucide-react';
import { CharacterAngleSlot } from '../types';
import { SAMPLE_CHARACTER_SLOTS, fileToCompressedDataUrl, saveCustomSlots, clearSavedCustomSlots } from '../utils/sampleData';
import { ImagePreviewModal } from './ImagePreviewModal';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: CharacterAngleSlot[];
  onSlotsChange: (slots: CharacterAngleSlot[]) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  slots,
  onSlotsChange
}) => {
  const [processingSlotId, setProcessingSlotId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [previewSlotId, setPreviewSlotId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!isOpen) return null;

  // Handles upload for a specific slot directly and synchronously
  const handleSingleFileUpload = async (slotId: string, file: File | undefined) => {
    if (!file) return;
    setProcessingSlotId(slotId);

    try {
      const dataUrl = await fileToCompressedDataUrl(file, 640, 0.78);
      const finalUrl = dataUrl || URL.createObjectURL(file);

      const updated = slots.map((s) =>
        s.id === slotId ? { ...s, url: finalUrl, file } : s
      );

      saveCustomSlots(updated);
      onSlotsChange(updated);
    } catch (err) {
      console.error('Failed to process image:', err);
    } finally {
      setProcessingSlotId(null);
    }
  };

  // Handles batch upload from gallery (user picks 1 to 9 photos at once)
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsBatchProcessing(true);
    try {
      let currentSlots = [...slots];
      const count = Math.min(files.length, currentSlots.length);

      for (let i = 0; i < count; i++) {
        const file = files[i];
        const dataUrl = await fileToCompressedDataUrl(file, 640, 0.78);
        const finalUrl = dataUrl || URL.createObjectURL(file);
        currentSlots[i] = {
          ...currentSlots[i],
          url: finalUrl,
          file
        };
      }

      saveCustomSlots(currentSlots);
      onSlotsChange(currentSlots);
    } catch (err) {
      console.error('Batch upload error:', err);
    } finally {
      setIsBatchProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenPreview = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPreviewSlotId(slotId);
    setIsPreviewOpen(true);
  };

  const handleClearSlot = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = slots.map((s) =>
      s.id === slotId ? { ...s, url: null, file: undefined } : s
    );
    saveCustomSlots(updated);
    onSlotsChange(updated);
  };

  const handleResetToDemo = () => {
    clearSavedCustomSlots();
    onSlotsChange(SAMPLE_CHARACTER_SLOTS);
  };

  const handleClearAll = () => {
    clearSavedCustomSlots();
    const emptySlots = slots.map((s) => ({ ...s, url: null, file: undefined }));
    onSlotsChange(emptySlots);
  };

  const loadedCount = slots.filter((s) => Boolean(s.url)).length;
  const isCustomActor = slots.some(
    (s) => s.url && !SAMPLE_CHARACTER_SLOTS.some((demo) => demo.url === s.url)
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full h-full max-w-none max-h-none sm:w-[92vw] sm:h-[90vh] sm:max-w-6xl sm:rounded-2xl bg-[#12151e] border-0 sm:border sm:border-slate-700/80 rounded-none shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Minimal Dark Gray Header without deleted elements */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-end bg-[#090b12] flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDemo}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Reset image"
            >
              <span>Reset image</span>
            </button>

            {loadedCount > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-xs font-mono text-slate-400 hover:text-rose-300 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Batch processing loading banner */}
        {isBatchProcessing && (
          <div className="px-4 py-2 bg-slate-800/90 border-b border-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-2 flex-shrink-0">
            <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
            <span>Processing and saving gallery photos...</span>
          </div>
        )}

        {/* 4 Angle Slots (Top Aligned as requested) */}
        <div className="flex-1 p-3 pt-3 sm:p-6 sm:pt-4 bg-[#0c0e16] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex flex-col items-center justify-start">
          <div className="grid grid-cols-4 gap-3 sm:gap-3.5 max-w-[365px] mx-auto w-full mt-1 sm:mt-2">
            {slots.map((slot, index) => {
              const imageIndex = index + 1;
              const isProcessingThis = processingSlotId === slot.id;
              const inputId = `slot-file-input-${slot.id}`;

              return (
                <div key={slot.id} className="flex flex-col items-center w-full">
                  {/* Hidden Native File Input dedicated to this slot */}
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSingleFileUpload(slot.id, file);
                      if (e.target) e.target.value = '';
                    }}
                  />

                  {/* 9:16 Photo Card (+5% Size Increase: max-w-[94px]) */}
                  <div
                    className={`group relative aspect-[9/16] w-full max-w-[94px] rounded-xl border transition-all duration-200 overflow-hidden shadow-lg ${
                      slot.url
                        ? 'border-slate-700/80 hover:border-slate-500 bg-black'
                        : 'border-dashed border-slate-700/80 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/80'
                    }`}
                  >
                    {/* Native Label covers the entire card */}
                    <label
                      htmlFor={inputId}
                      className="absolute inset-0 z-10 cursor-pointer flex flex-col items-center justify-center"
                      title={slot.url ? "Click to pick from gallery / replace" : "Click to select from gallery"}
                    >
                      {isProcessingThis ? (
                        <div className="h-full w-full flex flex-col items-center justify-center p-1 text-center bg-black/85 z-20">
                          <Loader2 className="w-4 h-4 text-slate-300 animate-spin mb-1" />
                          <span className="text-[8px] text-slate-300 font-mono">
                            Saving...
                          </span>
                        </div>
                      ) : slot.url ? (
                        <>
                          {/* Photo Image */}
                          <img
                            src={slot.url}
                            alt={slot.label}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                          />

                          {/* Hover Overlay Hint */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity backdrop-blur-[1px] p-1 text-center pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 text-[8px] font-mono text-slate-200 flex items-center gap-0.5">
                              <Upload className="w-2.5 h-2.5 text-slate-300" /> Tap
                            </span>
                          </div>
                        </>
                      ) : (
                        /* Empty Slot Placeholder */
                        <div className="h-full flex flex-col items-center justify-center p-1 text-center pointer-events-none">
                          <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-all mb-1 shadow-inner">
                            <Upload className="w-3 h-3" />
                          </div>
                          <span className="text-[8px] text-slate-300 font-mono font-medium underline">
                            Pick
                          </span>
                        </div>
                      )}
                    </label>

                    {/* Action buttons sitting ABOVE the label */}
                    {slot.url && !isProcessingThis && (
                      <>
                        {/* Top-Left Full-Screen Preview Icon */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenPreview(slot.id, e)}
                          title="View large preview"
                          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/85 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center opacity-85 group-hover:opacity-100 transition-all z-20 cursor-pointer border border-slate-700 shadow-sm"
                        >
                          <Maximize2 className="w-2 h-2" />
                        </button>

                        {/* Top-Right Remove Button */}
                        <button
                          type="button"
                          onClick={(e) => handleClearSlot(slot.id, e)}
                          title="Remove photo"
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/85 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center opacity-85 group-hover:opacity-100 transition-all z-20 cursor-pointer border border-slate-700 hover:border-rose-500 shadow-sm"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Details strictly BELOW the image */}
                  <div className="mt-1.5 text-center w-full px-0.5 max-w-[94px]">
                    <div className="text-[10px] font-bold text-slate-100 leading-tight truncate">
                      Img {imageIndex}
                    </div>
                    <div className="text-[8.5px] text-slate-400 font-mono truncate mt-0.5">
                      {slot.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer - Styled with 80% Neon Cyan & 20% Neon Magenta Button */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#090b12] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[7.5px] font-mono text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-cyan-400" />
            <span>
              {loadedCount} of {slots.length} Loaded &bull; Primary: <strong className="text-slate-200 font-bold">@Image1</strong>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-cyan-300/60 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.7)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Apply &amp; Done
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
