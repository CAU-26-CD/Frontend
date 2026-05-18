import { instance } from './axios';

export type RenameActorRequest = {
  name: string;
};

export type MergeActorRequest = {
  target_actor_id: number;
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
  const res = await instance.post(
    `/api/v1/actors/${actorId}/merge-into`,
    data,
  );

  return res.data;
};
