/**
 * Selise Media/Storage Block client.
 *
 * The upload flow follows the Blocks Construct pattern:
 * 1. Ask UDS for a public pre-signed upload URL.
 * 2. PUT the file to that URL.
 * 3. Store the clean public URL in Content Block site JSON.
 */

import { getAccessToken, getCachedUser } from './blocks';
import { BLOCKS_API_BASE, BLOCKS_PROJECT_KEY, MCP_PROXY_URL } from './config';

const API_BASE = BLOCKS_API_BASE;
const X_BLOCKS_KEY = BLOCKS_PROJECT_KEY;
const STORAGE_CONFIGURATIONS = String(
  import.meta.env.VITE_BLOCKS_STORAGE_CONFIGURATIONS ||
    import.meta.env.VITE_BLOCKS_STORAGE_CONFIGURATION ||
    'Default'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const STORAGE_MODULE_NAMES = String(import.meta.env.VITE_BLOCKS_STORAGE_MODULE_NAMES || '8,10,2')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value));
const MAX_IMAGE_SIZE_BYTES = Number(import.meta.env.VITE_MAX_IMAGE_UPLOAD_BYTES || 5 * 1024 * 1024);
const EMBEDDED_IMAGE_MAX_WIDTH = Number(import.meta.env.VITE_EMBEDDED_IMAGE_MAX_WIDTH || 720);
const EMBEDDED_IMAGE_MAX_HEIGHT = Number(import.meta.env.VITE_EMBEDDED_IMAGE_MAX_HEIGHT || 540);
const EMBEDDED_IMAGE_QUALITY = Number(import.meta.env.VITE_EMBEDDED_IMAGE_QUALITY || 0.68);

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
  itemId?: string;
  fileStorageId?: string;
  configurationName?: string;
}

interface UploadCandidate {
  configurationName: string;
  moduleName: number;
}

function isHostedBlocksRuntime() {
  if (typeof window === 'undefined') return false;
  return !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-blocks-key': X_BLOCKS_KEY,
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `bearer ${token}`;
  return headers;
}

function getRequestCredentials(): RequestCredentials | undefined {
  return isHostedBlocksRuntime() ? 'include' : undefined;
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

function isResponseRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getResponseErrorMessage(data: unknown, fallback: string) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (!isResponseRecord(data)) return fallback;

  const message = data.message || data.error || data.error_description;
  if (message) {
    return String(message);
  }
  if (data.errors) {
    if (Array.isArray(data.errors)) {
      return data.errors
        .map((error) => (isResponseRecord(error) && error.message ? String(error.message) : String(error)))
        .join(' ');
    }
    if (typeof data.errors === 'object') {
      return Object.values(data.errors).join(' ');
    }
  }
  return fallback;
}

function readStringCandidate(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function collectConfigurationNames(value: unknown, names = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return names;

  if (Array.isArray(value)) {
    value.forEach((item) => collectConfigurationNames(item, names));
    return names;
  }

  const record = value as Record<string, unknown>;
  const candidate =
    readStringCandidate(record.configurationName) ||
    readStringCandidate(record.ConfigurationName) ||
    readStringCandidate(record.name) ||
    readStringCandidate(record.Name);

  if (candidate) names.add(candidate);
  Object.values(record).forEach((item) => collectConfigurationNames(item, names));
  return names;
}

async function fetchStorageConfigurationNames(): Promise<string[]> {
  const url = new URL(`${API_BASE}/cloudconfiguration/v1/Storage/Gets`);
  url.searchParams.set('ProjectKey', X_BLOCKS_KEY);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: getRequestCredentials(),
    });
    if (!res.ok) return [];

    const data = await parseErrorResponse(res);
    return Array.from(collectConfigurationNames(data));
  } catch (error) {
    console.warn('Unable to discover Selise storage configurations.', error);
    return [];
  }
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

async function getUploadCandidates(): Promise<UploadCandidate[]> {
  const discoveredConfigurations = await fetchStorageConfigurationNames();
  const configurationNames = uniqueValues([...STORAGE_CONFIGURATIONS, ...discoveredConfigurations]);

  return configurationNames.flatMap((configurationName) =>
    STORAGE_MODULE_NAMES.map((moduleName) => ({ configurationName, moduleName }))
  );
}

async function requestPreSignedUrl(
  file: File,
  candidate: UploadCandidate
): Promise<PreSignedUploadResponse> {
  const payload = {
    name: file.name,
    projectKey: X_BLOCKS_KEY,
    itemId: '',
    metaData: '',
    accessModifier: 'Public',
    configurationName: candidate.configurationName,
    parentDirectoryId: '',
    tags: '',
    moduleName: candidate.moduleName,
  };

  const res = await fetch(`${API_BASE}/uds/v1/Files/GetPreSignedUrlForUpload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: getRequestCredentials(),
    body: JSON.stringify(payload),
  });

  const data = await parseErrorResponse(res);
  if (!res.ok) {
    throw new Error(
      getResponseErrorMessage(
        data,
        `configuration "${candidate.configurationName}", moduleName ${candidate.moduleName} failed (${res.status})`
      )
    );
  }

  return data as PreSignedUploadResponse;
}

async function getPreSignedUrl(file: File): Promise<PreSignedUploadResponse> {
  const errors: string[] = [];
  const candidates = await getUploadCandidates();

  for (const candidate of candidates) {
    try {
      const data = await requestPreSignedUrl(file, candidate);
      if (data.isSuccess && data.uploadUrl) {
        return {
          ...data,
          configurationName: data.configurationName || candidate.configurationName,
        };
      }

      const details = data.errors ? Object.values(data.errors).join(' ') : 'No upload URL returned';
      errors.push(
        `configuration "${candidate.configurationName}", moduleName ${candidate.moduleName}: ${details}`
      );
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : `configuration "${candidate.configurationName}", moduleName ${candidate.moduleName} failed`
      );
    }
  }

  throw new Error(`Pre-signed upload URL failed. ${errors.join(' | ')}`);
}

async function finalizeUploadFile(file: File, upload: PreSignedUploadResponse, folder: string) {
  const fileStorageId = upload.fileStorageId || upload.fileId || upload.itemId;
  if (!fileStorageId) return;

  const user = getCachedUser();
  const payload = {
    upload: [
      {
        userId: user?.itemId || '',
        itemId: upload.itemId || '',
        artifactName: file.name,
        configurationName: upload.configurationName || STORAGE_CONFIGURATIONS[0] || 'Default',
        description: `OMNI ${folder} upload`,
        parentId: '',
        dmsWorkspaceId: '',
        dmsWorkspaceName: '',
        tags: [folder],
        metaData: {
          mimeType: {
            type: 'string',
            value: file.type || 'application/octet-stream',
          },
          fileSize: {
            type: 'number',
            value: String(file.size),
          },
        },
        organizationId: '',
        fileStorageId,
      },
    ],
    projectKey: X_BLOCKS_KEY,
  };

  const res = await fetch(`${API_BASE}/uds/v1/Files/UploadFile`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      accept: 'text/plain',
    },
    credentials: getRequestCredentials(),
    body: JSON.stringify(payload),
  });

  const data = await parseErrorResponse(res);
  if (!res.ok) {
    throw new Error(getResponseErrorMessage(data, `UploadFile failed (${res.status})`));
  }
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

  // Strategy 0: Use MCP Proxy to bypass CORS
  if (MCP_PROXY_URL) {
    try {
      console.log('[Media] Attempting upload via MCP Proxy...');
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch(`${MCP_PROXY_URL}/proxy/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: dataUrl.split(',')[1],
          fileName: file.name,
          mimeType: file.type,
          bucketName: 'omni-media'
        })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[Media] Proxy upload successful:', data);
        const fileId = data.fileId || data.ItemId || data.id || data.data?.itemId;
        onProgress?.(100);
        return {
          url: data.url || `${API_BASE}/media/v1/File/${fileId}`,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          itemId: fileId,
        };
      }
      console.warn('[Media] Proxy upload failed, falling back to direct...');
    } catch (err) {
      console.error('[Media] Proxy error:', err);
    }
  }

  try {
    const preSigned = await getPreSignedUrl(file);
    if (!preSigned.isSuccess || !preSigned.uploadUrl) {
      const details = preSigned.errors ? Object.values(preSigned.errors).join(' ') : '';
      throw new Error(details || 'Pre-signed upload URL was not returned.');
    }

    const publicUrl = await uploadToSignedUrl(preSigned.uploadUrl, file, onProgress);
    await finalizeUploadFile(file, preSigned, folder);
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
      console.warn('Selise legacy media upload failed, embedding compressed image data instead.', fallbackError);
      const embeddedUrl = await fileToDataUrl(file);
      onProgress?.(100);

      return {
        url: embeddedUrl,
        fileName: file.name,
        fileSize: embeddedUrl.length,
        mimeType: 'image/jpeg',
        itemId: `embedded:${file.name}:${fallbackMessage}`,
      };
    }
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(
        1,
        EMBEDDED_IMAGE_MAX_WIDTH / img.width,
        EMBEDDED_IMAGE_MAX_HEIGHT / img.height
      );
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Failed to prepare image preview'));
        return;
      }

      context.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', EMBEDDED_IMAGE_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}
