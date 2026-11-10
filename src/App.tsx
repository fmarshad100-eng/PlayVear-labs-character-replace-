import { useState, useEffect, useRef } from 'react';
import { ChatGptPromptBar } from './components/ChatGptPromptBar';
import { CharacterModal } from './components/CharacterModal';
import { VideoModal } from './components/VideoModal';
import { CleanOutputPlayer } from './components/CleanOutputPlayer';
import { VideoAsset, GenerationJob, AspectRatioType, CharacterAngleSlot } from './types';
import {
  SAMPLE_CHARACTER_SLOTS,
  SAMPLE_VIDEOS,
  generateCompositeCharacterSheet,
  loadSavedCustomSlots,
  loadSlotsFromIDB,
  saveCustomSlots,
  clearSavedCustomSlots,
  loadVideoFromIDB,
  clearVideoFromIDB,
  loadVideoGalleryFromIDB,
  saveVideoGalleryToIDB
} from './utils/sampleData';
import {
  SquarePen,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Modals triggered strictly by '+' button
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Character Slots (Default: user's saved gallery photos if exist, otherwise 9 Bangladeshi demo actor angles)
  const [characterSlots, setCharacterSlots] = useState<CharacterAngleSlot[]>(() => {
    const saved = loadSavedCustomSlots();
    return saved || SAMPLE_CHARACTER_SLOTS;
  });
  const [isCharacterAttached, setIsCharacterAttached] = useState<boolean>(true);
  const [customSlots, setCustomSlots] = useState<CharacterAngleSlot[] | null>(() => {
    return loadSavedCustomSlots();
  });

  // Target Video List & Selected Video
  const [videoList, setVideoList] = useState<VideoAsset[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoAsset | null>(null);

  // Prompt & Settings
  const [prompt, setPrompt] = useState<string>(
    `In @Video1, replace the original male lead hero with the reference character from @Image1 to @Image4.

Use @Image1 (Full-body front), @Image2 (Close side right), @Image3 (Close side left), and @Image4 (Dynamic smile) to maintain 100% identity consistency across every frame and camera angle.

Keep the original video exactly the same: same scene, background, camera angles, camera movement, choreography, action, timing, lighting, environment, expressions, body movements and overall cinematic style.

Only replace the original hero with me (@Image1 to @Image4). Preserve my exact facial identity, facial features, hairstyle, skin tone, outfit, and appearance throughout the entire video. Match my face and head naturally to the original hero's head position, movements, and camera angles. Make me perform all original actions and dance movements naturally.

Do not change the heroine. Keep the female character 100% original. Don't change anything about her.

Keep the background, location, props, camera movement, lighting, and all other elements of the original video intact.

The final result must look like the original movie scene, with me seamlessly appearing in the hero's place.`
  );
  const [resolution, setResolution] = useState<'768p' | '720p' | '1080p'>('720p');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('auto');

  // Active Job State
  const [currentJob, setCurrentJob] = useState<GenerationJob | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const characterImages = isCharacterAttached
    ? characterSlots.map((s) => s.url).filter((u): u is string => Boolean(u))
    : [];

  // When slots change in CharacterModal
  const handleSlotsChange = (newSlots: CharacterAngleSlot[]) => {
    setCharacterSlots(newSlots);
    setIsCharacterAttached(true);

    // Check if slots contain custom user uploads or non-demo images
    const hasCustom = newSlots.some(
      (s) => s.file || (s.url && !SAMPLE_CHARACTER_SLOTS.some((demo) => demo.url === s.url))
    );

    if (hasCustom) {
      setCustomSlots(newSlots);
      saveCustomSlots(newSlots);
    } else {
      // If user restored demo or cleared custom slots
      const isDemo = newSlots.every((s, idx) => s.url === SAMPLE_CHARACTER_SLOTS[idx]?.url);
      if (isDemo) {
        setCustomSlots(null);
        clearSavedCustomSlots();
      }
    }
  };

  // When user clicks '+' -> 'Add Image' in prompt bar:
  // If user previously imported their custom photos, show them.
  // If user hasn't imported custom photos yet, show the 4 demo sample images!
  const handleOpenCharacterModalFromMenu = () => {
    setIsCharacterAttached(true);
    const saved = customSlots || loadSavedCustomSlots();
    if (saved && saved.some((s) => Boolean(s.url))) {
      setCharacterSlots(saved);
      setCustomSlots(saved);
    } else {
      setCharacterSlots(SAMPLE_CHARACTER_SLOTS);
    }
    setIsCharacterModalOpen(true);
  };


  // When user clears/detaches character photos from the prompt box strip
  const handleRemoveCharacterFromPrompt = () => {
    setIsCharacterAttached(false);
  };

  // Fetch Fal Config
  useEffect(() => {
    // Check IndexedDB if localStorage was partitioned or unpopulated
    loadSlotsFromIDB().then((idbSlots) => {
      if (idbSlots && idbSlots.some((s) => Boolean(s.url))) {
        setCharacterSlots(idbSlots);
        setCustomSlots(idbSlots);
      }
    });
    // Check IndexedDB for saved custom video gallery list
    loadVideoGalleryFromIDB().then((res) => {
      if (res && res.videos.length > 0) {
        setVideoList(res.videos);
        const sel = res.videos.find((v) => v.id === res.selectedId) || res.videos[0];
        setSelectedVideo(sel);
      } else {
        // Fallback check single video
        loadVideoFromIDB().then((savedVid) => {
          if (savedVid) {
            setVideoList([savedVid]);
            setSelectedVideo(savedVid);
          }
        });
      }
    });
  }, []);

  // Poll job status
  useEffect(() => {
    let interval: any;
    if (currentJob && (currentJob.status === 'IN_QUEUE' || currentJob.status === 'IN_PROGRESS')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/fal/status/${currentJob.jobId}`);
          if (res.ok) {
            const updated = await res.json();
            setCurrentJob(updated);
            if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
              setIsGenerating(false);
            }
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [currentJob]);

  // Smooth scroll down to output video player below prompt bar when completed
  const outputVideoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (currentJob?.status === 'COMPLETED' && currentJob?.resultVideoUrl) {
      setTimeout(() => {
        outputVideoRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 250);
    }
  }, [currentJob?.status, currentJob?.resultVideoUrl]);

// Ultra-reliable Base64 JSON file upload with FileReader + ArrayBuffer fallback
async function uploadVideoToFalStorage(
  blob: Blob,
  fileName: string,
  onProgress?: (pct: number, stepText: string) => void
): Promise<string> {
  const totalMb = blob && blob.size ? (blob.size / (1024 * 1024)).toFixed(1) : '0';
  if (onProgress) onProgress(5, `Preparing video file (${totalMb}MB)...`);

  let dataUrl: string = '';

  // 1. Primary Attempt: FileReader.readAsDataURL
  if (blob instanceof Blob) {
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string' && reader.result.length > 0) {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader returned empty result.'));
          }
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader read error.'));
        reader.readAsDataURL(blob);
      });
    } catch (frErr) {
      console.warn('[PlayVear Labs] FileReader failed, trying ArrayBuffer fallback:', frErr);
    }
  }

  // 2. Secondary Fallback: ArrayBuffer -> Uint8Array -> Base64
  if (!dataUrl && blob && typeof (blob as any).arrayBuffer === 'function') {
    try {
      if (onProgress) onProgress(20, `Converting video buffer (${totalMb}MB)...`);
      const buffer = await (blob as any).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const len = bytes.byteLength;
      const CHUNK = 0x8000;
      for (let i = 0; i < len; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, len)) as any);
      }
      const mime = blob.type || 'video/mp4';
      dataUrl = `data:${mime};base64,${btoa(binary)}`;
    } catch (abErr) {
      console.warn('[PlayVear Labs] ArrayBuffer conversion failed:', abErr);
    }
  }

  if (!dataUrl) {
    throw new Error('ভিডিও ফাইলের মেমোরি পারমিশন এক্সপায়ার হয়েছে। অনুগ্রহ করে "Add Video" মোডাল থেকে ভিডিওটি পুনরায় নির্বাচন করুন।');
  }

  if (onProgress) onProgress(50, `Uploading video to Fal Storage CDN (${totalMb}MB)...`);

  const response = await postJsonViaXHR('/api/fal/storage/upload', {
    dataUrl,
    fileName: fileName || 'input_video.mp4',
    fileType: blob.type || 'video/mp4'
  });

  if (response?.url) {
    if (onProgress) onProgress(100, `Video uploaded to Fal CDN (${totalMb}MB)!`);
    return response.url;
  }

  throw new Error(response?.error || 'Server did not return Fal CDN URL.');
}

// Dynamically inspects exact video duration in seconds (e.g. 4s, 5s, 12s, 30s)
async function getExactVideoDuration(vid: VideoAsset): Promise<number> {
  if (vid.duration && vid.duration !== 10) {
    return vid.duration;
  }
  if (vid.file && vid.file instanceof File) {
    try {
      const dur = await new Promise<number>((resolve) => {
        const tempVid = document.createElement('video');
        const objectUrl = URL.createObjectURL(vid.file as File);
        tempVid.src = objectUrl;
        tempVid.preload = 'metadata';

        let done = false;
        const finish = (d: number) => {
          if (!done) {
            done = true;
            clearTimeout(t);
            URL.revokeObjectURL(objectUrl);
            resolve(d);
          }
        };
        const t = setTimeout(() => finish(vid.duration || 10), 3000);

        tempVid.onloadedmetadata = () => {
          if (tempVid.duration && !isNaN(tempVid.duration) && tempVid.duration > 0 && isFinite(tempVid.duration)) {
            finish(Math.max(1, Math.round(tempVid.duration)));
          }
        };
        tempVid.onerror = () => finish(vid.duration || 10);
      });
      return dur;
    } catch {
      return vid.duration || 10;
    }
  }
  return vid.duration || 10;
}

// Safely retrieves a Blob from a local blob URL using XMLHttpRequest without invoking window.fetch
function readBlobViaXHR(blobUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', blobUrl, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        if (xhr.response && xhr.response.size > 0) {
          resolve(xhr.response);
        } else {
          reject(new Error('Empty blob returned from local URL'));
        }
      } else {
        reject(new Error(`Failed to read blob (status ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Local blob URL could not be read. Please re-select the video file.'));
    xhr.send();
  });
}

// Safe POST JSON request that avoids iframe fetch patching
function postJsonViaXHR<T = any>(url: string, payload: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json);
        } else {
          reject(new Error(json.error || json.details || `Server error (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Server error (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error contacting server. Please check your connection.'));
    xhr.send(JSON.stringify(payload));
  });
}

  const handleStartReplacement = async () => {
    if (!selectedVideo) {
      setIsVideoModalOpen(true);
      return;
    }
    if (characterImages.length === 0) {
      setIsCharacterModalOpen(true);
      return;
    }

    setIsGenerating(true);

    // Immediately display the generation screen so user gets instant visual response
    const primaryPreview = characterImages[0] || '';
    setCurrentJob({
      jobId: `init-${Date.now()}`,
      status: 'IN_PROGRESS',
      progress: 8,
      currentStep: 'Preparing assets and initializing PlayVear AI pipeline...',
      videoUrl: selectedVideo.url,
      characterSheetUrl: primaryPreview,
      createdAt: Date.now(),
      resolution,
      aspectRatio
    });

    try {
      // 1. Ensure target video is uploaded to Fal Storage CDN (must be valid HTTPS URL)
      let resolvedVideoUrl = selectedVideo.url;

      if (!resolvedVideoUrl.startsWith('https://v3b.fal.media/') && (!resolvedVideoUrl.startsWith('https://') || resolvedVideoUrl.startsWith('blob:') || resolvedVideoUrl.includes('localhost'))) {
        let falCdnUrl: string | null = null;

        // 1. Direct upload if pre-converted dataUrl exists
        if (selectedVideo.dataUrl && selectedVideo.dataUrl.startsWith('data:')) {
          setCurrentJob((prev) => (prev ? {
            ...prev,
            progress: 8,
            currentStep: 'Uploading video to Fal Storage CDN...'
          } : null));

          const res = await postJsonViaXHR('/api/fal/storage/upload', {
            dataUrl: selectedVideo.dataUrl,
            fileName: selectedVideo.name || 'input_video.mp4',
            fileType: 'video/mp4'
          });
          if (res?.url) falCdnUrl = res.url;
        }

        // 2. If dataUrl was not pre-converted, resolve Blob and upload
        if (!falCdnUrl) {
          let blobToUpload: Blob | null = null;
          if (selectedVideo.file && (selectedVideo.file as any) instanceof Blob && (selectedVideo.file as any).size > 0) {
            blobToUpload = selectedVideo.file as Blob;
          } else if (resolvedVideoUrl.startsWith('blob:')) {
            try {
              blobToUpload = await readBlobViaXHR(resolvedVideoUrl);
            } catch (e) {
              console.warn('Could not read blob via XHR:', e);
            }
          }

          if (!blobToUpload) {
            setIsVideoModalOpen(true);
            throw new Error('ভিডিও ফাইলটি প্রসেস হতে সময়ের প্রয়োজন। অনুগ্রহ করে "Add Video" ডায়ালগ খুলে ভিডিওটি নির্বাচন করুন।');
          }

          if (blobToUpload.size > 30 * 1024 * 1024) {
            setIsVideoModalOpen(true);
            throw new Error(`ভিডিও ফাইলের সাইজ ${(blobToUpload.size / (1024 * 1024)).toFixed(1)}MB। সরাসরি আপলোডের সর্বোচ্চ লিমিট ৩০MB।`);
          }

          setCurrentJob((prev) => (prev ? {
            ...prev,
            progress: 5,
            currentStep: `Preparing video (${(blobToUpload.size / (1024 * 1024)).toFixed(1)}MB)...`
          } : null));

          falCdnUrl = await uploadVideoToFalStorage(
            blobToUpload,
            selectedVideo.name || 'input_video.mp4',
            (pct, stepText) => {
              setCurrentJob((prev) => (prev ? {
                ...prev,
                progress: 5 + Math.round(pct * 0.15),
                currentStep: stepText
              } : null));
            }
          );
        }

        if (falCdnUrl) {
          resolvedVideoUrl = falCdnUrl;
          setSelectedVideo((prev) => (prev ? { ...prev, url: resolvedVideoUrl } : null));
        } else {
          throw new Error('Fal CDN upload failed without returning URL.');
        }
      }

      // 2. Character reference images are processed on server directly
      setCurrentJob((prev) => (prev ? {
        ...prev,
        progress: 22,
        currentStep: 'Submitting request to PlayVear AI engine...'
      } : null));

      const primaryImage = characterImages[0];
      const additionalImages = characterImages.slice(1, 4); // Max 3 items (@Image2, @Image3, @Image4)
      const exactDuration = await getExactVideoDuration(selectedVideo);
      const clipDuration = Math.max(3, Math.min(30, Math.round(exactDuration)));

      const jobData = await postJsonViaXHR('/api/fal/character-replace', {
        videoUrl: resolvedVideoUrl,
        startImageUrl: primaryImage,
        characterSheetUrl: primaryImage,
        middleImageUrls: additionalImages,
        prompt,
        duration: clipDuration,
        resolution,
        aspectRatio,
        endpoint: 'kling/v4/video-to-video/edit'
      });

      setCurrentJob({
        jobId: jobData.jobId,
        status: jobData.status || 'IN_PROGRESS',
        progress: 25,
        currentStep: 'Queued with PlayVear AI. Synthesizing choreography and face replacement...',
        videoUrl: resolvedVideoUrl,
        characterSheetUrl: primaryImage,
        createdAt: Date.now(),
        resolution,
        aspectRatio,
        isDemo: jobData.isDemo
      });
    } catch (error: any) {
      console.error('Generation startup error:', error);
      setCurrentJob((prev) => ({
        jobId: prev?.jobId || `err-${Date.now()}`,
        status: 'FAILED',
        progress: 0,
        currentStep: 'Generation failed to start',
        error: error.message || 'Error occurred while starting PlayVear AI generation',
        videoUrl: selectedVideo?.url || '',
        characterSheetUrl: primaryPreview,
        createdAt: Date.now(),
        resolution,
        aspectRatio
      }));
      setIsGenerating(false);
    }
  };

  const handleNewChat = () => {
    setCurrentJob(null);
    setIsGenerating(false);
  };

  const canGenerate = Boolean(selectedVideo && characterImages.length > 0 && prompt.trim());

  return (
    <div className="h-[100dvh] bg-[#060911] text-slate-100 flex font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Main Screen Area: Prompt Box at Bottom, Empty Screen on Top until Generation */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-[#060911]">
        {/* Minimal ChatGPT Header with Neon Cyan Border */}
        <header className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 flex-shrink-0 border-b border-cyan-500/20 bg-[#070a14]/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {/* Model Selector Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-cyan-950/60 cursor-pointer text-sm font-semibold text-white transition-colors">
              <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent font-bold">
                PlayVear AI Studio
              </span>
              <ChevronDown className="w-4 h-4 text-cyan-400/80" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="p-2 rounded-lg hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title="New Chat"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Container: Top Area + Prompt Bar + Generated Output Video Player below Prompt Bar */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 flex flex-col">
          {/* Upper Viewport: EMPTY when idle; Shows generation status / error card while active */}
          <main className="flex-1 flex flex-col justify-end px-3 sm:px-6 py-4 max-w-3xl mx-auto w-full min-h-[45vh] sm:min-h-[55vh]">
            {!currentJob ? (
              <div className="flex-1" />
            ) : (
              <div className="w-full my-auto py-4 space-y-4 animate-in fade-in duration-300">
                {/* User Prompt Turn */}
                <div className="flex justify-end">
                  <div className="max-w-xl bg-[#090e1c] border border-cyan-500/30 rounded-[22px] rounded-br-sm px-4 py-2.5 text-sm text-slate-100 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                    {prompt}
                  </div>
                </div>

                {/* ChatGPT-style Video Generation Status Card */}
                {isGenerating && currentJob.status !== 'COMPLETED' ? (
                  <div className="w-full bg-[#080d1a] border border-cyan-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_0_35px_rgba(0,240,255,0.2)] overflow-hidden relative">
                    <div className="aspect-video w-full rounded-xl sm:rounded-2xl bg-[#050812] border border-cyan-500/25 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                      <div className="relative mb-4">
                        <div className="w-14 h-14 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.4)] animate-pulse">
                          <Sparkles className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping opacity-30" />
                      </div>

                      <span className="text-sm sm:text-base font-bold text-white tracking-wide mb-1">
                        Creating video with PlayVear AI
                      </span>

                      <span className="text-xs text-slate-400 max-w-sm font-sans mb-5 leading-relaxed">
                        {currentJob.currentStep || 'Synthesizing choreography, actor replacement & lighting...'}
                      </span>

                      <div className="w-full max-w-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                            Rendering frames
                          </span>
                          <span className="font-bold text-cyan-300 tabular-nums">
                            {currentJob.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/20">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(0,240,255,0.8)]"
                            style={{ width: `${currentJob.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Failure / Error Card */}
                {currentJob.status === 'FAILED' ? (
                  <div className="w-full bg-[#14080e] border border-red-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_0_35px_rgba(255,0,50,0.25)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        Generation Failed
                      </span>
                      <button
                        onClick={handleStartReplacement}
                        className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                    <p className="text-xs text-red-200/90 font-mono bg-red-950/40 p-3 rounded-xl border border-red-500/20 break-words leading-relaxed">
                      {currentJob.error || 'An unexpected error occurred while processing PlayVear AI generation.'}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </main>

          {/* Prompt Box */}
          <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-2 bg-[#060911]">
            <ChatGptPromptBar
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={handleStartReplacement}
              isGenerating={isGenerating}
              canGenerate={canGenerate}
              video={selectedVideo}
              onOpenVideoModal={() => setIsVideoModalOpen(true)}
              onRemoveVideo={() => {
                setSelectedVideo(null);
                clearVideoFromIDB();
              }}
              characterSlots={isCharacterAttached ? characterSlots : []}
              onOpenCharacterModal={handleOpenCharacterModalFromMenu}
              onRemoveCharacter={handleRemoveCharacterFromPrompt}
              resolution={resolution}
              onResolutionChange={setResolution}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
            />
          </div>

          {/* Generated Video Player Output Section BELOW the Prompt Box */}
          {currentJob?.status === 'COMPLETED' && currentJob?.resultVideoUrl ? (
            <div ref={outputVideoRef} className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6 scroll-mt-6 animate-in slide-in-from-bottom-6 duration-300">
              <CleanOutputPlayer
                resultVideoUrl={currentJob.resultVideoUrl}
                resultFile={currentJob.resultFile}
                onReset={handleNewChat}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Character Modal (Opens from '+' button -> 'Add Image': 9 9:16 vertical photos with 1-click replace and full preview) */}
      <CharacterModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        slots={characterSlots}
        onSlotsChange={handleSlotsChange}
      />

      {/* Video Modal (Opens from '+' button -> 'Add Video') */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        selectedVideo={selectedVideo}
        onSelectVideo={setSelectedVideo}
        videoList={videoList}
        onVideoListChange={setVideoList}
      />
    </div>
  );
}
