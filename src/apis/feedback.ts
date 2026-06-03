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

export type FeedbackPriority =
  | 'required'
  | 'recommended'
  | 'discussion'
  | 'praise';

export type FeedbackWithTagsResponse = CreateFeedbackResponse & {
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
