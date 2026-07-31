import { instance } from './axios';

export type FeedbackSessionId = number | string;

export type CreateFeedbackRequest = {
  content: string;
  video_offset_seconds: number;
  actor_ids: number[];
};

export type CreateFeedbackResponse = {
  feedback_id: number;
  session_id: FeedbackSessionId;
  created_by_user_id: number;
  content: string;
  video_offset_seconds: number;
  actor_ids: number[];
  actor_names?: string[];
  created_at: string;
};

export type FeedbackV2Response = CreateFeedbackResponse & {
  video_offset_seconds: number | null;
  script_page: number | null;
  script_x: number | null;
  script_y: number | null;
};

export type CreateFeedbackV2Request = CreateFeedbackRequest & {
  video_offset_seconds: number | null;
  script_page?: number | null;
  script_x?: number | null;
  script_y?: number | null;
};

export type UpdateFeedbackV2Request = {
  content?: string | null;
  video_offset_seconds?: number | null;
  actor_ids?: number[] | null;
  script_page?: number | null;
  script_x?: number | null;
  script_y?: number | null;
};

export type FeedbackPriority =
  | 'required'
  | 'recommended'
  | 'discussion'
  | 'praise';

const feedbackPriorities: FeedbackPriority[] = [
  'required',
  'recommended',
  'discussion',
  'praise',
];

const normalizeFeedbackPriorities = (priorities: string[]) =>
  priorities.filter((priority): priority is FeedbackPriority =>
    feedbackPriorities.includes(priority as FeedbackPriority),
  );

export type FeedbackWithTagsResponse = CreateFeedbackResponse & {
  priority: FeedbackPriority[];
  categories: string[];
};

export type FeedbackTagsResponse = {
  priority: FeedbackPriority[];
  categories: string[];
};

export type FilterFeedbacksFilters = {
  categories?: string[];
  priority?: FeedbackPriority[];
  actorIds?: number[];
  userId?: number;
};

export type GetFeedbacksFilters = {
  actorIds?: number[];
  userId?: number;
};

const pendingCreateFeedbacksBySession = new Map<string, Set<Promise<unknown>>>();

const getSessionKey = (sessionId: FeedbackSessionId) => String(sessionId);

const trackCreateFeedback = (
  sessionId: FeedbackSessionId,
  request: Promise<CreateFeedbackResponse>,
) => {
  const sessionKey = getSessionKey(sessionId);
  const pendingRequests =
    pendingCreateFeedbacksBySession.get(sessionKey) ?? new Set();

  pendingRequests.add(request);
  pendingCreateFeedbacksBySession.set(sessionKey, pendingRequests);

  request.finally(() => {
    pendingRequests.delete(request);

    if (pendingRequests.size === 0) {
      pendingCreateFeedbacksBySession.delete(sessionKey);
    }
  });

  return request;
};

export const waitForPendingFeedbackCreates = async (
  sessionId: FeedbackSessionId,
): Promise<void> => {
  const pendingRequests = pendingCreateFeedbacksBySession.get(
    getSessionKey(sessionId),
  );

  if (!pendingRequests || pendingRequests.size === 0) {
    return;
  }

  await Promise.allSettled([...pendingRequests]);
};

export const createFeedback = async (
  sessionId: FeedbackSessionId,
  data: CreateFeedbackRequest,
  userId: number,
): Promise<CreateFeedbackResponse> => {
  const request = instance
    .post(`/api/v1/sessions/${sessionId}/feedbacks`, data, {
      params: { user_id: userId },
    })
    .then((res) => res.data);

  return trackCreateFeedback(sessionId, request);
};

export const getFeedbacks = async (
  sessionId: FeedbackSessionId,
  filters: GetFeedbacksFilters = {},
): Promise<CreateFeedbackResponse[]> => {
  const params = new URLSearchParams();

  filters.actorIds?.forEach((actorId) => {
    params.append('actor_ids', String(actorId));
  });
  if (filters.userId !== undefined) {
    params.append('user_id', String(filters.userId));
  }

  const res = await instance.get(`/api/v1/sessions/${sessionId}/feedbacks`, {
    params,
  });

  return res.data;
};

export const createFeedbackV2 = async (
  sessionId: FeedbackSessionId,
  data: CreateFeedbackV2Request,
  userId: number,
): Promise<FeedbackV2Response> => {
  const res = await instance.post(`/api/v2/sessions/${sessionId}/feedbacks`, data, {
    params: { user_id: userId },
  });

  return res.data;
};

export const getFeedbacksV2 = async (
  sessionId: FeedbackSessionId,
  filters: GetFeedbacksFilters = {},
): Promise<FeedbackV2Response[]> => {
  const params = new URLSearchParams();

  filters.actorIds?.forEach((actorId) => {
    params.append('actor_ids', String(actorId));
  });
  if (filters.userId !== undefined) {
    params.append('user_id', String(filters.userId));
  }

  const res = await instance.get(`/api/v2/sessions/${sessionId}/feedbacks`, {
    params,
  });

  return res.data;
};

export const updateFeedbackV2 = async (
  sessionId: FeedbackSessionId,
  feedbackId: number,
  data: UpdateFeedbackV2Request,
  userId: number,
): Promise<FeedbackV2Response> => {
  const res = await instance.patch(
    `/api/v2/sessions/${sessionId}/feedbacks/${feedbackId}`,
    data,
    {
      params: { user_id: userId },
    },
  );

  return res.data;
};

export const getProjectScriptFeedbacks = async (
  projectId: number,
): Promise<FeedbackV2Response[]> => {
  const res = await instance.get(
    `/api/v2/projects/${projectId}/script/feedbacks`,
  );

  return res.data;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getStringArrayField = (
  data: Record<string, unknown>,
  keys: string[],
) => {
  for (const key of keys) {
    const value = data[key];

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    if (typeof value === 'string') {
      return [value];
    }
  }

  return [];
};

export const getFeedbackTags = async (
  sessionId: FeedbackSessionId,
  feedbackId: number,
): Promise<FeedbackTagsResponse> => {
  const res = await instance.get(
    `/api/v1/sessions/${sessionId}/feedbacks/${feedbackId}/tags`,
  );
  const data = res.data;

  if (!isRecord(data)) {
    return {
      priority: [],
      categories: [],
    };
  }

  return {
    priority: normalizeFeedbackPriorities(
      getStringArrayField(data, ['priority', 'priorities']),
    ),
    categories: getStringArrayField(data, ['categories', 'category']),
  };
};

export const filterFeedbacks = async (
  sessionId: FeedbackSessionId,
  filters: FilterFeedbacksFilters = {},
): Promise<FeedbackWithTagsResponse[]> => {
  const params = new URLSearchParams();

  filters.categories?.forEach((category) => {
    params.append('category', category);
  });
  filters.priority?.forEach((priority) => {
    params.append('priority', priority);
  });
  filters.actorIds?.forEach((actorId) => {
    params.append('actor_ids', String(actorId));
  });
  if (filters.userId !== undefined) {
    params.append('user_id', String(filters.userId));
  }

  const res = await instance.get(
    `/api/v1/sessions/${sessionId}/feedbacks/filter`,
    {
      params,
    },
  );

  return res.data;
};

export const classifySessionFeedbacks = async (
  sessionId: FeedbackSessionId,
): Promise<string> => {
  const res = await instance.post(
    `/api/v1/sessions/${sessionId}/feedbacks/classify`,
  );

  return res.data;
};

export const deleteFeedback = async (
  sessionId: FeedbackSessionId,
  feedbackId: number,
  userId: number,
): Promise<void> => {
  await instance.delete(
    `/api/v1/sessions/${sessionId}/feedbacks/${feedbackId}`,
    {
      params: { user_id: userId },
    },
  );
};

export const updateFeedback = async (
  sessionId: FeedbackSessionId,
  feedbackId: number,
  data: CreateFeedbackRequest,
  userId: number,
): Promise<CreateFeedbackResponse> => {
  const res = await instance.patch(
    `/api/v1/sessions/${sessionId}/feedbacks/${feedbackId}`,
    data,
    {
      params: { user_id: userId },
    },
  );

  return res.data;
};
