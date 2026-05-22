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
  s_category: string;
};

export type CreateProjectSessionResponse = {
  session_id: number;
  project_id: number;
  title: string;
  s_category: string;
  created_at: string;
  in_progress: boolean;
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
  thumbnail_s3_key?: string | null;
  is_new: boolean;
  appearances?: RawSessionVideoAppearance[];
  appearance_ranges?: RawSessionVideoAppearance[];
  segments?: RawSessionVideoAppearance[];
  timeline?: RawSessionVideoAppearance[];
  start_seconds?: number | null;
  end_seconds?: number | null;
  detection_count?: number | null;
};

type RawSessionVideoActor = Omit<SessionVideoActor, 'thumbnail_url'> & {
  thumbnail_url?: string | null;
};

export type SessionVideoResponse = {
  video_id: number;
  s3_url: string;
  analysis_status: string;
  analysis_result: unknown;
  actors: SessionVideoActor[];
};

export type SessionVideoAppearance = {
  actorId: number;
  startSeconds: number;
  endSeconds: number;
  detectionCount: number;
};

type RawSessionVideoAppearance = {
  person_id?: unknown;
  start_seconds?: unknown;
  end_seconds?: unknown;
  detection_count?: unknown;
};

type RawSessionVideoResponse = Omit<SessionVideoResponse, 'actors'> & {
  actors: RawSessionVideoActor[];
};

const FRAME_IMAGE_BASE_URL =
  import.meta.env.VITE_FRAME_IMAGE_BASE_URL ??
  import.meta.env.VITE_S3_PUBLIC_BASE_URL ??
  '';

const toFrameImageUrl = (path: string | null | undefined) => {
  const trimmedPath = path?.trim();

  if (!trimmedPath) {
    return '';
  }

  if (/^(https?:|blob:|data:)/.test(trimmedPath)) {
    return trimmedPath;
  }

  if (!FRAME_IMAGE_BASE_URL) {
    return trimmedPath;
  }

  return new URL(trimmedPath, FRAME_IMAGE_BASE_URL).href;
};

const normalizeSessionVideo = (
  video: RawSessionVideoResponse,
): SessionVideoResponse => ({
  ...video,
  actors: video.actors.map((actor) => ({
    ...actor,
    thumbnail_url: toFrameImageUrl(
      actor.thumbnail_url ?? actor.thumbnail_s3_key,
    ),
  })),
});

const parseAnalysisResult = (analysisResult: unknown) => {
  if (typeof analysisResult !== 'string') {
    return analysisResult;
  }

  try {
    return JSON.parse(analysisResult);
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getSessionVideoAppearances = (
  analysisResult: unknown,
): SessionVideoAppearance[] => {
  const parsedResult = parseAnalysisResult(analysisResult);
  const nestedAnalysisResult = isRecord(parsedResult)
    ? parseAnalysisResult(parsedResult.analysis_result)
    : null;
  const appearances = isRecord(parsedResult)
    ? parsedResult.appearances
    : undefined;
  const nestedAppearances = isRecord(nestedAnalysisResult)
    ? nestedAnalysisResult.appearances
    : undefined;
  const rawAppearances = Array.isArray(appearances)
    ? appearances
    : nestedAppearances;

  if (!Array.isArray(rawAppearances)) {
    return [];
  }

  return rawAppearances
    .map((appearance: RawSessionVideoAppearance) => {
      const actorMatch =
        typeof appearance.person_id === 'string'
          ? appearance.person_id.match(/^actor:(\d+)$/)
          : null;
      const actorId = actorMatch ? Number(actorMatch[1]) : NaN;
      const startSeconds = Number(appearance.start_seconds);
      const endSeconds = Number(appearance.end_seconds);
      const detectionCount = Number(appearance.detection_count ?? 0);

      if (
        Number.isNaN(actorId) ||
        Number.isNaN(startSeconds) ||
        Number.isNaN(endSeconds)
      ) {
        return null;
      }

      return {
        actorId,
        startSeconds,
        endSeconds,
        detectionCount: Number.isNaN(detectionCount) ? 0 : detectionCount,
      };
    })
    .filter((appearance): appearance is SessionVideoAppearance =>
      Boolean(appearance),
    );
};

const getRawActorAppearances = (actor: SessionVideoActor) => {
  const nestedAppearances =
    actor.appearances ??
    actor.appearance_ranges ??
    actor.segments ??
    actor.timeline;

  if (Array.isArray(nestedAppearances)) {
    return nestedAppearances;
  }

  if (
    actor.start_seconds !== undefined ||
    actor.end_seconds !== undefined ||
    actor.detection_count !== undefined
  ) {
    return [
      {
        start_seconds: actor.start_seconds,
        end_seconds: actor.end_seconds,
        detection_count: actor.detection_count,
      },
    ];
  }

  return [];
};

export const getSessionVideoActorAppearances = (
  video: SessionVideoResponse,
): SessionVideoAppearance[] =>
  video.actors.flatMap((actor) =>
    getRawActorAppearances(actor)
      .map((appearance) => {
        const startSeconds = Number(appearance.start_seconds);
        const endSeconds = Number(appearance.end_seconds);
        const detectionCount = Number(appearance.detection_count ?? 0);

        if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) {
          return null;
        }

        return {
          actorId: actor.actor_id,
          startSeconds,
          endSeconds,
          detectionCount: Number.isNaN(detectionCount) ? 0 : detectionCount,
        };
      })
      .filter((appearance): appearance is SessionVideoAppearance =>
        Boolean(appearance),
      ),
  );

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
  options?: { refresh?: boolean },
): Promise<SessionVideoResponse> => {
  const res = await instance.get<RawSessionVideoResponse>(
    `/api/v1/sessions/${sessionId}/video`,
    options?.refresh
      ? {
          headers: {
            'Cache-Control': 'no-cache',
          },
          params: {
            _ts: Date.now(),
          },
        }
      : undefined,
  );

  return normalizeSessionVideo(res.data);
};

export const analyzeSessionVideo = async (sessionId: number): Promise<void> => {
  await instance.post(`/api/v1/sessions/${sessionId}/video/analyze`);
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

export const startRehearsalSession = async (
  sessionId: number,
): Promise<string> => {
  const res = await instance.post(
    `/api/v1/projects/${sessionId}/rehearsal/start`,
  );

  return res.data;
};

export const getRehearsalSessionStatus = async (
  sessionId: number,
): Promise<string> => {
  const res = await instance.get(
    `/api/v1/projects/${sessionId}/rehearsal/status`,
  );

  return res.data;
};

export const createCameraSession = async (
  dbSessionId: number,
  pwaBaseUrl = CAMERA_PWA_BASE_URL,
): Promise<CreateCameraSessionResponse> => {
  const normalizedPwaBaseUrl = new URL(pwaBaseUrl).href;
  const res = await instance.get(
    `/api/v1/camera-session/by-db-session/${dbSessionId}`,
    {
      params: {
        pwa_base_url: normalizedPwaBaseUrl,
      },
    },
  );

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
