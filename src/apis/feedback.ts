import { instance } from './axios';

export type FeedbackSessionId = number | string;

export type CreateFeedbackRequest = {
  content: string;
  video_offset_seconds: number;
};

export type CreateFeedbackResponse = {
  feedback_id: number;
  session_id: FeedbackSessionId;
  content: string;
  video_offset_seconds: number;
  created_at: string;
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
): Promise<CreateFeedbackResponse[]> => {
  const res = await instance.get(`/api/v1/sessions/${sessionId}/feedbacks`);

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
