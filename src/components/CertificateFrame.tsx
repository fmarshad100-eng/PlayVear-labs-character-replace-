import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface CertificateFrameProps {
  children: React.ReactNode;
}

export const CertificateFrame: React.FC<CertificateFrameProps> = ({ children }) => {
  return (
    <div className="relative w-full max-w-6xl mx-auto my-4 md:my-8 px-3 sm:px-6">
      {/* Outer Certificate Border with Cyan Neon Hue */}
      <div className="certificate-frame rounded-md p-3 sm:p-7 relative transition-all duration-300">
        {/* Geometric Corner Accents (Certificate styling) */}
        {/* Top-Left Corner */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute top-3.5 left-3.5 w-1.5 h-1.5 bg-cyan-400 pointer-events-none" />

        {/* Top-Right Corner */}
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
        <div className="absolute top-3.5 right-3.5 w-1.5 h-1.5 bg-cyan-400 pointer-events-none" />

        {/* Bottom-Left Corner */}
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-3.5 left-3.5 w-1.5 h-1.5 bg-cyan-400 pointer-events-none" />

        {/* Bottom-Right Corner */}
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-3.5 right-3.5 w-1.5 h-1.5 bg-cyan-400 pointer-events-none" />

        {/* Inner Dashed Border Line */}
        <div className="certificate-inner-border rounded-sm p-4 sm:p-6 relative">
          {/* Certificate Subtle Top Header Stamp */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-cyan-500/15">
            <div className="flex items-center gap-2 text-cyan-400/90 text-xs font-mono tracking-widest uppercase">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>PlayVear Labs · Video Character Replacement Master</span>
            </div>
            <div className="text-[11px] font-mono text-cyan-300/60 tabular-nums hidden sm:block">
              SERIES: KLING-V4 / FAL-AI
            </div>
          </div>

          {/* Main Content Viewport */}
          {children}
        </div>
      </div>
    </div>
  );
};
