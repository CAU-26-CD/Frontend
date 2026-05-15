import { instance } from './axios';

export type CreateFeedbackRequest = {
  content: string;
  video_offset_seconds: number;
};

export type CreateFeedbackResponse = {
  feedback_id: number;
  session_id: number;
  content: string;
  video_offset_seconds: number;
  created_at: string;
};

export const createFeedback = async (
  sessionId: number,
  data: CreateFeedbackRequest,
): Promise<CreateFeedbackResponse> => {
  const res = await instance.post(
    `/api/v1/sessions/${sessionId}/feedbacks`,
    data,
  );

  return res.data;
};

export const getFeedbacks = async (
  sessionId: number,
): Promise<CreateFeedbackResponse[]> => {
  const res = await instance.get(`/api/v1/sessions/${sessionId}/feedbacks`);

  return res.data;
};
