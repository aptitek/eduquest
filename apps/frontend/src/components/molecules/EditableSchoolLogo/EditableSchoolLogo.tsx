import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';
import { useErrorReporter } from '../../../features/errors/notifications';

export interface EditableSchoolLogoProps {
  src?: string;
  name: string;
  onUpload: (file: File) => Promise<void>;
  onReset: () => Promise<void>;
  isEditing: boolean;
  canReset?: boolean;
  uploadErrorMessageKey?: string;
  className?: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const OUTPUT_MIME_TYPE = 'image/webp';
const OUTPUT_EXTENSION = 'webp';
const START_QUALITY = 0.86;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.08;
const DIMENSION_STEP = 0.75;
const MIN_DIMENSION = 128;
const MAX_DIMENSION = 1024;
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];
const SVG_MIME_TYPE = 'image/svg+xml';

function getOutputFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'school-logo';
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

async function normalizeSchoolLogoFile(file: File): Promise<File> {
  if (file.type === SVG_MIME_TYPE || file.size <= MAX_FILE_SIZE) {
    return file;
  }

  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not process image.');
  }

  let targetDimension = Math.max(
    MIN_DIMENSION,
    Math.min(MAX_DIMENSION, Math.max(img.width, img.height))
  );
  let smallestBlob: Blob | null = null;

  while (targetDimension >= MIN_DIMENSION) {
    const scale = Math.min(1, targetDimension / img.width, targetDimension / img.height);
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = START_QUALITY;
    let blob = await canvasToBlob(canvas, OUTPUT_MIME_TYPE, quality);

    while (blob.size > MAX_FILE_SIZE && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
      blob = await canvasToBlob(canvas, OUTPUT_MIME_TYPE, quality);
    }

    if (!smallestBlob || blob.size < smallestBlob.size) {
      smallestBlob = blob;
    }

    if (blob.size <= MAX_FILE_SIZE) {
      return new File([blob], getOutputFileName(file.name), {
        type: blob.type || OUTPUT_MIME_TYPE,
        lastModified: Date.now(),
      });
    }

    targetDimension = Math.floor(targetDimension * DIMENSION_STEP);
  }

  if (!smallestBlob) {
    throw new Error('Could not process image.');
  }

  return new File([smallestBlob], getOutputFileName(file.name), {
    type: smallestBlob.type || OUTPUT_MIME_TYPE,
    lastModified: Date.now(),
  });
}

export function EditableSchoolLogo({
  src,
  name,
  onUpload,
  onReset,
  isEditing,
  canReset,
  uploadErrorMessageKey = 'profile.errors.schoolLogoUploadFailed',
  className,
}: EditableSchoolLogoProps) {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [optimisticSrc, setOptimisticSrc] = useState<string | null>(null);
  const showErrorToast = (messageKey: string) => {
    reportError(messageKey, { messageKey, id: messageKey, includeDetail: false });
  };
  const showOperationError = (error: unknown, messageKey: string) => {
    reportError(error, { messageKey, id: messageKey });
  };

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
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!ALLOWED_TYPES.includes(file.type)) {
      showErrorToast('profile.errors.schoolLogoInvalidFormat');
      return;
    }

    if (file.type === SVG_MIME_TYPE && file.size > MAX_FILE_SIZE) {
      showErrorToast('profile.errors.schoolLogoTooLarge');
      return;
    }

    setIsUploading(true);

    try {
      const normalizedFile = await normalizeSchoolLogoFile(file);

      if (normalizedFile.size > MAX_FILE_SIZE) {
        showErrorToast('profile.errors.schoolLogoTooLargeAfterCompression');
        return;
      }

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
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
      console.error('Error uploading image:', error);
      showOperationError(error, uploadErrorMessageKey);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContainerClick = () => {
    if (isEditing && !isUploading) fileInputRef.current?.click();
  };

  const displaySrc = optimisticSrc || src;

  return (
    <div
      className={cn(
        'group relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gaming-border bg-gaming-base/50 p-2',
        className
      )}
    >
      <button
        type="button"
        title={name}
        onClick={handleContainerClick}
        aria-label={t('management.schools.changeLogo')}
        disabled={!isEditing || isUploading}
        className={cn(
          'flex h-full w-full items-center justify-center rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gaming-base',
          isEditing && !isUploading && 'cursor-pointer'
        )}
      >
        {displaySrc ? (
          <img src={displaySrc} alt={name} className="h-full w-full object-contain" />
        ) : (
          <span className="px-3 text-center text-lg font-display font-semibold text-text-secondary">
            {name}
          </span>
        )}

        {isEditing && (
          <span className="absolute inset-0 flex items-center justify-center bg-primary/95 text-primary-content opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {isUploading ? (
              <span className="loading loading-spinner text-primary-content"></span>
            ) : (
              <Camera className="text-primary-content drop-shadow" size={32} />
            )}
          </span>
        )}
      </button>

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

      {isEditing && (canReset || optimisticSrc) && (
        <button
          type="button"
          title={t('management.schools.resetLogo')}
          aria-label={t('management.schools.resetLogo')}
          onClick={async (event) => {
            event.stopPropagation();
            setIsUploading(true);
            try {
              await onReset();
            } catch (error) {
              showOperationError(error, 'profile.errors.schoolLogoResetFailed');
            } finally {
              setIsUploading(false);
            }
          }}
          disabled={isUploading}
          className="btn btn-circle btn-xs absolute bottom-2 right-2 z-30 h-7 w-7 min-h-0 border border-gaming-border bg-gaming-card text-text-muted shadow-md hover:text-status-boss"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );
}
