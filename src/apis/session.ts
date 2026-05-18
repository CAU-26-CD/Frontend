import { instance } from './axios';

const CAMERA_PWA_BASE_URL =
  import.meta.env.VITE_CAMERA_PWA_BASE_URL ??
  'https://reaction-camera-connection.netlify.app';

export type CreateCameraSessionResponse = {
  session_id: string;
  code: string;
  camera_url: string;
  expires_at: string;
  db_session_id: number;
};

export type CreateProjectSessionRequest = {
  title: string;
};

export type CreateProjectSessionResponse = {
  session_id: number;
  project_id: number;
  title: string;
  created_at: string;
  in_progress?: boolean;
};

export type CompleteProjectSessionResponse = CreateProjectSessionResponse;

export type CameraSessionStatusResponse = {
  session_id: string;
  status: string;
  connected_at: string | null;
  video_url: string | null;
};

export type SessionVideoActor = {
  actor_id: number;
  name: string | null;
  thumbnail_url: string;
  is_new: boolean;
};

export type SessionVideoResponse = {
  video_id: number;
  s3_url: string;
  analysis_status: string;
  analysis_result: unknown;
  actors: SessionVideoActor[];
};

export const createProjectSession = async (
  projectId: number,
  data: CreateProjectSessionRequest,
): Promise<CreateProjectSessionResponse> => {
  const res = await instance.post(
    `/api/v1/projects/${projectId}/sessions`,
    data,
  );

  return res.data;
};

export const getProjectSessions = async (
  projectId: number,
): Promise<CreateProjectSessionResponse[]> => {
  const res = await instance.get(`/api/v1/projects/${projectId}/sessions`);

  return res.data;
};

export const getSessionVideo = async (
  sessionId: number,
): Promise<SessionVideoResponse> => {
  const res = await instance.get(`/api/v1/sessions/${sessionId}/video`);

  return res.data;
};

export const completeProjectSession = async (
  projectId: number,
  sessionId: number,
): Promise<CompleteProjectSessionResponse> => {
  const res = await instance.patch(
    `/api/v1/projects/${projectId}/sessions/${sessionId}`,
    {
      in_progress: false,
    },
  );

  return res.data;
};

export const createCameraSession = async (
  dbSessionId: number,
  pwaBaseUrl = CAMERA_PWA_BASE_URL,
): Promise<CreateCameraSessionResponse> => {
  const normalizedPwaBaseUrl = new URL(pwaBaseUrl).href;
  const res = await instance.post('/api/v1/camera-session/create', null, {
    params: {
      db_session_id: dbSessionId,
      pwa_base_url: normalizedPwaBaseUrl,
    },
  });

  return res.data;
};

export const getCameraSessionStatus = async (
  sessionId: string,
): Promise<CameraSessionStatusResponse> => {
  const res = await instance.get(`/api/v1/camera-session/${sessionId}/status`);

  return res.data;
};

export const markCameraSessionConnected = async (
  sessionId: string,
): Promise<string> => {
  const res = await instance.post(
    `/api/v1/camera-session/${sessionId}/connect`,
  );

  return res.data;
};

export const markCameraSessionDone = async (
  sessionId: string,
  videoUrl: string,
): Promise<string> => {
  const res = await instance.post(
    `/api/v1/camera-session/${sessionId}/done`,
    null,
    {
      params: {
        video_url: videoUrl,
      },
    },
  );

  return res.data;
};

export const stopCameraSession = async (sessionId: string): Promise<string> => {
  const res = await instance.post(`/api/v1/camera-session/${sessionId}/stop`);

  return res.data;
};
