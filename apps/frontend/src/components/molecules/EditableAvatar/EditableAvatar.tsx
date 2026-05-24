import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { useToastStore } from '../../../features/toast/toastStore';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

export interface EditableAvatarProps {
  src: string;
  githubFallbackSrc: string;
  onUpload: (file: File) => Promise<void>;
  onReset: () => Promise<void>;
  isEditing: boolean;
  size?: number;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const OUTPUT_MIME_TYPE = 'image/webp';
const OUTPUT_EXTENSION = 'webp';
const START_QUALITY = 0.86;
const MIN_QUALITY = 0.58;
const QUALITY_STEP = 0.08;
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];
const MAX_DIMENSION = 512;

function getOutputFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'avatar';
  return `${baseName}.${OUTPUT_EXTENSION}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image.'));
    };

    img.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not process image.'));
      },
      type,
      quality
    );
  });
}

async function normalizeAvatarFile(file: File): Promise<File> {
  const img = await loadImage(file);
  const needsResize = img.width > MAX_DIMENSION || img.height > MAX_DIMENSION;
  const needsCompression = file.size > MAX_FILE_SIZE;

  if (!needsResize && !needsCompression) {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not process image.');
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = START_QUALITY;
  let blob = await canvasToBlob(canvas, OUTPUT_MIME_TYPE, quality);

  while (blob.size > MAX_FILE_SIZE && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, OUTPUT_MIME_TYPE, quality);
  }

  return new File([blob], getOutputFileName(file.name), {
    type: blob.type || OUTPUT_MIME_TYPE,
    lastModified: Date.now(),
  });
}

export function EditableAvatar({
  src,
  githubFallbackSrc,
  onUpload,
  onReset,
  isEditing,
  size = 96,
}: EditableAvatarProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const showToast = useToastStore((s) => s.showToast);
  const [isUploading, setIsUploading] = useState(false);
  const [optimisticSrc, setOptimisticSrc] = useState<string | null>(null);
  const avatarSizeClass = size <= 88 ? 'h-[5.5rem] w-[5.5rem]' : 'h-24 w-24';
  const cameraSize = size <= 88 ? 28 : 32;
  const canReset = Boolean(optimisticSrc || (src && src !== githubFallbackSrc));

  useEffect(() => {
    if (!optimisticSrc) return;
    if (src && src !== optimisticSrc) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setOptimisticSrc(null);
    }
  }, [src, optimisticSrc]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({ messageKey: 'profile.errors.avatarInvalidFormat', type: 'error' });
      return;
    }

    setIsUploading(true);

    try {
      const normalizedFile = await normalizeAvatarFile(file);

      if (normalizedFile.size > MAX_FILE_SIZE) {
        showToast({ messageKey: 'profile.errors.avatarTooLargeAfterCompression', type: 'error' });
        return;
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const previewUrl = URL.createObjectURL(normalizedFile);
      previewUrlRef.current = previewUrl;
      setOptimisticSrc(previewUrl);

      await onUpload(normalizedFile);
    } catch (error) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setOptimisticSrc(null);
      console.error('Error uploading avatar:', error);
      if (!(error instanceof Error && error.message.startsWith('profile.errors.'))) {
        showToast({ messageKey: 'profile.errors.avatarProcessingFailed', type: 'error' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleContainerClick = () => {
    if (isEditing && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div
        className={cn(
          'avatar group relative rounded-full',
          isEditing && !isUploading && 'cursor-pointer'
        )}
        onClick={handleContainerClick}
      >
        <div
          className={cn(
            'overflow-hidden rounded-full ring ring-solarized-blue/20 ring-offset-2 ring-offset-gaming-base',
            avatarSizeClass
          )}
        >
          <img src={optimisticSrc || src} alt="Avatar" className="w-full h-full object-cover" />
        </div>

        {isEditing && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-full bg-primary/95 text-primary-content opacity-0 transition-opacity group-hover:opacity-100',
              avatarSizeClass
            )}
          >
            {isUploading ? (
              <span className="loading loading-spinner text-primary-content"></span>
            ) : (
              <Camera className="text-primary-content drop-shadow" size={cameraSize} />
            )}
          </div>
        )}

        {isEditing && (
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileChange}
            disabled={isUploading}
          />
        )}

        {isEditing && canReset && (
          <button
            type="button"
            title={t('profile.institutionalCard.resetAvatar')}
            aria-label={t('profile.institutionalCard.resetAvatar')}
            onClick={async (event) => {
              event.stopPropagation();
              setIsUploading(true);
              try {
                await onReset();
              } finally {
                setIsUploading(false);
              }
            }}
            disabled={isUploading}
            className="btn btn-circle btn-xs absolute bottom-0 right-0 z-10 h-7 w-7 min-h-0 border border-gaming-border bg-gaming-card text-text-muted shadow-md hover:text-status-boss"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
