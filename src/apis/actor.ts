import { instance } from './axios';

export type CreateActorRequest = {
  name: string;
};

export type CreatedActor = {
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
