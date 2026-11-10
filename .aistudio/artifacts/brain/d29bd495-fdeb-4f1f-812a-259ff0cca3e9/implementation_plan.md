# PlayVear Labs — Character Replace

An AI-powered video character replacement studio tailored for commercial video editors and creators in Bangladesh, enabling seamless character/face replacement in music videos (e.g. replacing a Bollywood/pop lead actor like Shah Rukh Khan with a client's custom face and character sheet) while preserving the original video motion, choreography, lighting, and audio.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following core product and architectural decisions were confirmed:
> - **Primary AI Pipeline**: Kling Video / Fal.ai workflow utilizing video-to-video / image-to-video with character reference sheet inputs (`fal-ai/kling-video/v1.5/pro` or motion transfer/face-swap pipeline on Fal.ai).
> - **API Key & Environment**: Configured via AI Studio user secrets as `FAL_KEY` and proxied through a secure Express backend (`/api/kling/*`) to ensure the user's secret key is never exposed to the browser.
> - **Character Sheet Uploads**: Dual-mode upload supporting both a single consolidated character sheet composite image and multiple individual angle photos (Front, 45° Angle, Profile, Expression).
> - **Video Processing Scope**: Built-in 10-second video trimmer and segment selector for optimal processing speed, cinematic fidelity, and cost efficiency.
> - **Visual Aesthetics & Palette**: High-end certificate-style clean frame, deep dark theme (`#080c14`), 80% Neon Cyan (`#00f0ff` / `#06b6d4`) structural lines and layout accents, and 20% Neon Magenta (`#ff007f`) action accents.
> - **Interface Language**: 100% English interface with ultra-clean, minimal text and no unnecessary clutter.

---

### 1. Overview & Core Concept

- **What It Does**: Allows users to upload a target music video clip, define an up-to-10-second highlight section, upload a client's character sheet or multi-angle photos, and submit a character replacement request to the Kling AI / Fal.ai engine. The result preserves the original background, camera motion, and soundtrack while seamlessly replacing the lead character.
- **Target Audience**: Video production studios, wedding/commercial video creators, digital agencies, and fans in Bangladesh creating personalized star-studded music videos and promotional reels.
- **Key Value**: Replaces complex manual VFX rotoscoping and 3D modeling with a simple 3-step certificate interface that delivers production-grade character swap videos in minutes.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Zero State / Studio Entry**:
   - The user arrives at an ultra-sleek, dark workspace centered around a certificate-inspired bordered studio canvas labeled **"PlayVear Labs — Character Replace"**.
   - Two balanced, minimalist upload portals with glowing neon plus (`+`) icons:
     - **Left Portal: Add Video** (Drag & drop target music video MP4/MOV, or pick from curated Bollywood/pop test sample clips).
     - **Right Portal: Add Character Sheet** (Toggle between "Composite Sheet" or "Angle Photos" [Front, 45° Left, 45° Right, Smile/Expression]).
2. **Video Clip Inspection & Trimming**:
   - Once a video is loaded, an integrated timeline trimmer activates with dual neon handles to select any 1 to 10-second window.
   - Live video preview with play/pause, timecode indicator (`00:00.00 / 00:10.00`), and frame capture.
3. **Character Alignment & Settings**:
   - Character photos preview with face-detection highlight rings and angle tags.
   - Clean prompt bar with smart auto-generated prompt (e.g. *"Replace lead male actor with reference character, retain lighting, dynamic dance motion, and original background"*).
   - Optional advanced dropdown for motion intensity and custom Fal.ai model endpoint override.
4. **Processing & Real-Time Tracking**:
   - Single prominent action button: **"Replace Character"** (Neon magenta glow).
   - Minimalist certificate status window displaying real-time Fal.ai queue position, percentage progress bar, and phase indicators (*Uploading assets -> Analyzing video frames -> Inpainting character -> Finalizing render*).
5. **Interactive Result Studio**:
   - Side-by-side or interactive split-slider video player comparing original music video clip vs. AI replaced character output.
   - 1-click **Download HD Video** button, copy shareable link, and quick "Swap Another Character" reset.

#### B. Visual Identity & Theme
- **Certificate Framing Structure**:
  - The central workspace card is bordered by double-line hairline frames with stylized corner brackets and ornamental geometric notches reminiscent of an authentic security certificate or cinematic master print.
  - No bloated nested cards or cluttered pill badges; pure geometric elegance with generous margins.
- **Color Palette (80% Neon Cyan / 20% Neon Magenta on Deep Dark)**:
  - Canvas Background: `#080c14` (Deep obsidian navy)
  - Card & Certificate Surface: `#0d131f` with subtle cyan border `rgba(0, 240, 255, 0.25)` and corner accents `#00f0ff` (80% visual presence).
  - Primary Action / Accent: Neon Magenta `#ff007f` / `#f43f5e` for the "Replace Character" button, active upload pulse, and comparison slider handle (20% visual presence).
  - Text: Pure white `#f8fafc` for titles, muted slate `#94a3b8` for subtle guidance, tabular monospace numerals for timecodes.
- **Typography**:
  - Display Font: `Plus Jakarta Sans` / `Outfit` (clean modern sans-serif with geometric precision).
  - Numerals & Timecodes: `font-mono tabular-nums` for rock-solid stability during video playback and timeline dragging.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Secure Server-Side Proxy for Fal.ai API**:
  - *Chosen Approach*: Implement an Express API proxy route `/api/fal/character-replace` running on the app's Node server. Client uploads video/images, and backend attaches `FAL_KEY` from process environment to call Fal.ai REST / WebSocket endpoints.
  - *Why*: Prevents exposing the user's paid Fal.ai API key to the browser while handling large video payload uploads smoothly.
- **Decision 2: Dual Character Input Engine**:
  - *Chosen Approach*: Users can upload either an existing character sheet collage or 3 to 5 separate selfie/angle shots. If multiple shots are uploaded, the client auto-stitches them into a normalized character reference canvas before sending to the model.
  - *Why*: Gives both pro VFX artists (who have pre-made character sheets) and everyday customers (who only have phone selfies from 3 angles) an instant, error-free path.
- **Decision 3: Built-In Clip Selector (1 to 10 Seconds)**:
  - *Chosen Approach*: HTML5 Canvas + Video range slider allowing quick selection of the key song moment (chorus, hook step, close-up).
  - *Why*: Full 4-minute music videos take excessive GPU time and cost. 10-second segments ensure fast generation, high fidelity, and allow the user to quickly produce multiple signature clips.
- **Decision 4: Preset Test Music Video & Character Samples**:
  - *Chosen Approach*: Provide 2 pre-loaded high-action Bollywood/music video dance clips and sample character presets so the user can test the workflow immediately even before uploading their own media.

---

### 4. Technical Architecture & Data Strategy

#### A. System & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLAYVEAR LABS STUDIO (Browser)                  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar: Brand "PlayVear Labs" | Docs & Setup Modal | API Key Status│
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    CERTIFICATE STUDIO FRAME                      │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────┐  ┌────────────────────────────┐ │  │
│  │  │   TARGET VIDEO PORTAL       │  │   CHARACTER SHEET PORTAL   │ │  │
│  │  │   - File Drop / Sample Select│  │   - Single Sheet Mode       │ │  │
│  │  │   - 10s Timeline Trimmer    │  │   - Multi-Angle (3-5 shots)│ │  │
│  │  │   - Timecode Range Selector │  │   - Composite Grid Preview │ │  │
│  │  └─────────────────────────────┘  └────────────────────────────┘ │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │   Prompt & Model Parameters (Kling AI v1.5 / v2 / Custom)   │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │         PRIMARY ACTION: [ REPLACE CHARACTER ]               │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │   GENERATION STATUS & INTERACTIVE SPLIT-VIEW RESULT PLAYER  │ │  │
│  │  │   - Before / After Split Slider                             │ │  │
│  │  │   - Synchronized Video Playback & HD Download               │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                         HTTP / REST API Calls
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER BACKEND                            │
│                                                                        │
│   POST /api/generate ────► Read FAL_KEY from process.env                │
│   GET  /api/status/:id ──► Poll Fal.ai / Kling API Queue               │
│   POST /api/upload ──────► Upload media to Fal Storage / Temp Cache    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               FAL.AI / KLING AI VIDEO ENGINE (Cloud)                   │
│   - fal-ai/kling-video/v1.5/pro/image-to-video                         │
│   - fal-ai/face-swap / video-to-video / custom user endpoint           │
└────────────────────────────────────────────────────────────────────────┘
```

#### B. Component & File Roadmap
1. `server.ts`: Express backend handling `/api/fal/status`, `/api/fal/generate`, and key health-check proxy with `FAL_KEY` injection.
2. `.env.example`: Added `FAL_KEY="your_fal_ai_api_key_here"` with clear instructions for AI Studio secrets setup.
3. `src/components/CertificateFrame.tsx`: The signature double-bordered dark certificate container with cyan geometric corner brackets, watermarked certificate badge, and neat spacing.
4. `src/components/VideoUploadPortal.tsx`: Upload box with video preview, scrubbing control, and dual-handle 10-second trimmer.
5. `src/components/CharacterSheetPortal.tsx`: Multi-angle uploader (Front, 45° Left, 45° Right, Expression) with composite canvas builder and preview.
6. `src/components/SplitComparisonPlayer.tsx`: Interactive before/after split slider allowing dragging across the video to see the actor replaced in real-time.
7. `src/components/ApiSetupModal.tsx`: Clean guide explaining how to add `FAL_KEY` in AI Studio Secrets, along with endpoint documentation.
8. `src/types/index.ts`: TypeScript definitions for video jobs, character angles, and Fal.ai API payloads.

---

### 5. Verification & Testing Plan
- **UI & Layout Verification**: Verify certificate frame rendering, responsive scaling, 80% cyan / 20% magenta visual balance, and zero text clutter.
- **Trimmer Testing**: Ensure video files load, generate timeline thumbnails, and accurately restrict clip range to $\le 10$ seconds.
- **Character Sheet Stitching**: Verify that multiple uploaded photos are rendered onto a clean composite canvas.
- **Backend & Fallback Handling**: Verify Express proxy handles missing `FAL_KEY` gracefully with user-friendly diagnostics, and mock preview mode for demonstration before API key is provided.
