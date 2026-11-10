export type CharacterAngleType = 'front' | 'left' | 'right' | 'profile' | 'expression' | 'fullbody';

export interface CharacterAngleSlot {
  id: string;
  type: CharacterAngleType;
  label: string;
  angleDescription: string;
  url: string | null;
  file?: File;
}

export type AspectRatioType = 'auto' | '16:9' | '9:16' | '1:1' | '21:9';

export interface KlingV4Element {
  frontal_image_url: string;
  reference_image_urls?: string[];
  video_url?: string;
  voice_id?: string;
}

export interface KlingV4OutputFile {
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;
}

export interface VideoAsset {
  id: string;
  name: string;
  url: string;
  duration: number; // total duration in seconds
  trimStart: number;
  trimEnd: number;
  startFrameUrl?: string;
  endFrameUrl?: string;
  isSample?: boolean;
  file?: File | Blob;
  dataUrl?: string;
  isImporting?: boolean;
}

export interface GenerationJob {
  jobId: string;
  status: 'PENDING' | 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep?: string;
  videoUrl: string;
  characterSheetUrl: string;
  resultVideoUrl?: string;
  resultFile?: KlingV4OutputFile;
  endpoint?: string;
  resolution?: '768p' | '720p' | '1080p';
  aspectRatio?: AspectRatioType;
  isDemo?: boolean;
  error?: string;
  createdAt: number;
}

export interface FalConfig {
  isConfigured: boolean;
  maskedKey: string | null;
  defaultEndpoint: string;
  availablePipelines: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
