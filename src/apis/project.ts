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
};

export const getMyProjects = async (): Promise<ProjectResponse[]> => {
  const res = await instance.get('/api/v1/projects');

  return res.data;
};

export const createProject = async (
  data: CreateProjectRequest,
): Promise<ProjectResponse> => {
  const res = await instance.post('/api/v1/projects', data);

  return res.data;
};

export const joinProject = async (
  data: JoinProjectRequest,
): Promise<ProjectResponse> => {
  const res = await instance.post('/api/v1/projects/join', data);

  return res.data;
};
