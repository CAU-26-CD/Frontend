import type { Actor } from '../types/feedback';

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
