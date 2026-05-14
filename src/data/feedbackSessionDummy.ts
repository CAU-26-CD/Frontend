import { projectDummy } from './projectDummy';
import type { FeedbackSession } from '../types/feedback';

const feedbackSessionTemplates = [
  {
    id: 1,
    title: '1회차 런스루',
    date: '중앙대 MU:ON | 제2회 정기공연',
    status: 'completed',
  },
  {
    id: 2,
    title: '2회차 런스루',
    date: '중앙대 MU:ON | 제2회 정기공연',
    status: 'completed',
  },
  {
    id: 3,
    title: '3회차 런스루',
    date: '중앙대 MU:ON | 제2회 정기공연',
    status: 'completed',
  },
  {
    id: 4,
    title: '4회차 런스루',
    date: '중앙대 MU:ON | 제2회 정기공연',
    status: 'completed',
  },
  {
    id: 5,
    title: '5회차 런스루',
    date: '중앙대 MU:ON | 제2회 정기공연',
    status: 'inProgress',
  },
] satisfies Omit<FeedbackSession, 'projectId'>[];

export const feedbackSessionDummy: FeedbackSession[] = projectDummy.flatMap(
  (project) =>
    feedbackSessionTemplates.map((session) => ({
      ...session,
      projectId: project.id,
    })),
);
