export interface Project {
  id: number;
  title: string;
  date: string;
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
