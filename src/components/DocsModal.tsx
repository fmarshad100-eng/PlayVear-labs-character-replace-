import React from 'react';
import { X, BookOpen, Layers, Terminal, Sparkles, ExternalLink } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#080d1a] border border-cyan-500/40 rounded-md p-6 shadow-[0_0_40px_rgba(0,240,255,0.15)] text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-cyan-500/20">
          <div className="w-9 h-9 rounded bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Kling AI & Fal.ai Integration Specs
            </h3>
            <p className="text-xs text-cyan-300/80 font-mono">
              Character Replacement Architecture & API Call Standards
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs text-slate-300">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              1. How Character Replacement Operates
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Kling AI on Fal.ai uses an advanced diffusion-based latent video model. When given a target video clip and a multi-angle character sheet composite, it tracks the actor's 3D pose, facial mesh, and choreography keyframes, then synthesizes the new character's identity while locking camera dynamics, background scenery, stage lighting, and soundtrack.
            </p>
          </div>

          <div className="bg-[#0b1224] p-3.5 rounded border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              2. Full 3-Step Kling 4.0 Queue Lifecycle
            </h4>
            <p className="text-[11px] text-slate-400">
              The studio follows the official non-blocking Queue protocol on <code className="text-cyan-300 font-mono">kling/v4/video-to-video/edit</code>:
            </p>
            <pre className="p-3 bg-black/60 rounded text-[11px] font-mono text-cyan-300 overflow-x-auto border border-cyan-500/20">
{`import { fal } from "@fal-ai/client";

// Step 1: Submit non-blocking request
const { request_id } = await fal.queue.submit("kling/v4/video-to-video/edit", {
  input: {
    prompt: "In @video1, replace the main character with @image1...",
    video_url: "https://v3b.fal.media/.../target_song.mp4",
    image_urls: ["https://v3b.fal.media/.../character_sheet.jpg"],
    duration: 5,
    resolution: "1080p"
  },
  webhookUrl: "https://your-app/api/fal/webhook"
});

// Step 2: Fetch status with logs
const status = await fal.queue.status("kling/v4/video-to-video/edit", {
  requestId: request_id,
  logs: true
});

// Step 3: Get completed result video
if (status.status === "COMPLETED") {
  const result = await fal.queue.result("kling/v4/video-to-video/edit", {
    requestId: request_id
  });
  console.log(result.data.video.url);
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
              3. Kling 4.0 Specifications & Capabilities
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>
                <strong className="text-slate-200">Starting Frame & Keyframes:</strong> Kling 4.0 animates starting images into 3 to 30-second videos at 1080p or 720p with optional ending and middle keyframes (up to 8).
              </li>
              <li>
                <strong className="text-slate-200">Master 1080p Resolution:</strong> Crystal-clear facial features and dance motion synchronization.
              </li>
              <li>
                <strong className="text-slate-200">Native @fal-ai/client:</strong> Fully authenticated via your server-side <code className="text-cyan-300 font-mono">FAL_KEY</code>.
              </li>
            </ul>
          </div>

          <div className="bg-[#0b1224] p-3.5 rounded border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              4. Hosted Files (URL) & Storage Upload (fal.storage.upload)
            </h4>
            <p className="text-[11px] text-slate-400">
              Pass your own publicly accessible URLs or upload directly using Fal.ai’s persistent CDN storage:
            </p>
            <pre className="p-3 bg-black/60 rounded text-[11px] font-mono text-cyan-300 overflow-x-auto border border-cyan-500/20">
{`import { fal } from "@fal-ai/client";

// Upload files using client API and use returned URL:
const file = new File([buffer], "actor_dance.mp4", { type: "video/mp4" });
const url = await fal.storage.upload(file);
console.log("Hosted Fal URL:", url); // https://v3b.fal.media/...`}
            </pre>
          </div>

          <div className="bg-[#0b1224] p-3.5 rounded border border-cyan-500/30 space-y-2.5">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              5. Official Endpoint Input Schema (kling/v4/video-to-video/edit)
            </h4>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-black/60 border border-slate-800">
                <span className="text-cyan-300 font-bold block mb-0.5">prompt (string)</span>
                <span className="text-slate-400">Edit instruction. Reference the source video as <code className="text-cyan-300">@Video1</code>.</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-slate-800">
                <span className="text-cyan-300 font-bold block mb-0.5">video_url (string)</span>
                <span className="text-slate-400">The video to edit (3-30s), referenced as <code className="text-cyan-300">@Video1</code>.</span>
                <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] text-slate-300 border-t border-slate-800/80 pt-1.5">
                  <span>• Max file size: <strong className="text-cyan-300">300.0MB</strong></span>
                  <span>• Min / Max duration: <strong className="text-cyan-300">3.0s – 30.05s</strong></span>
                  <span>• Min resolution: <strong className="text-cyan-300">700px × 700px</strong></span>
                  <span>• Max resolution: <strong className="text-cyan-300">4553px × 4553px</strong></span>
                  <span>• Aspect ratio: <strong className="text-cyan-300">0.40 – 2.50</strong></span>
                  <span>• FPS limits: <strong className="text-cyan-300">23.9 – 60.05 FPS</strong></span>
                  <span>• Timeout: <strong className="text-cyan-300">30.0s</strong></span>
                </div>
              </div>
              <div className="p-2 rounded bg-black/60 border border-slate-800">
                <span className="text-cyan-300 font-bold block mb-0.5">image_urls (list&lt;string&gt;)</span>
                <span className="text-slate-400">Reference images, referenced as <code className="text-cyan-300">@Image1</code>, <code className="text-cyan-300">@Image2</code>, ...</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-slate-800">
                <span className="text-cyan-300 font-bold block mb-0.5">video_urls (list&lt;string&gt;)</span>
                <span className="text-slate-400">Reference videos, referenced as <code className="text-cyan-300">@Video2</code>, <code className="text-cyan-300">@Video3</code>, ... (max 4, total duration ≤ 30s).</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-slate-800">
                <span className="text-cyan-300 font-bold block mb-0.5">elements (list&lt;KlingV4Element&gt;)</span>
                <span className="text-slate-400">Characters/objects referenced as <code className="text-cyan-300">@Element1</code>, <code className="text-cyan-300">@Element2</code>, ... (max 7). Includes frontal image, 1–3 reference angle views, or video (3–8s) + optional voice_id.</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-slate-800">
                <span className="text-cyan-300 font-bold block mb-0.5">voice_ids (list&lt;string&gt;)</span>
                <span className="text-slate-400">Voices referenced as <code className="text-cyan-300">@Voice1</code>, <code className="text-cyan-300">@Voice2</code>, ... (max 3). Created with <code className="text-cyan-300">fal-ai/kling-video/create-voice</code>.</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-slate-800">
                <span className="text-cyan-300 font-bold block mb-0.5">aspect_ratio & resolution</span>
                <span className="text-slate-400">Aspect ratio: <code className="text-cyan-300">auto</code>, <code className="text-cyan-300">16:9</code>, <code className="text-cyan-300">9:16</code>, <code className="text-cyan-300">1:1</code>, <code className="text-cyan-300">21:9</code> · Resolution: <code className="text-cyan-300">1080p</code>, <code className="text-cyan-300">720p</code>.</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-cyan-500/30">
                <span className="text-fuchsia-300 font-bold block mb-0.5">Output Schema (video: File)</span>
                <span className="text-slate-400">Returns <code className="text-cyan-300">video.url</code>, <code className="text-cyan-300">file_name</code>, <code className="text-cyan-300">file_size</code> (bytes), <code className="text-cyan-300">content_type</code> (&quot;video/mp4&quot;).</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <a
              href="https://fal.ai/models/kling/v4/video-to-video/edit"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-mono underline"
            >
              Official Fal.ai Kling API Documentation <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
