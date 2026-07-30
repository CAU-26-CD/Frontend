import { isAxiosError } from 'axios';
import { instance } from './axios';

export type ProjectScript = {
  project_id?: number;
  script_id?: number;
  filename?: string;
  page_count?: number | null;
  url: string;
  expires_at?: string | null;
  raw: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const getStringField = (
  data: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
};

const normalizeProjectScript = (data: unknown): ProjectScript => {
  if (!isRecord(data)) {
    throw new Error('Script response is not an object');
  }

  const url = getStringField(data, [
    'url',
    'presigned_url',
    'presignedUrl',
    'download_url',
    'downloadUrl',
    'script_url',
    'scriptUrl',
    'file_url',
    'fileUrl',
    'pdf_url',
    'pdfUrl',
    's3_url',
    's3Url',
  ]);

  if (!url) {
    throw new Error('Script response does not include a PDF URL');
  }

  return {
    project_id: toFiniteNumber(data.project_id ?? data.projectId),
    script_id: toFiniteNumber(data.script_id ?? data.scriptId ?? data.id),
    filename: getStringField(data, ['filename', 'file_name', 'fileName']),
    page_count:
      toFiniteNumber(data.page_count ?? data.pageCount ?? data.pages) ?? null,
    url,
    expires_at:
      getStringField(data, ['expires_at', 'expiresAt', 'url_expires_at']) ??
      null,
    raw: data,
  };
};

export const isScriptNotFoundError = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 404;

export const getProjectScript = async (
  projectId: number,
): Promise<ProjectScript> => {
  const res = await instance.get(`/api/v2/projects/${projectId}/script`);

  return normalizeProjectScript(res.data);
};

export type UploadProjectScriptOptions = {
  userId?: number;
  pageCount?: number;
};

export const uploadProjectScript = async (
  projectId: number,
  file: File,
  options: UploadProjectScriptOptions = {},
): Promise<void> => {
  const formData = new FormData();

  formData.append('file', file);

  await instance.post(`/api/v2/projects/${projectId}/script`, formData, {
    params: {
      ...(options.userId !== undefined ? { user_id: options.userId } : {}),
      ...(options.pageCount !== undefined
        ? { page_count: options.pageCount }
        : {}),
    },
  });
};
