import { useEffect, useMemo, useState } from 'react';
import { getMyProjects } from '../apis/project';
import { getProjectSessions } from '../apis/session';
import { getStoredUserId } from '../utils/authStorage';

type UseProjectBreadcrumbOptions = {
  fallbackProjectTitle?: string;
  fallbackSessionTitle?: string | null;
};

type ProjectTitleResult = {
  projectId: number;
  title: string | null;
};

type SessionTitleResult = {
  projectId: number;
  sessionId: number;
  title: string | null;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const useProjectBreadcrumb = (
  projectId: number,
  sessionId?: number,
  options: UseProjectBreadcrumbOptions = {},
) => {
  const [projectTitleResult, setProjectTitleResult] =
    useState<ProjectTitleResult | null>(null);
  const [sessionTitleResult, setSessionTitleResult] =
    useState<SessionTitleResult | null>(null);

  useEffect(() => {
    if (Number.isNaN(projectId)) {
      return;
    }

    const userId = getStoredUserId();

    if (userId === null) {
      return;
    }

    let ignore = false;

    const loadProjectTitle = async () => {
      try {
        const projects = await getMyProjects(userId);
        const matchedProject = projects.find(
          (project) => project.project_id === projectId,
        );

        if (!ignore) {
          setProjectTitleResult({
            projectId,
            title: hasText(matchedProject?.title) ? matchedProject.title : null,
          });
        }
      } catch (error) {
        console.error('Failed to load project title', error);

        if (!ignore) {
          setProjectTitleResult({
            projectId,
            title: null,
          });
        }
      }
    };

    void loadProjectTitle();

    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (
      Number.isNaN(projectId) ||
      sessionId === undefined ||
      Number.isNaN(sessionId)
    ) {
      return;
    }

    let ignore = false;

    const loadSessionTitle = async () => {
      try {
        const sessions = await getProjectSessions(projectId, {
          refresh: true,
        });
        const matchedSession = sessions.find(
          (session) => session.session_id === sessionId,
        );

        if (!ignore) {
          setSessionTitleResult({
            projectId,
            sessionId,
            title: hasText(matchedSession?.title) ? matchedSession.title : null,
          });
        }
      } catch (error) {
        console.error('Failed to load session title', error);

        if (!ignore) {
          setSessionTitleResult({
            projectId,
            sessionId,
            title: null,
          });
        }
      }
    };

    void loadSessionTitle();

    return () => {
      ignore = true;
    };
  }, [projectId, sessionId]);

  return useMemo(() => {
    const fallbackProjectTitle =
      options.fallbackProjectTitle ??
      (Number.isNaN(projectId) ? 'Project' : `Project ${projectId}`);
    const fallbackSessionTitle =
      options.fallbackSessionTitle ??
      (sessionId === undefined || Number.isNaN(sessionId)
        ? 'Session'
        : `Session ${sessionId}`);
    const projectTitleFromApi =
      projectTitleResult?.projectId === projectId
        ? projectTitleResult.title
        : null;
    const sessionTitleFromApi =
      sessionTitleResult?.projectId === projectId &&
      sessionTitleResult.sessionId === sessionId
        ? sessionTitleResult.title
        : null;

    return {
      projectTitle: projectTitleFromApi ?? fallbackProjectTitle,
      sessionTitle: sessionTitleFromApi ?? fallbackSessionTitle,
    };
  }, [
    options.fallbackProjectTitle,
    options.fallbackSessionTitle,
    projectId,
    projectTitleResult,
    sessionId,
    sessionTitleResult,
  ]);
};
