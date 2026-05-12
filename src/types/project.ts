export type ProjectStatus = 'inProgress' | 'completed';

export interface Project {
  id: number;
  title: string;
  date: string;
  status: ProjectStatus;
  description?: string;
  liked?: boolean;
}

export interface JoinProjectForm {
  code: string;
}

export interface CreateProjectForm {
  name: string;
  description: string;
  joinCode: string;
}
