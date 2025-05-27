import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || 'AKIA3IL5GC7IVXYXIAXJ',
    secretAccessKey: process.env.AWS_SECRET_KEY || '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'
  }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'damadbabucket';
const BUCKET_URL = process.env.AWS_BUCKET_URL || 'https://damadbabucket.s3.eu-north-1.amazonaws.com';

export interface UploadParams {
  filename: string;
  contentType: string;
  prefix?: string; // tasks/, notes/ gibi
}

export interface PreSignedUrlResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

export class S3Service {
  async getPresignedUrl({ filename, contentType, prefix = '' }: UploadParams): Promise<PreSignedUrlResult> {
    // Benzersiz bir dosya adı oluştur
    const fileExtension = path.extname(filename);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const key = `${prefix}${uniqueId}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 saat geçerli
    const fileUrl = `${BUCKET_URL}/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key
    };
  }
} 