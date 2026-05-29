import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getProjectSessions } from '../apis/session';
import WalkingLoadingPanel from '../components/WalkingLoadingPanel';
import DesignedHeader from '../components/sidebar/DesignedHeader';

type ActorMappingWaitingRouteState = {
  projectSessionTitle?: string;
};

const SESSION_POLL_INTERVAL_MS = 1000;

const isSessionMatchingCompleted = (inProgress: unknown) =>
  inProgress === false || String(inProgress).toLowerCase() === 'false';

export default function ActorMappingWaitingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as ActorMappingWaitingRouteState | null;
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const hasInvalidSessionParams =
    Number.isNaN(numericProjectId) || Number.isNaN(numericSessionId);
  const [pollingStatusMessage, setPollingStatusMessage] = useState<
    string | null
  >(null);
  const statusMessage = hasInvalidSessionParams
    ? '세션 정보를 확인할 수 없습니다.'
    : pollingStatusMessage;
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle =
    routeState?.projectSessionTitle ??
    (Number.isNaN(numericSessionId)
      ? 'Session'
      : `Session ${numericSessionId}`);

  useEffect(() => {
    if (hasInvalidSessionParams) {
      return;
    }

    let ignore = false;

    const loadSessionStatus = async () => {
      try {
        const sessions = await getProjectSessions(numericProjectId, {
          refresh: true,
        });
        const matchedSession = sessions.find(
          (session) => session.session_id === numericSessionId,
        );

        if (ignore) return;

        if (!matchedSession) {
          setPollingStatusMessage('세션 정보를 찾지 못했습니다.');
          return;
        }

        if (isSessionMatchingCompleted(matchedSession.in_progress)) {
          navigate(
            `/project/${numericProjectId}/workspace/${numericSessionId}/review`,
            {
              replace: true,
              state: {
                projectSessionTitle: matchedSession.title ?? sessionTitle,
              },
            },
          );
          return;
        }

        setPollingStatusMessage(null);
      } catch (error) {
        console.error('Failed to load session matching status', error);

        if (!ignore) {
          setPollingStatusMessage('매칭 완료 상태를 확인하지 못했습니다.');
        }
      }
    };

    void loadSessionStatus();
    const intervalId = window.setInterval(() => {
      void loadSessionStatus();
    }, SESSION_POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [
    hasInvalidSessionParams,
    navigate,
    numericProjectId,
    numericSessionId,
    sessionTitle,
  ]);

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader align="left" />
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[960px] flex-col px-6 pb-10 pt-24 lg:px-12">
        <div className="reaction-ui-font flex shrink-0 items-center justify-between gap-4 text-sm font-semibold text-[#eee7dc]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">
              My Projects / {projectTitle} / {sessionTitle}
            </span>
            <Video
              size={20}
              fill="#D15757"
              stroke="#D15757"
              strokeWidth={2.4}
              className="shrink-0"
              aria-hidden="true"
            />
          </div>
        </div>

        <section className="reaction-ui-font flex flex-1 flex-col items-center justify-center text-center">
          <WalkingLoadingPanel
            title="배우 태그를 매칭중입니다"
            description="세션 소유자가 매칭 완료를 누르면 리뷰 화면으로 이동합니다."
          />
          {statusMessage && (
            <p className="mt-5 text-sm font-semibold text-[#ffb4a8]">
              {statusMessage}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
