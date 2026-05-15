import { instance } from './axios';

const CAMERA_PWA_BASE_URL =
  import.meta.env.VITE_CAMERA_PWA_BASE_URL ??
  'https://reaction-camera-connection.netlify.app';

export type CreateCameraSessionResponse = {
  session_id: string;
  code: string;
  camera_url: string;
  expires_at: string;
};

export type CameraSessionStatusResponse = {
  session_id: string;
  status: string;
  connected_at: string | null;
  video_url: string | null;
};

export const createCameraSession = async (
  pwaBaseUrl = CAMERA_PWA_BASE_URL,
): Promise<CreateCameraSessionResponse> => {
  const res = await instance.post('/api/v1/camera-session/create', null, {
    params: {
      pwa_base_url: pwaBaseUrl,
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
