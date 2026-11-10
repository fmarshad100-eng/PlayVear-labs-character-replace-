import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fal } from '@fal-ai/client';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Raw body parsers MUST be mounted BEFORE json/urlencoded for binary stream & chunk routes
app.use('/api/fal/storage/chunk', express.raw({ type: '*/*', limit: '15mb' }));
app.use('/api/fal/storage/upload-binary', express.raw({ type: '*/*', limit: '250mb' }));

// High limit for base64 audio/video/image payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// In-memory runtime key cache & job storage
let runtimeFalKey = process.env.FAL_KEY || '';
const jobsStore = new Map<string, any>();

function getActiveFalKey(): string {
  return runtimeFalKey || process.env.FAL_KEY || '';
}

function syncFalConfig() {
  const key = getActiveFalKey();
  if (key && key.trim().length > 5) {
    fal.config({
      credentials: key.trim(),
    });
  }
}

// Initial sync
syncFalConfig();

// 1. Get Fal.ai API Configuration Status
app.get('/api/fal/config', (_req: Request, res: Response) => {
  const activeKey = getActiveFalKey();
  const isConfigured = Boolean(activeKey && activeKey.trim().length > 5);
  
  res.json({
    isConfigured,
    maskedKey: isConfigured ? `${activeKey.slice(0, 4)}••••••••${activeKey.slice(-4)}` : null,
    defaultEndpoint: 'kling/v4/video-to-video/edit',
    availablePipelines: [
      {
        id: 'kling/v4/video-to-video/edit',
        name: 'Kling 4.0 Video-to-Video Edit (Exact Match)',
        description: 'Kling 4.0 edits an input video using text instructions (@Video1) and image references (@Image1).'
      },
      {
        id: 'fal-ai/kling-video/v3/standard/motion-control',
        name: 'Kling Motion Control Video-to-Video',
        description: 'Transfers actor choreography, dance motion, and camera angles from song video onto the new character.'
      },
      {
        id: 'ai-face-swap/faceswapvideo',
        name: 'AI Video Face Swap Pro',
        description: 'Frame-by-frame facial identity replacement keeping actor body, song lyrics & lighting 100% intact.'
      },
      {
        id: 'kling/v4/image-to-video',
        name: 'Kling 4.0 Image to Video (Master 1080p)',
        description: 'Animates starting/ending frames into full 1080p video sequence.'
      }
    ]
  });
});

// 2. Set/Update Session API Key
app.post('/api/fal/config', (req: Request, res: Response) => {
  const { falKey } = req.body;
  if (typeof falKey === 'string' && falKey.trim().length > 5) {
    runtimeFalKey = falKey.trim();
    syncFalConfig();
    res.json({ success: true, message: 'Fal.ai API key updated for current session.' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid API key provided.' });
  }
});

// 2.5 Quick test endpoint running user's exact snippet
app.post('/api/fal/test-subscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint = 'fal-ai/flux/dev', prompt = 'a red fox in the snow' } = req.body;
    const activeKey = getActiveFalKey();
    if (!activeKey) {
      return res.status(401).json({ error: 'FAL_KEY is not configured yet.' });
    }
    syncFalConfig();

    const result: any = await fal.subscribe(endpoint, {
      input: { prompt }
    });

    const imageUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url;
    res.json({ success: true, imageUrl, result });
  } catch (error: any) {
    console.error('Fal test-subscribe error:', error);
    res.status(500).json({ error: error.message || 'Fal subscribe failed' });
  }
});

// 2.6 Fal.ai Asynchronous Webhook Receiver
app.post('/api/fal/webhook', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('[PlayVear Labs] Webhook received from Fal.ai:', payload?.request_id, payload?.status);
    const requestId = payload?.request_id;
    if (requestId) {
      for (const [_jobId, jobRecord] of jobsStore.entries()) {
        if (jobRecord.realFalRequestId === requestId) {
          if (payload.status === 'OK' || payload.status === 'COMPLETED') {
            jobRecord.status = 'COMPLETED';
            jobRecord.progress = 100;
            jobRecord.resultVideoUrl =
              payload.payload?.video?.url ||
              payload.payload?.output?.url ||
              payload.payload?.output_video?.url;
            jobRecord.currentStep = 'Render complete via Webhook!';
          } else if (payload.status === 'ERROR') {
            jobRecord.status = 'FAILED';
            jobRecord.error = payload.error || 'Webhook reported failure';
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Error handling webhook:', err);
    res.sendStatus(200);
  }
});

// Helper: Upload base64 data or local files to Fal Storage
async function uploadToFalStorage(dataUrl: string, defaultName: string = 'file.jpg'): Promise<string> {
  if (!dataUrl) return dataUrl;
  if (dataUrl.startsWith('https://v3b.fal.media/') || (dataUrl.startsWith('https://') && !dataUrl.includes('localhost'))) {
    return dataUrl;
  }
  if (dataUrl.startsWith('data:')) {
    try {
      const base64Part = dataUrl.split(',')[1];
      const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
      const buffer = Buffer.from(base64Part, 'base64');
      const file = new File([new Uint8Array(buffer)], defaultName, { type: mimeType });
      const falUrl = await fal.storage.upload(file);
      console.log(`[PlayVear Labs] Uploaded base64 ${defaultName} to Fal Storage:`, falUrl);
      return falUrl;
    } catch (err) {
      console.warn(`Failed to upload ${defaultName} to Fal storage:`, err);
      return dataUrl;
    }
  }
  // If it's a local file path (e.g. /assets/... or src/assets/...)
  try {
    const cleanPath = dataUrl.replace(/^\/@fs/, '').split('?')[0];
    if (cleanPath.startsWith('/')) {
      const possiblePaths = [
        path.join(process.cwd(), cleanPath),
        path.join(process.cwd(), 'public', cleanPath),
        path.join(process.cwd(), 'src', cleanPath.replace(/^\/src\//, ''))
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const buffer = fs.readFileSync(p);
          const mime = p.endsWith('.png') ? 'image/png' : p.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          const file = new File([new Uint8Array(buffer)], defaultName, { type: mime });
          const url = await fal.storage.upload(file);
          console.log(`[PlayVear Labs] Uploaded local asset ${p} to Fal storage:`, url);
          return url;
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to resolve and upload local path ${dataUrl} to Fal storage:`, e);
  }
  return dataUrl;
}

// 2.7 Direct Fal Storage Upload API (fal.storage.upload with JSON base64)
app.post('/api/fal/storage/upload', async (req: Request, res: Response) => {
  try {
    const { dataUrl, fileName = 'upload.mp4', fileType = 'video/mp4' } = req.body;
    const activeKey = getActiveFalKey();
    if (!activeKey) {
      return res.status(401).json({ error: 'FAL_KEY is not configured.' });
    }
    syncFalConfig();

    if (!dataUrl) {
      return res.status(400).json({ error: 'Missing dataUrl payload.' });
    }

    let buffer: Buffer;
    let mime = fileType;
    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      mime = parts[0].split(';')[0].split(':')[1] || fileType;
      buffer = Buffer.from(parts[1], 'base64');
    } else {
      buffer = Buffer.from(dataUrl, 'base64');
    }

    // Standard @fal-ai/client file upload protocol
    const file = new File([new Uint8Array(buffer)], fileName, { type: mime });
    const url = await fal.storage.upload(file);
    console.log(`[PlayVear Labs] Successfully uploaded ${fileName} to Fal Storage:`, url);

    res.json({ success: true, url, fileName });
  } catch (err: any) {
    console.error('Fal storage upload error:', err);
    res.status(500).json({ error: err.message || 'Fal storage upload failed.' });
  }
});

// 2.8 Direct Fal Storage Binary Upload API (fal.storage.upload with raw stream/binary)
app.post(
  '/api/fal/storage/upload-binary',
  express.raw({ type: '*/*', limit: '250mb' }),
  async (req: Request, res: Response) => {
    try {
      const activeKey = getActiveFalKey();
      if (!activeKey) {
        return res.status(401).json({ error: 'FAL_KEY is not configured in settings.' });
      }
      syncFalConfig();

      const fileName = (req.query.fileName as string) || `upload_${Date.now()}.mp4`;
      const mimeType = (req.query.contentType as string) || (req.headers['content-type'] as string) || 'video/mp4';
      let buffer: Buffer;
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (typeof req.body === 'string') {
        buffer = Buffer.from(req.body);
      } else if (req.body && typeof req.body === 'object') {
        buffer = Buffer.from(JSON.stringify(req.body));
      } else {
        return res.status(400).json({ error: 'Payload is not a valid binary buffer.' });
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: 'Empty binary payload.' });
      }

      // Standard @fal-ai/client file upload protocol
      const file = new File([new Uint8Array(buffer)], fileName, { type: mimeType });
      const url = await fal.storage.upload(file);
      console.log(`[PlayVear Labs] Successfully uploaded binary ${fileName} (${buffer.length} bytes) to Fal Storage:`, url);

      res.json({ success: true, url, fileName });
    } catch (err: any) {
      console.error('Fal storage binary upload error:', err);
      res.status(500).json({ error: err.message || 'Fal storage binary upload failed.' });
    }
  }
);

// 2.9 Chunked Fal Storage Upload API (bypasses Cloud Run 32MB single request limits)
const CHUNK_TEMP_DIR = path.join('/tmp', 'fal_upload_chunks');
if (!fs.existsSync(CHUNK_TEMP_DIR)) {
  fs.mkdirSync(CHUNK_TEMP_DIR, { recursive: true });
}

app.post(
  '/api/fal/storage/chunk',
  express.raw({ type: '*/*', limit: '10mb' }),
  async (req: Request, res: Response) => {
    try {
      const activeKey = getActiveFalKey();
      if (!activeKey) {
        return res.status(401).json({ error: 'FAL_KEY is not configured in settings.' });
      }
      syncFalConfig();

      const uploadId = (req.query.uploadId as string) || `up_${Date.now()}`;
      const chunkIndex = parseInt((req.query.chunkIndex as string) || '0', 10);
      const totalChunks = parseInt((req.query.totalChunks as string) || '1', 10);
      const fileName = (req.query.fileName as string) || 'video.mp4';
      const contentType = (req.query.contentType as string) || 'video/mp4';

      let buffer: Buffer;
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (typeof req.body === 'string') {
        buffer = Buffer.from(req.body);
      } else if (req.body && typeof req.body === 'object') {
        buffer = Buffer.from(JSON.stringify(req.body));
      } else {
        return res.status(400).json({ error: 'Payload is not a valid binary buffer.' });
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: 'Empty chunk payload.' });
      }

      // Safe session directory for this chunked upload
      const safeId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
      const sessionDir = path.join(CHUNK_TEMP_DIR, safeId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Save chunk
      const chunkPath = path.join(sessionDir, `chunk_${chunkIndex}`);
      fs.writeFileSync(chunkPath, buffer);

      // If more chunks remain, return intermediate success
      if (chunkIndex < totalChunks - 1) {
        return res.json({ success: true, chunkIndex, totalChunks, isComplete: false });
      }

      // Final chunk arrived: reassemble all chunks in memory
      console.log(`[PlayVear Labs] All ${totalChunks} chunks received for ${uploadId}. Assembling...`);
      const chunkBuffers: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const p = path.join(sessionDir, `chunk_${i}`);
        if (!fs.existsSync(p)) {
          return res.status(400).json({ error: `Missing chunk ${i} during reassembly.` });
        }
        chunkBuffers.push(fs.readFileSync(p));
      }

      const fullBuffer = Buffer.concat(chunkBuffers);
      console.log(`[PlayVear Labs] Reassembled video ${fileName}: ${(fullBuffer.length / (1024 * 1024)).toFixed(2)} MB. Uploading to Fal Storage CDN...`);

      const file = new File([new Uint8Array(fullBuffer)], fileName, { type: contentType });
      const url = await fal.storage.upload(file);
      console.log(`[PlayVear Labs] Successfully uploaded assembled video to Fal Storage CDN:`, url);

      // Clean up temporary chunk files
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (cleanErr) {
        console.warn('Failed to clean up chunk dir:', cleanErr);
      }

      return res.json({ success: true, url, fileName, isComplete: true });
    } catch (err: any) {
      console.error('Fal storage chunk upload error:', err);
      res.status(500).json({ error: err.message || 'Fal storage chunk upload failed.' });
    }
  }
);

// 3. Initiate Video-to-Video / Character Replacement Job
app.post('/api/fal/character-replace', async (req: Request, res: Response) => {
  try {
    const {
      videoUrl,
      startImageUrl,
      characterSheetUrl,
      middleImageUrls = [],
      endImageUrl,
      prompt,
      duration,
      resolution = '720p',
      aspectRatio,
      elements,
      videoUrls = [],
      voiceIds = [],
      endpoint = 'kling/v4/video-to-video/edit'
    } = req.body;

    const activeKey = getActiveFalKey();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If real FAL_KEY is available, use @fal-ai/client
    if (activeKey && activeKey.trim().length > 8) {
      syncFalConfig();

      try {
        // Upload images to Fal Storage if base64
        const primaryStart = await uploadToFalStorage(
          startImageUrl || characterSheetUrl,
          'character_image.jpg'
        );
        const primaryEnd = endImageUrl
          ? await uploadToFalStorage(endImageUrl, 'end_frame.jpg')
          : undefined;

        const uploadedMiddle: string[] = [];
        if (Array.isArray(middleImageUrls) && middleImageUrls.length > 0) {
          for (let i = 0; i < Math.min(10, middleImageUrls.length); i++) {
            const uploaded = await uploadToFalStorage(middleImageUrls[i], `middle_${i}.jpg`);
            if (uploaded) uploadedMiddle.push(uploaded);
          }
        }

        // Upload target video to Fal Storage or ensure valid https URL
        let uploadedVideo = videoUrl;
        if (videoUrl && videoUrl.startsWith('data:')) {
          uploadedVideo = await uploadToFalStorage(videoUrl, 'input_video.mp4');
        } else if (videoUrl && videoUrl.startsWith('/')) {
          try {
            const localFilePath = path.join(process.cwd(), 'public', videoUrl);
            if (fs.existsSync(localFilePath)) {
              const buffer = fs.readFileSync(localFilePath);
              const mime = videoUrl.endsWith('.webm') ? 'video/webm' : 'video/mp4';
              const file = new File([new Uint8Array(buffer)], path.basename(videoUrl), { type: mime });
              uploadedVideo = await fal.storage.upload(file);
              console.log('[PlayVear Labs] Successfully uploaded local sample video to Fal Storage:', uploadedVideo);
            } else {
              const host = req.headers.host || 'localhost:3000';
              const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
              uploadedVideo = `${protocol}://${host}${videoUrl}`;
            }
          } catch (err) {
            console.warn('[PlayVear Labs] Failed to upload local video file to Fal storage:', err);
          }
        } else if (videoUrl && videoUrl.startsWith('http://') && !videoUrl.includes('localhost')) {
          uploadedVideo = videoUrl.replace('http://', 'https://');
        }

        // Strict validation: video_url MUST be a valid public HTTPS URL or Data URI (no blob: URLs allowed)
        if (!uploadedVideo || uploadedVideo.startsWith('blob:') || (!uploadedVideo.startsWith('https://') && !uploadedVideo.startsWith('data:'))) {
          return res.status(400).json({
            error: `Invalid video URL: Kling 4.0 requires a valid public HTTPS URL (hosted on Fal Storage CDN). Received: ${uploadedVideo ? uploadedVideo.substring(0, 40) : 'empty'}`
          });
        }

        let inputPayload: Record<string, any>;

        // Target: Kling 4.0 Video-to-Video Edit (kling/v4/video-to-video/edit)
        if (endpoint === 'kling/v4/video-to-video/edit') {
          const allImages = [primaryStart, ...uploadedMiddle].filter(Boolean);

          let editPrompt = (prompt || '').trim();
          if (!editPrompt || (!editPrompt.toLowerCase().includes('@video1') && !editPrompt.includes('@Video1'))) {
            const imageRefText = allImages.length > 1 ? `@Image1 to @Image${allImages.length}` : '@Image1';
            editPrompt = `In @Video1, replace the lead actor with the character from ${imageRefText}, maintaining identical dance choreography, stage lighting, and camera motion. ${editPrompt}`.trim();
          }
          // Exact casing normalization to match schema specification: @Video1, @Image1, @Element1, @Voice1
          editPrompt = editPrompt
            .replace(/@video([0-9]+)\b/gi, (_match: string, num: string) => `@Video${num}`)
            .replace(/@image([0-9]+)\b/gi, (_match: string, num: string) => `@Image${num}`)
            .replace(/@element([0-9]+)\b/gi, (_match: string, num: string) => `@Element${num}`)
            .replace(/@voice([0-9]+)\b/gi, (_match: string, num: string) => `@Voice${num}`);

          // Construct elements (KlingV4Element) strictly respecting reference_image_urls max 3 items
          let preparedElements: any = undefined;
          if (Array.isArray(elements) && elements.length > 0) {
            preparedElements = elements.map((el: any) => ({
              frontal_image_url: el.frontal_image_url,
              reference_image_urls: Array.isArray(el.reference_image_urls) ? el.reference_image_urls.slice(0, 3) : undefined,
              voice_id: el.voice_id || undefined
            }));
          } else if (primaryStart && uploadedMiddle.length > 0) {
            preparedElements = [
              {
                frontal_image_url: primaryStart,
                reference_image_urls: uploadedMiddle.slice(0, 3), // Kling 4.0 schema limit: max 3 items
                voice_id: voiceIds?.[0] || undefined
              }
            ];
          }

          // Build clean payload without null or undefined properties
          const cleanEditPayload: Record<string, any> = {
            prompt: editPrompt,
            video_url: uploadedVideo,
          };

          if (allImages.length > 0) {
            cleanEditPayload.image_urls = allImages.slice(0, 4);
          }
          if (duration) {
            cleanEditPayload.duration = Math.min(30, Math.max(3, Math.round(Number(duration))));
          }
          if (resolution) {
            cleanEditPayload.resolution = resolution === '1080p' ? '1080p' : '720p';
          }
          if (aspectRatio && aspectRatio !== 'auto') {
            cleanEditPayload.aspect_ratio = aspectRatio;
          }
          if (preparedElements && preparedElements.length > 0) {
            cleanEditPayload.elements = preparedElements;
          }

          inputPayload = cleanEditPayload;
        } else if (endpoint.includes('motion-control')) {
          // Kling Video-to-Video Motion Control
          inputPayload = {
            video_url: uploadedVideo,
            image_url: primaryStart,
            character_orientation: 'video',
            prompt:
              prompt ||
              'Replace video character with reference image, maintaining identical choreography, dance moves, and stage lighting'
          };
        } else if (endpoint.includes('faceswapvideo') || endpoint.includes('face-swap')) {
          // AI Video Face Swap Pro
          inputPayload = {
            video_url: uploadedVideo,
            base_image_url: primaryStart,
            swap_image_url: primaryStart,
            image_url: primaryStart
          };
        } else {
          // Kling 4.0 Image to Video
          inputPayload = {
            prompt:
              prompt ||
              'Replace lead actor with reference character, cinematic dance choreography, synchronized stage lighting, photorealistic 8k',
            start_image_url: primaryStart,
            duration: duration ? Math.min(30, Math.max(3, Math.round(Number(duration)))) : 5,
            resolution: resolution === '720p' ? '720p' : '1080p'
          };
          if (primaryEnd) inputPayload.end_image_url = primaryEnd;
          if (uploadedMiddle.length > 0) inputPayload.middle_image_urls = uploadedMiddle;
        }

        console.log(`[PlayVear Labs] Submitting to ${endpoint}:`, {
          endpoint,
          video_url: inputPayload.video_url,
          image_urls_count: inputPayload.image_urls?.length || 0,
          promptSnippet: inputPayload.prompt?.substring(0, 80)
        });

        // Submit via official fal.queue.submit with clean payload
        const submitOptions: any = {
          input: inputPayload
        };

        const appUrl = process.env.APP_URL;
        // Avoid 302 redirects from internal Cloud Run preview auth proxy
        if (appUrl && appUrl.startsWith('https://') && !appUrl.includes('localhost') && !appUrl.includes('.run.app')) {
          submitOptions.webhookUrl = `${appUrl}/api/fal/webhook`;
        }

        const { request_id } = await fal.queue.submit(endpoint, submitOptions);

        console.log(`[PlayVear Labs] fal.queue.submit success. Request ID:`, request_id);

        const jobRecord: any = {
          jobId,
          realFalRequestId: request_id,
          endpoint,
          createdAt: Date.now(),
          status: 'IN_QUEUE',
          progress: 15,
          currentStep: `Queued with PlayVear AI (${request_id.slice(0, 8)})...`,
          videoUrl: uploadedVideo,
          characterSheetUrl: primaryStart
        };
        jobsStore.set(jobId, jobRecord);

        return res.json({
          jobId,
          requestId: request_id,
          status: 'IN_QUEUE',
          isLiveCloud: true
        });
      } catch (sdkErr: any) {
        console.error('Fal.ai SDK submission error:', sdkErr);
        return res.status(502).json({
          error: 'Fal.ai SDK submission failed',
          details: sdkErr.message || String(sdkErr)
        });
      }
    }

    // Interactive Demo / Studio Simulator mode (when FAL_KEY is not yet entered)
    jobsStore.set(jobId, {
      jobId,
      createdAt: Date.now(),
      status: 'IN_PROGRESS',
      progress: 15,
      currentStep: 'Analyzing source video choreography & actor tracking...',
      videoUrl,
      characterSheetUrl,
      isDemo: true,
      endpoint
    });

    return res.json({
      jobId,
      status: 'IN_PROGRESS',
      isDemo: true,
      message: 'Running in Studio Preview Mode. Add FAL_KEY in Secrets for live GPU compute.'
    });
  } catch (error: any) {
    console.error('Error starting character replace job:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4. Poll Job Status using @fal-ai/client queue status
app.get('/api/fal/status/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobsStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const activeKey = getActiveFalKey();

  // If real Fal.ai job with @fal-ai/client SDK
  if (job.realFalRequestId && activeKey) {
    syncFalConfig();
    try {
      const statusData = await fal.queue.status(job.endpoint, {
        requestId: job.realFalRequestId,
        logs: true
      });

      if (statusData.status === 'COMPLETED') {
        const resultData: any = await fal.queue.result(job.endpoint, {
          requestId: job.realFalRequestId
        });

        // Handle exact Kling 4.0 output schema: { video: { url, file_size, content_type, file_name } }
        const videoObj = resultData.data?.video || resultData.video;
        const videoOutputUrl =
          videoObj?.url ||
          resultData.data?.output?.url ||
          resultData.output?.url ||
          resultData.data?.output_video?.url;

        job.status = 'COMPLETED';
        job.progress = 100;
        job.resultVideoUrl = videoOutputUrl || job.videoUrl;
        if (videoObj && typeof videoObj === 'object') {
          job.resultFile = {
            url: videoObj.url,
            file_name: videoObj.file_name || 'output.mp4',
            file_size: videoObj.file_size || 0,
            content_type: videoObj.content_type || 'video/mp4'
          };
        }
        return res.json(job);
      }

      job.status = statusData.status;
      job.progress = (statusData as any).progress
        ? Math.round((statusData as any).progress * 100)
        : 65;
      job.currentStep = `PlayVear AI Video rendering (${job.progress}%)...`;
      return res.json(job);
    } catch (e: any) {
      console.warn('Fal SDK status poll fallback:', e.message);
    }
  }

  // Demo simulator progression
  if (job.isDemo) {
    const elapsed = (Date.now() - job.createdAt) / 1000;
    if (elapsed < 3) {
      job.progress = 25;
      job.currentStep = 'Tracking @video1 actor movement & body orientation...';
    } else if (elapsed < 6) {
      job.progress = 60;
      job.currentStep = 'Replacing character with @image1 via PlayVear AI latent edit...';
    } else if (elapsed < 9) {
      job.progress = 88;
      job.currentStep = 'Blending 1080p stage lighting, facial identity & audio sync...';
    } else {
      job.progress = 100;
      job.status = 'COMPLETED';
      job.currentStep = 'PlayVear AI Video Edit complete!';
      job.resultVideoUrl = job.videoUrl;
    }
  }

  res.json(job);
});

// 4.5 Direct fal.queue.status check by Fal requestId
app.get('/api/fal/queue-status/:requestId', async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const endpoint = (req.query.endpoint as string) || 'kling/v4/video-to-video/edit';
  const activeKey = getActiveFalKey();

  if (!activeKey) {
    return res.status(401).json({ error: 'FAL_KEY is not configured' });
  }

  syncFalConfig();

  try {
    const status = await fal.queue.status(endpoint, {
      requestId,
      logs: true
    });

    let result = null;
    if (status.status === 'COMPLETED') {
      result = await fal.queue.result(endpoint, {
        requestId
      });
    }

    res.json({ success: true, status, result });
  } catch (err: any) {
    console.error('Direct queue status check failed:', err);
    res.status(500).json({ error: err.message || 'Status check failed' });
  }
});

// 4.6 Direct fal.queue.result fetch by Fal requestId
app.get('/api/fal/queue-result/:requestId', async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const endpoint = (req.query.endpoint as string) || 'kling/v4/video-to-video/edit';
  const activeKey = getActiveFalKey();

  if (!activeKey) {
    return res.status(401).json({ error: 'FAL_KEY is not configured' });
  }

  syncFalConfig();

  try {
    const result: any = await fal.queue.result(endpoint, {
      requestId
    });

    console.log('[PlayVear Labs] Direct fal.queue.result data:', result.data);
    console.log('[PlayVear Labs] Direct fal.queue.result requestId:', result.requestId);

    const videoUrl =
      result.data?.video?.url ||
      result.video?.url ||
      result.data?.output?.url ||
      result.output?.url;

    res.json({
      success: true,
      data: result.data,
      requestId: result.requestId,
      videoUrl
    });
  } catch (err: any) {
    console.error('Direct queue result fetch failed:', err);
    res.status(500).json({ error: err.message || 'Result fetch failed' });
  }
});

// 4.7 Direct In-App Video Download Proxy (forces direct MP4 download without redirecting to fal.ai)
app.get('/api/fal/download', async (req: Request, res: Response) => {
  try {
    const videoUrl = req.query.url as string;
    const downloadName = (req.query.name as string) || `playvear_kling_video_${Date.now()}.mp4`;

    if (!videoUrl || (!videoUrl.startsWith('https://') && !videoUrl.startsWith('http://'))) {
      return res.status(400).json({ error: 'Valid HTTPS video URL is required.' });
    }

    console.log(`[PlayVear Labs] Streaming direct in-app video download:`, videoUrl);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to stream video from storage CDN.' });
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (err: any) {
    console.error('Direct download proxy error:', err);
    res.status(500).json({ error: err.message || 'Direct video download failed.' });
  }
});

// Vite middleware mounting for development vs production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: Number(PORT) },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[PlayVear Labs] Server running with Kling 4.0 Video-to-Video Edit on http://0.0.0.0:${PORT}`);
  });
}

startServer();
