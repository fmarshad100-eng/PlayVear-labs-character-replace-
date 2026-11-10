import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { CharacterAngleSlot } from '../types';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: CharacterAngleSlot[];
  initialSlotId?: string | null;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  slots,
  initialSlotId
}) => {
  // Filter only slots that actually have an image loaded
  const availableSlots = slots.filter((s) => Boolean(s.url));

  const initialIndex = Math.max(
    0,
    availableSlots.findIndex((s) => s.id === initialSlotId)
  );

  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Sync index when initialSlotId changes
  useEffect(() => {
    if (initialSlotId) {
      const idx = availableSlots.findIndex((s) => s.id === initialSlotId);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialSlotId, isOpen]);

  // Keyboard navigation (Escape, Left, Right)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, availableSlots.length]);

  if (!isOpen || availableSlots.length === 0) return null;

  const currentSlot = availableSlots[currentIndex] || availableSlots[0];
  const originalSlotIndex = slots.findIndex((s) => s.id === currentSlot.id) + 1;

  const handlePrev = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : availableSlots.length - 1));
  };

  const handleNext = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev < availableSlots.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    if (!currentSlot.url) return;
    const a = document.createElement('a');
    a.href = currentSlot.url;
    a.download = `character_image_${originalSlotIndex}_${currentSlot.label.toLowerCase().replace(/\s+/g, '_')}.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Container - Full Screen Modal */}
      <div
        className="relative flex flex-col items-center justify-between w-full h-full max-w-none max-h-none sm:w-[92vw] sm:h-[90vh] sm:max-w-6xl sm:rounded-2xl bg-[#060a14]/95 border-0 sm:border sm:border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full px-5 py-3.5 bg-[#080d1a] border-b border-slate-800 flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold shadow-md">
              @Image{originalSlotIndex}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {currentSlot.label}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {currentSlot.angleDescription} &bull; Photo {currentIndex + 1} of {availableSlots.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom / Full Toggle */}
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? 'Reset zoom' : 'Fit/Zoom full'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              title="Download image"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="Close preview (Esc)"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 transition-all cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Full-Screen Image View Area */}
        <div className="relative flex-1 w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none bg-black/80">
          {/* Previous Button */}
          {availableSlots.length > 1 && (
            <button
              onClick={handlePrev}
              title="Previous image (Left arrow)"
              className="absolute left-4 sm:left-6 z-20 w-11 h-11 rounded-full bg-black/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer backdrop-blur-md"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Preview Image */}
          {currentSlot.url && (
            <div
              className={`relative transition-all duration-300 flex items-center justify-center ${
                isZoomed
                  ? 'w-full h-full cursor-zoom-out overflow-auto'
                  : 'max-h-[68vh] sm:max-h-[72vh] aspect-[9/16] cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            >
              <img
                src={currentSlot.url}
                alt={currentSlot.label}
                className={`rounded-xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,240,255,0.25)] transition-transform duration-200 ${
                  isZoomed
                    ? 'w-auto max-w-none h-auto object-contain'
                    : 'w-full h-full object-contain'
                }`}
              />

              {/* High-res label badge at bottom */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/85 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                9:16 Full Portrait &bull; High Resolution
              </div>
            </div>
          )}

          {/* Next Button */}
          {availableSlots.length > 1 && (
            <button
              onClick={handleNext}
              title="Next image (Right arrow)"
              className="absolute right-3 sm:right-6 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-cyan-950/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Thumbnail Selector Strip at Bottom */}
        {availableSlots.length > 1 && (
          <div className="w-full px-4 py-2.5 bg-[#080d1a] border-t border-cyan-500/20 flex items-center justify-center gap-2 overflow-x-auto">
            {availableSlots.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setIsZoomed(false);
                  setCurrentIndex(idx);
                }}
                className={`relative w-11 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                  currentIndex === idx
                    ? 'border-cyan-400 scale-105 shadow-[0_0_15px_rgba(0,240,255,0.5)]'
                    : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-cyan-500/60'
                }`}
                title={s.label}
              >
                {s.url && (
                  <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-cyan-300 text-center py-0.5">
                  #{idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
