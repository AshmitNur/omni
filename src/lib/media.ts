/**
 * Selise Media/Storage Block client.
 *
 * The upload flow follows the Blocks Construct pattern:
 * 1. Ask UDS for a public pre-signed upload URL.
 * 2. PUT the file to that URL.
 * 3. Store the clean public URL in Content Block site JSON.
 */

import { getAccessToken } from './blocks';

const API_BASE = import.meta.env.VITE_BLOCKS_API_URL || 'https://api.seliseblocks.com';
const X_BLOCKS_KEY = import.meta.env.VITE_X_BLOCKS_KEY || '';
const STORAGE_CONFIGURATION = import.meta.env.VITE_BLOCKS_STORAGE_CONFIGURATION || 'Default';
const STORAGE_MODULE_NAMES = String(import.meta.env.VITE_BLOCKS_STORAGE_MODULE_NAMES || '8,10,2')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value));
const MAX_IMAGE_SIZE_BYTES = Number(import.meta.env.VITE_MAX_IMAGE_UPLOAD_BYTES || 5 * 1024 * 1024);

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface MediaUploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  itemId?: string;
}

interface PreSignedUploadResponse {
  errors?: Record<string, string>;
  isSuccess?: boolean;
  uploadUrl?: string;
  fileId?: string;
}

function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-blocks-key': X_BLOCKS_KEY,
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function assertSupportedImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP images are supported.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024));
    throw new Error(`Image must be ${maxMb}MB or smaller.`);
  }
}

async function parseErrorResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getResponseErrorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.message || data.error || data.error_description) {
    return data.message || data.error || data.error_description;
  }
  if (data.errors) {
    if (Array.isArray(data.errors)) {
      return data.errors.map((error: any) => error?.message || String(error)).join(' ');
    }
    if (typeof data.errors === 'object') {
      return Object.values(data.errors).join(' ');
    }
  }
  return fallback;
}

async function requestPreSignedUrl(file: File, moduleName: number): Promise<PreSignedUploadResponse> {
  const payload = {
    name: file.name,
    projectKey: X_BLOCKS_KEY,
    itemId: '',
    metaData: '',
    accessModifier: 'Public',
    configurationName: STORAGE_CONFIGURATION,
    parentDirectoryId: '',
    tags: '',
    moduleName,
  };

  const res = await fetch(`${API_BASE}/uds/v1/Files/GetPreSignedUrlForUpload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseErrorResponse(res);
  if (!res.ok) {
    throw new Error(getResponseErrorMessage(data, `moduleName ${moduleName} failed (${res.status})`));
  }

  return data as PreSignedUploadResponse;
}

async function getPreSignedUrl(file: File): Promise<PreSignedUploadResponse> {
  const errors: string[] = [];

  for (const moduleName of STORAGE_MODULE_NAMES) {
    try {
      const data = await requestPreSignedUrl(file, moduleName);
      if (data.isSuccess && data.uploadUrl) return data;

      const details = data.errors ? Object.values(data.errors).join(' ') : 'No upload URL returned';
      errors.push(`moduleName ${moduleName}: ${details}`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `moduleName ${moduleName} failed`);
    }
  }

  throw new Error(`Pre-signed upload URL failed. ${errors.join(' | ')}`);
}

function uploadToSignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(uploadUrl.split('?')[0]);
        return;
      }
      reject(new Error(`Storage upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error('Storage upload failed due to a network error.'));
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.send(file);
  });
}

async function uploadViaLegacyEndpoint(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<MediaUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('isPublic', 'true');

  const uploadUrl = new URL(`${API_BASE}/storage/v1/Files/Upload`);
  uploadUrl.searchParams.set('projectKey', X_BLOCKS_KEY);
  uploadUrl.searchParams.set('folder', folder);
  uploadUrl.searchParams.set('isPublic', 'true');

  const res = await fetch(uploadUrl.toString(), {
    method: 'POST',
    body: formData,
  });

  const data = await parseErrorResponse(res);
  if (!res.ok) {
    throw new Error(getResponseErrorMessage(data, `Upload failed (${res.status})`));
  }

  const publicUrl = data.url || data.fileUrl || data.publicUrl || data.result?.url || data.data?.url || data.path;
  if (!publicUrl) throw new Error('Upload succeeded but no public URL was returned.');

  onProgress?.(100);
  return {
    url: String(publicUrl).startsWith('http') ? publicUrl : `${API_BASE}${publicUrl}`,
    fileName: data.fileName || file.name,
    fileSize: data.fileSize || file.size,
    mimeType: data.mimeType || file.type,
    itemId: data.itemId,
  };
}

export async function uploadMedia(
  file: File,
  folder = 'vibe-uploads',
  onProgress?: (percent: number) => void
): Promise<MediaUploadResult> {
  assertSupportedImage(file);
  onProgress?.(0);

  try {
    const preSigned = await getPreSignedUrl(file);
    if (!preSigned.isSuccess || !preSigned.uploadUrl) {
      const details = preSigned.errors ? Object.values(preSigned.errors).join(' ') : '';
      throw new Error(details || 'Pre-signed upload URL was not returned.');
    }

    const publicUrl = await uploadToSignedUrl(preSigned.uploadUrl, file, onProgress);
    return {
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      itemId: preSigned.fileId,
    };
  } catch (error) {
    const preSignedError = error instanceof Error ? error : new Error('Pre-signed upload failed');
    console.warn('Pre-signed Selise media upload failed, trying legacy upload endpoint.', preSignedError);

    try {
      return await uploadViaLegacyEndpoint(file, folder, onProgress);
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Legacy upload endpoint failed';
      throw new Error(`${preSignedError.message}. Fallback upload failed: ${fallbackMessage}`);
    }
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
