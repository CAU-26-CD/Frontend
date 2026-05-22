import type { Actor } from '../types/feedback';

const PROJECT_ACTORS_STORAGE_KEY = 'reaction-project-actors';

type StoredProjectActors = Record<string, Actor[]>;

const canUseStorage = () => typeof window !== 'undefined';

const readProjectActors = (): StoredProjectActors => {
  if (!canUseStorage()) {
    return {};
  }

  const storedValue = window.localStorage.getItem(PROJECT_ACTORS_STORAGE_KEY);

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return parsedValue && typeof parsedValue === 'object'
      ? (parsedValue as StoredProjectActors)
      : {};
  } catch {
    return {};
  }
};

export const getProjectActors = (projectId: number): Actor[] =>
  readProjectActors()[String(projectId)] ?? [];

export const saveProjectActor = (projectId: number, actor: Actor) => {
  if (!canUseStorage()) {
    return;
  }

  const projectActors = readProjectActors();
  const currentActors = projectActors[String(projectId)] ?? [];
  const nextActors = currentActors.some((item) => item.id === actor.id)
    ? currentActors.map((item) => (item.id === actor.id ? actor : item))
    : [...currentActors, actor];

  projectActors[String(projectId)] = nextActors;
  window.localStorage.setItem(
    PROJECT_ACTORS_STORAGE_KEY,
    JSON.stringify(projectActors),
  );
};
