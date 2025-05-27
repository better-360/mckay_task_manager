import { useState } from 'react';
import { S3Service, PreSignedUrlResult } from '@/lib/services/s3';

interface UploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface UseFileUploadOptions {
  prefix?: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<UploadResult> => {
    try {
      setIsUploading(true);
      setProgress(0);

      // 1. Get presigned URL
      const s3Service = new S3Service();
      const { uploadUrl, fileUrl } = await s3Service.getPresignedUrl({
        filename: file.name,
        contentType: file.type,
        prefix: options.prefix
      });

      // 2. Upload to S3
      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setProgress(Math.round(percentComplete));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      const result = {
        url: fileUrl,
        filename: file.name,
        mimeType: file.type,
        size: file.size
      };

      options.onSuccess?.(result);
      return result;

    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadFile,
    isUploading,
    progress
  };
} 