export type FeedbackCategory = 'movement' | 'acting' | 'emotion';
export type FeedbackPriority =
  | 'required'
  | 'recommended'
  | 'discussion'
  | 'praise';

export type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error';

export type FeedbackSessionStatus = 'inProgress' | 'completed';

export interface FeedbackSession {
  id: number;
  projectId: number;
  title: string;
  category?: string;
  date: string;
  status: FeedbackSessionStatus;
  isRehearsalStarted?: boolean;
  isSessionOwner?: boolean;
  sessionOwnerId?: number | null;
}

export interface Actor {
  id: number;
  name: string;
  //단축키
  shortcut: string;
}

export interface Feedback {
  id: number;
  createdByUserId?: number;
  timestamp: string;
  actorIds: number[];
  actorNames?: string[];
  content: string;
  isUrgent: boolean;
  priority?: FeedbackPriority[];
  categories?: string[];
  scriptPage?: number | null;
  scriptX?: number | null;
  scriptY?: number | null;

  //이쪽 내용은 나중에 AI 카테고리 분류 시 확장 예정 무시 ㄱㄱ
  aiTags?: FeedbackCategory[];
  analysisStatus?: AnalysisStatus;
  aiSummary?: string;
  isPersisted?: boolean;
}
