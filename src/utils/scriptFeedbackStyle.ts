import type { Actor, Feedback, FeedbackPriority } from '../types/feedback';

export const SCRIPT_ACTOR_COLORS = [
  '#1D8FE8',
  '#18A66A',
  '#D15757',
  '#8C6EE8',
  '#EF9F2D',
  '#D9578A',
];

export const getScriptActorColor = (index: number) =>
  SCRIPT_ACTOR_COLORS[index % SCRIPT_ACTOR_COLORS.length];

export const getScriptActorColorById = (
  actors: Actor[],
  actorId: number | null | undefined,
) => {
  const actorIndex =
    typeof actorId === 'number'
      ? actors.findIndex((actor) => actor.id === actorId)
      : -1;

  return getScriptActorColor(actorIndex >= 0 ? actorIndex : 0);
};

export const FEEDBACK_PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  required: '#ff6b6b',
  recommended: '#f6d76f',
  discussion: '#c9c1ba',
  praise: '#80c7f5',
};

export const FEEDBACK_PRIORITY_TEXT_COLORS: Record<FeedbackPriority, string> = {
  required: '#fff8ef',
  recommended: '#431B1B',
  discussion: '#431B1B',
  praise: '#431B1B',
};

export const FEEDBACK_PRIORITY_ORDER: FeedbackPriority[] = [
  'required',
  'recommended',
  'discussion',
  'praise',
];

export const getPrimaryFeedbackPriority = (feedback: Feedback) =>
  FEEDBACK_PRIORITY_ORDER.find((priority) =>
    feedback.priority?.includes(priority),
  );

export const getFeedbackPriorityColor = (
  feedback: Feedback,
  fallbackColor = '#6f625a',
) => {
  const primaryPriority = getPrimaryFeedbackPriority(feedback);

  if (primaryPriority) {
    return FEEDBACK_PRIORITY_COLORS[primaryPriority];
  }

  return feedback.isUrgent ? FEEDBACK_PRIORITY_COLORS.required : fallbackColor;
};

export const getFeedbackPriorityTextColor = (
  feedback: Feedback,
  fallbackColor = '#fff8ef',
) => {
  const primaryPriority = getPrimaryFeedbackPriority(feedback);

  if (primaryPriority) {
    return FEEDBACK_PRIORITY_TEXT_COLORS[primaryPriority];
  }

  return feedback.isUrgent ? FEEDBACK_PRIORITY_TEXT_COLORS.required : fallbackColor;
};

export const getFeedbackActorNames = (feedback: Feedback, actors: Actor[]) =>
  feedback.actorIds
    .map(
      (actorId) =>
        actors.find((actor) => actor.id === actorId)?.name ??
        feedback.actorNames?.[feedback.actorIds.indexOf(actorId)],
    )
    .filter((name): name is string => Boolean(name))
    .filter((name, index, names) => names.indexOf(name) === index)
    .join(', ');
