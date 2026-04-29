export type FeedbackCategory = 'movement' | 'acting' | 'emotion';

export type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error';

export interface Actor {
  id: number;
  name: string;
  shortcut: string;
}

export interface Feedback {
  id: number;
  timestamp: string;
  actorId: number;
  content: string;

  aiTags?: FeedbackCategory[];
  analysisStatus?: AnalysisStatus;
  aiSummary?: string;
}
