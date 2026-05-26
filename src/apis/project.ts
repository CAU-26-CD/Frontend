import { instance } from './axios';

export type ProjectResponse = {
  project_id: number;
  title: string;
  description: string;
  join_code: string;
  created_at: string;
};

export type CreateProjectRequest = {
  title: string;
  description: string;
  join_code: string;
};

export type JoinProjectRequest = {
  join_code: string;
  user_id: number;
};

export type ToggleProjectLikeResponse = {
  liked: boolean;
};

export const getMyProjects = async (
  userId: number,
): Promise<ProjectResponse[]> => {
  const res = await instance.get('/api/v1/projects', {
    params: {
      user_id: userId,
    },
  });

  return res.data;
};

export const createProject = async (
  userId: number,
  data: CreateProjectRequest,
): Promise<ProjectResponse> => {
  const res = await instance.post('/api/v1/projects', data, {
    params: {
      user_id: userId,
    },
  });

  return res.data;
};

export const joinProject = async (
  data: JoinProjectRequest,
): Promise<ProjectResponse> => {
  const res = await instance.post('/api/v1/projects/join', data);

  return res.data;
};

export const getLikedProjects = async (
  userId: number,
): Promise<ProjectResponse[]> => {
  const res = await instance.get('/api/v1/projects/liked', {
    params: {
      user_id: userId,
    },
  });

  return res.data;
};

export const toggleProjectLike = async (
  projectId: number,
  userId: number,
): Promise<ToggleProjectLikeResponse> => {
  const res = await instance.post(
    `/api/v1/projects/${projectId}/like`,
    null,
    {
      params: {
        user_id: userId,
      },
    },
  );

  return res.data;
};
