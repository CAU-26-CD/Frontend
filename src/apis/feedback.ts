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
  content: string;
  video_offset_seconds: number;
  actor_ids: number[];
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
};

export type GetFeedbacksFilters = {
  actorIds?: number[];
};

export const createFeedback = async (
  sessionId: FeedbackSessionId,
  data: CreateFeedbackRequest,
): Promise<CreateFeedbackResponse> => {
  const res = await instance.post(
    `/api/v1/sessions/${sessionId}/feedbacks`,
    data,
  );

  return res.data;
};

export const getFeedbacks = async (
  sessionId: FeedbackSessionId,
  filters: GetFeedbacksFilters = {},
): Promise<CreateFeedbackResponse[]> => {
  const params = new URLSearchParams();

  filters.actorIds?.forEach((actorId) => {
    params.append('actor_ids', String(actorId));
  });

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
): Promise<void> => {
  await instance.delete(
    `/api/v1/sessions/${sessionId}/feedbacks/${feedbackId}`,
  );
};

export const updateFeedback = async (
  sessionId: FeedbackSessionId,
  feedbackId: number,
  data: CreateFeedbackRequest,
): Promise<CreateFeedbackResponse> => {
  const res = await instance.patch(
    `/api/v1/sessions/${sessionId}/feedbacks/${feedbackId}`,
    data,
  );

  return res.data;
};
