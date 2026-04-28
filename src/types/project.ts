export type ProjectStatus = 'inProgress' | 'completed';

export interface Project {
  id: number;
  title: string;
  date: string;
  status: ProjectStatus;
}
