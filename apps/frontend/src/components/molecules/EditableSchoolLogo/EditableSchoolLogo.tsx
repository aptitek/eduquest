import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { useToastStore } from '../../../features/toast/toastStore';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

export interface EditableSchoolLogoProps {
  src?: string;
  name: string;
  onUpload: (file: File) => Promise<void>;
  onReset: () => Promise<void>;
  isEditing: boolean;
  canReset?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export function EditableSchoolLogo({
  src,
  name,
  onUpload,
  onReset,
  isEditing,
  canReset,
  className,
}: EditableSchoolLogoProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const showToast = useToastStore((s) => s.showToast);
  const [isUploading, setIsUploading] = useState(false);
  const [optimisticSrc, setOptimisticSrc] = useState<string | null>(null);

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
      showToast({ messageKey: 'profile.errors.avatarInvalidFormat', type: 'error' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast({ messageKey: 'profile.errors.avatarTooLargeAfterCompression', type: 'error' });
      return;
    }

    setIsUploading(true);

    try {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      setOptimisticSrc(previewUrl);

      await onUpload(file);
    } catch (error) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setOptimisticSrc(null);
      console.error('Error uploading school logo:', error);
      showToast({ messageKey: 'profile.errors.avatarProcessingFailed', type: 'error' });
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
        isEditing && !isUploading && 'cursor-pointer',
        className
      )}
      title={name}
      onClick={handleContainerClick}
    >
      {displaySrc ? (
        <img src={displaySrc} alt={name} className="h-full w-full object-contain" />
      ) : (
        <span className="px-3 text-center text-lg font-display font-semibold text-text-secondary">
          {name}
        </span>
      )}

      {isEditing && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/95 text-primary-content opacity-0 transition-opacity group-hover:opacity-100">
          {isUploading ? (
            <span className="loading loading-spinner text-primary-content"></span>
          ) : (
            <Camera className="text-primary-content drop-shadow" size={32} />
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
            } finally {
              setIsUploading(false);
            }
          }}
          disabled={isUploading}
          className="btn btn-circle btn-xs absolute bottom-2 right-2 z-10 h-7 w-7 min-h-0 border border-gaming-border bg-gaming-card text-text-muted shadow-md hover:text-status-boss"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );
}
