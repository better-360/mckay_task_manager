import { useRef, useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Button, Progress } from '@/components/ui';

interface Props {
  onUploadComplete: (result: {
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }) => void;
  prefix?: string;
  accept?: string; // e.g. "image/*,.pdf"
  maxSize?: number; // bytes
}

export function FileUpload({ onUploadComplete, prefix, accept, maxSize }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { uploadFile, isUploading, progress } = useFileUpload({
    prefix,
    onError: (error) => setError(error.message)
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (maxSize && file.size > maxSize) {
      setError(`File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    try {
      setError(null);
      const result = await uploadFile(file);
      onUploadComplete(result);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept={accept}
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        variant="outline"
      >
        {isUploading ? 'Uploading...' : 'Select File'}
      </Button>

      {isUploading && (
        <Progress value={progress} className="w-full" />
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 