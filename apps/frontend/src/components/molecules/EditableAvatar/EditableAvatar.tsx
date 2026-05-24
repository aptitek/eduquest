import React, { useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';

export interface EditableAvatarProps {
  src: string;
  githubFallbackSrc: string;
  onUpload: (file: File) => Promise<void>;
  onReset: () => Promise<void>;
  isEditing: boolean;
  size?: number;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml'
];
const MAX_DIMENSION = 512;

export function EditableAvatar({
  src,
  githubFallbackSrc,
  onUpload,
  onReset,
  isEditing,
  size = 96,
}: EditableAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      alert('File is too large. Maximum size is 2MB.');
      return;
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Invalid file format. Allowed formats: png, jpg, jpeg, webp, gif, svg.');
      return;
    }

    // Validate dimensions
    try {
      const dimensionsValid = await validateDimensions(file);
      if (!dimensionsValid) {
        alert(`Image dimensions must not exceed ${MAX_DIMENSION}x${MAX_DIMENSION} pixels.`);
        return;
      }

      setIsUploading(true);
      await onUpload(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('An error occurred while uploading the avatar.');
    } finally {
      setIsUploading(false);
    }
  };

  const validateDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      };
      img.src = objectUrl;
    });
  };

  const handleContainerClick = () => {
    if (isEditing && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className={`relative avatar rounded-full group ${isEditing && !isUploading ? 'cursor-pointer' : ''}`}
        onClick={handleContainerClick}
      >
        <div 
          className="rounded-full ring ring-solarized-blue/20 ring-offset-2 ring-offset-gaming-base overflow-hidden"
          style={{ width: size, height: size }}
        >
          <img src={src} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        
        {isEditing && (
          <div 
            className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ width: size, height: size }}
          >
            {isUploading ? (
              <span className="loading loading-spinner text-white"></span>
            ) : (
              <Camera className="text-white" size={Math.max(24, size / 3)} />
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
      </div>

      {isEditing && src !== githubFallbackSrc && (
        <button
          onClick={async () => {
            setIsUploading(true);
            try {
              await onReset();
            } finally {
              setIsUploading(false);
            }
          }}
          disabled={isUploading}
          className="btn btn-ghost btn-xs text-text-muted hover:text-solarized-red flex gap-1 items-center font-display transition-colors"
        >
          <RotateCcw size={12} />
          Reset to GitHub Avatar
        </button>
      )}
    </div>
  );
}
