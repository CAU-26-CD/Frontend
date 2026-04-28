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
}
