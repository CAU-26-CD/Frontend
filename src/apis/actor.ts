import { instance } from './axios';
import type { Actor } from '../types/feedback';

export type CreateActorRequest = {
  name: string;
};

export type CreatedActor = {
  actor_id: number;
  name: string;
};

export type ProjectActorResponse = {
  actor_id: number;
  name: string;
};

export type RenameActorRequest = {
  name: string;
};

export type MergeActorRequest = {
  target_actor_id: number;
};

const normalizeCreatedActor = (
  data: unknown,
  fallbackName: string,
): CreatedActor => {
  if (typeof data === 'number') {
    return {
      actor_id: data,
      name: fallbackName,
    };
  }

  if (typeof data === 'string') {
    const actorId = Number(data);

    if (!Number.isNaN(actorId)) {
      return {
        actor_id: actorId,
        name: fallbackName,
      };
    }
  }

  if (data && typeof data === 'object') {
    const response = data as {
      actor_id?: unknown;
      id?: unknown;
      name?: unknown;
    };
    const actorId = Number(response.actor_id ?? response.id);

    if (!Number.isNaN(actorId)) {
      return {
        actor_id: actorId,
        name: typeof response.name === 'string' ? response.name : fallbackName,
      };
    }
  }

  throw new Error('Actor creation response does not include actor_id');
};

const normalizeProjectActor = (data: unknown, index: number): Actor | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const actor = data as {
    actor_id?: unknown;
    id?: unknown;
    name?: unknown;
  };
  const actorId = Number(actor.actor_id ?? actor.id);

  if (Number.isNaN(actorId)) {
    return null;
  }

  return {
    id: actorId,
    name: typeof actor.name === 'string' ? actor.name : `배우 ${actorId}`,
    shortcut: String(index + 1),
  };
};

const normalizeProjectActors = (data: unknown): Actor[] => {
  const rawActors = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { actors?: unknown }).actors)
      ? (data as { actors: unknown[] }).actors
      : [];

  return rawActors
    .map((actor, index) => normalizeProjectActor(actor, index))
    .filter((actor): actor is Actor => actor !== null);
};

export const listProjectActors = async (
  projectId: number,
): Promise<Actor[]> => {
  const res = await instance.get(`/api/v1/projects/${projectId}/actors`);

  return normalizeProjectActors(res.data);
};

export const createProjectActor = async (
  projectId: number,
  data: CreateActorRequest,
): Promise<CreatedActor> => {
  const res = await instance.post(`/api/v1/projects/${projectId}/actors`, data);

  return normalizeCreatedActor(res.data, data.name);
};

export const renameActor = async (
  actorId: number,
  data: RenameActorRequest,
): Promise<string> => {
  const res = await instance.patch(`/api/v1/actors/${actorId}`, data);

  return res.data;
};

export const mergeActorInto = async (
  actorId: number,
  data: MergeActorRequest,
): Promise<string> => {
  const res = await instance.post(`/api/v1/actors/${actorId}/merge-into`, data);

  return res.data;
};
