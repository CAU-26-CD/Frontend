import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings, Video } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  getCameraSessionStatus,
  getProjectSessions,
  createCameraSession,
  getRehearsalSessionStatus,
  startRehearsalSession,
} from '../apis/session';
import type {
  CameraSessionStatusResponse,
  CreateCameraSessionResponse,
  CreateProjectSessionResponse,
  RehearsalSessionStatusResponse,
} from '../apis/session';
import { listProjectActors } from '../apis/actor';
import { useFeedback } from '../hooks/useFeedback';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import MovementArea from '../components/feedback/MovementArea';
import LoadingSpinner from '../components/LoadingSpinner';
import CameraSessionModal from '../components/modals/CameraSessionModal';
import VideoUploadCompleteModal from '../components/modals/VideoUploadCompleteModal';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import type { Actor } from '../types/feedback';
import { getStoredUserId } from '../utils/authStorage';
import {
  getSessionOwnerId,
  getStoredSessionOwnerId,
  saveSessionOwnerId,
} from '../utils/sessionOwner';

type FeedbackRouteState = {
  openCameraSession?: boolean;
  projectSessionTitle?: string;
  isSessionOwner?: boolean;
  sessionOwnerId?: number;
  allowActorMapping?: boolean;
};

const VIDEO_UPLOAD_IN_PROGRESS_STATUSES = new Set([
  'stop',
  'stopped',
  'uploading',
]);
const RECORDING_FINALIZED_STATUSES = VIDEO_UPLOAD_IN_PROGRESS_STATUSES;

const isStartedRehearsalStatus = (status: RehearsalSessionStatusResponse) =>
  status.started;

export default function RehearsalFeedbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as FeedbackRouteState | null;
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const [cameraSession, setCameraSession] =
    useState<CreateCameraSessionResponse | null>(null);
  const [cameraSessionError, setCameraSessionError] = useState<string | null>(
    null,
  );
  const [currentProjectSession, setCurrentProjectSession] =
    useState<CreateProjectSessionResponse | null>(null);
  const [isCameraGateOpen, setIsCameraGateOpen] = useState(
    Boolean(routeState?.openCameraSession),
  );
  const [showUploadCompleteModal, setShowUploadCompleteModal] = useState(false);
  const [cameraStatusText, setCameraStatusText] = useState('');
  const [logoNavigationMessage, setLogoNavigationMessage] = useState('');
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null,
  );
  const [isRecordingFinalized, setIsRecordingFinalized] = useState(false);
  const [actors, setActors] = useState<Actor[]>([]);
  const [isLoadingActors, setIsLoadingActors] = useState(false);
  const [actorsError, setActorsError] = useState<string | null>(null);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const hasRequestedCameraSessionRef = useRef(false);
  const hasShownUploadCompleteRef = useRef(false);
  const parsedProjectId = Number(projectId);
  const numericProjectId = parsedProjectId;
  const activeSessionId = sessionId ?? '';
  const numericSessionId = Number(activeSessionId);
  const currentUserId = getStoredUserId();
  const routeSessionOwnerId =
    routeState?.sessionOwnerId ??
    (routeState?.isSessionOwner ? currentUserId : null);
  const [sessionOwnerId, setSessionOwnerId] = useState<number | null>(() => {
    if (routeSessionOwnerId !== null && routeSessionOwnerId !== undefined) {
      return routeSessionOwnerId;
    }

    return activeSessionId ? getStoredSessionOwnerId(activeSessionId) : null;
  });
  const getCurrentRecordingOffsetSeconds = useCallback(() => {
    if (recordingStartedAt === null) {
      return recordingElapsedSeconds;
    }

    return Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000));
  }, [recordingElapsedSeconds, recordingStartedAt]);
  const feedback = useFeedback(
    activeSessionId,
    getCurrentRecordingOffsetSeconds,
  );
  const { handleStartTimestamp } = feedback;
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle =
    routeState?.projectSessionTitle ??
    currentProjectSession?.title ??
    (Number.isNaN(numericSessionId)
      ? 'Session'
      : `Session ${numericSessionId}`);
  const rehearsalStartedStorageKey = `reaction-camera-started:${activeSessionId}`;
  const isSessionOwnerKnown = sessionOwnerId !== null;
  const isSessionOwner =
    currentUserId !== null && sessionOwnerId === currentUserId;
  const isRecording = cameraStatusText === 'recording' && !isRecordingFinalized;
  const isVideoUploadInProgress =
    !isSessionOwner && VIDEO_UPLOAD_IN_PROGRESS_STATUSES.has(cameraStatusText);
  const isFeedbackInputDisabled =
    isCameraGateOpen || isRecordingFinalized || isVideoUploadInProgress;
  const isLogoNavigationLocked =
    !isRecordingFinalized &&
    (cameraStatusText === 'connected' || cameraStatusText === 'recording');
  const shouldShowRecordingTime = isRecording || isRecordingFinalized;
  const recordingIndicatorColor = isRecordingFinalized ? '#9f9a95' : '#D15757';
  const recordingTime = `${String(
    Math.floor(recordingElapsedSeconds / 60),
  ).padStart(2, '0')}:${String(recordingElapsedSeconds % 60).padStart(2, '0')}`;

  const applyCameraStatus = useCallback(
    (nextStatus: CameraSessionStatusResponse) => {
      const normalizedStatus = nextStatus.status?.toLowerCase() ?? '';

      setCameraStatusText(normalizedStatus);

      if (normalizedStatus === 'recording') {
        setIsRecordingFinalized(false);
        setRecordingStartedAt((current) => current ?? Date.now());
      }

      if (RECORDING_FINALIZED_STATUSES.has(normalizedStatus)) {
        setIsRecordingFinalized(true);
        setRecordingElapsedSeconds(getCurrentRecordingOffsetSeconds());
        setRecordingStartedAt(null);
      }

      if (normalizedStatus === 'done' || nextStatus.video_url) {
        setIsRecordingFinalized(true);
        setRecordingElapsedSeconds(getCurrentRecordingOffsetSeconds());
        setRecordingStartedAt(null);

        if (!isSessionOwnerKnown) {
          return;
        }

        hasShownUploadCompleteRef.current = true;

        if (isSessionOwner) {
          setShowUploadCompleteModal(true);
        } else if (!Number.isNaN(numericProjectId)) {
          navigate(
            `/project/${numericProjectId}/workspace/${activeSessionId}/actors/waiting`,
            {
              replace: true,
              state: {
                projectSessionTitle: sessionTitle,
              },
            },
          );
        }
      }
    },
    [
      activeSessionId,
      getCurrentRecordingOffsetSeconds,
      isSessionOwner,
      isSessionOwnerKnown,
      navigate,
      numericProjectId,
      sessionTitle,
    ],
  );

  const enterRehearsal = useCallback(() => {
    setIsCameraGateOpen(false);
    sessionStorage.setItem(rehearsalStartedStorageKey, 'true');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, rehearsalStartedStorageKey]);

  useEffect(() => {
    if (Number.isNaN(numericProjectId) || Number.isNaN(numericSessionId)) {
      return;
    }

    let ignore = false;

    const loadCurrentSession = async () => {
      try {
        const sessions = await getProjectSessions(numericProjectId);
        const matchedSession = sessions.find(
          (session) => session.session_id === numericSessionId,
        );

        if (ignore) return;

        setCurrentProjectSession(matchedSession ?? null);

        const nextOwnerId =
          getSessionOwnerId(matchedSession) ??
          getStoredSessionOwnerId(numericSessionId) ??
          routeSessionOwnerId ??
          null;

        if (nextOwnerId !== null) {
          setSessionOwnerId(nextOwnerId);
          saveSessionOwnerId(numericSessionId, nextOwnerId);
        }

        if (matchedSession?.in_progress === false) {
          navigate(
            `/project/${numericProjectId}/workspace/${numericSessionId}/review`,
            {
              replace: true,
            },
          );
          return;
        }

        const hasStarted = sessionStorage.getItem(rehearsalStartedStorageKey);

        if (!hasStarted) {
          setIsCameraGateOpen(true);
        }
      } catch (error) {
        console.error('Failed to load current session', error);
      }
    };

    void loadCurrentSession();

    return () => {
      ignore = true;
    };
  }, [
    numericProjectId,
    numericSessionId,
    navigate,
    rehearsalStartedStorageKey,
    routeSessionOwnerId,
  ]);

  useEffect(() => {
    if (Number.isNaN(numericProjectId)) {
      setActors([]);
      return;
    }

    let ignore = false;

    const loadActors = async () => {
      setIsLoadingActors(true);
      setActorsError(null);

      try {
        const nextActors = await listProjectActors(numericProjectId);

        if (!ignore) {
          setActors(nextActors);
        }
      } catch (error) {
        console.error('Failed to load project actors', error);

        if (!ignore) {
          setActors([]);
          setActorsError('배우 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingActors(false);
        }
      }
    };

    void loadActors();

    return () => {
      ignore = true;
    };
  }, [numericProjectId]);

  useEffect(() => {
    if (
      hasRequestedCameraSessionRef.current ||
      Number.isNaN(numericSessionId) ||
      currentProjectSession?.in_progress === false
    ) {
      return;
    }

    hasRequestedCameraSessionRef.current = true;

    const openCameraConnection = async () => {
      try {
        const nextCameraSession = await createCameraSession(numericSessionId);

        setCameraSession(nextCameraSession);
        setCameraSessionError(null);
      } catch (error) {
        console.error('Failed to create camera session', error);
        setCameraSessionError('카메라 연결 세션을 생성하지 못했습니다.');
      }
    };

    void openCameraConnection();
  }, [currentProjectSession?.in_progress, numericSessionId]);

  useEffect(() => {
    if (!isCameraGateOpen || Number.isNaN(numericSessionId)) {
      return;
    }

    let ignore = false;

    const loadRehearsalStatus = async () => {
      try {
        const status = await getRehearsalSessionStatus(numericSessionId);

        if (!ignore && isStartedRehearsalStatus(status)) {
          enterRehearsal();
        }
      } catch (error) {
        console.error('Failed to get rehearsal status', error);
      }
    };

    void loadRehearsalStatus();
    const intervalId = window.setInterval(() => {
      void loadRehearsalStatus();
    }, 1000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [enterRehearsal, isCameraGateOpen, numericSessionId]);

  useEffect(() => {
    if (
      !cameraSession ||
      isCameraGateOpen ||
      hasShownUploadCompleteRef.current
    ) {
      return;
    }

    const loadStatus = async () => {
      try {
        const nextStatus = await getCameraSessionStatus(
          cameraSession.session_id,
        );
        applyCameraStatus(nextStatus);
      } catch (error) {
        console.error('Failed to get camera session status', error);
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applyCameraStatus, cameraSession, isCameraGateOpen]);

  useEffect(() => {
    if (!logoNavigationMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLogoNavigationMessage('');
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [logoNavigationMessage]);

  useEffect(() => {
    if (recordingStartedAt === null) {
      return;
    }

    const updateElapsed = () => {
      setRecordingElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000)),
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [recordingStartedAt]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFeedbackInputDisabled) return;

      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (event.code !== 'Space' || isTyping) return;

      event.preventDefault();
      handleStartTimestamp();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleStartTimestamp, isFeedbackInputDisabled]);

  const startRehearsal = async () => {
    if (Number.isNaN(numericSessionId)) {
      return;
    }

    if (!isSessionOwner) {
      setCameraSessionError('세션 소유자만 리허설을 시작할 수 있습니다.');
      return;
    }

    try {
      await startRehearsalSession(numericSessionId);
      enterRehearsal();
    } catch (error) {
      console.error('Failed to start rehearsal', error);
      setCameraSessionError('리허설 시작 상태를 동기화하지 못했습니다.');
    }
  };

  const openActorMapping = () => {
    if (Number.isNaN(numericProjectId)) {
      return;
    }

    sessionStorage.removeItem(rehearsalStartedStorageKey);

    navigate(
      `/project/${numericProjectId}/workspace/${activeSessionId}/actors`,
      {
        state: {
          projectSessionTitle: sessionTitle,
          sessionOwnerId,
          allowActorMapping: true,
        },
      },
    );
  };

  const cameraSessionSlot = isVideoUploadInProgress ? (
    <div className="reaction-ui-font flex h-full w-full items-center justify-center">
      <div className="w-80 max-w-full rounded-2xl border border-white/35 bg-[#efe6de]/88 p-5 text-center text-[#2d1715] shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <LoadingSpinner
          label="비디오 업로드 중입니다"
          size="sm"
          className="[&>span:last-child]:text-[#431B1B]/72"
        />
      </div>
    </div>
  ) : isCameraGateOpen ? (
    cameraSession ? (
      <CameraSessionModal
        session={cameraSession}
        sessionName={sessionTitle}
        onStart={startRehearsal}
        onStatusChange={applyCameraStatus}
        variant="panel"
        isOwner={isSessionOwner}
      />
    ) : (
      <div className="reaction-ui-font flex h-full w-full items-center justify-center">
        <div className="w-80 max-w-full rounded-2xl border border-white/35 bg-[#efe6de]/88 p-5 text-center text-[#2d1715] shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <LoadingSpinner
            label="카메라 연결 준비 중"
            size="sm"
            className="[&>span:last-child]:text-[#431B1B]/72"
          />
          <p className="mt-2 text-sm font-semibold text-[#806b61]">
            {cameraSessionError ??
              (isSessionOwner
                ? 'QR 연결 세션을 생성하고 있습니다.'
                : '카메라 연결중입니다.')}
          </p>
        </div>
      </div>
    )
  ) : feedback.isLoadingFeedbacks || isLoadingActors ? (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner
        label={
          isLoadingActors
            ? '배우 목록을 불러오는 중입니다'
            : '피드백을 불러오는 중입니다'
        }
      />
    </div>
  ) : null;

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader
        align="left"
        isLogoNavigationDisabled={isLogoNavigationLocked}
        onBlockedLogoClick={() => {
          setLogoNavigationMessage(
            '리허설 진행중에는 홈으로 이동할 수 없습니다.',
          );
        }}
      />
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-[1320px] flex-col overflow-hidden px-4 pb-7 pt-24 sm:px-6 lg:px-12">
        <div className="reaction-ui-font flex shrink-0 items-center justify-between gap-4 text-sm font-semibold text-[#eee7dc]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">
              My Projects / {projectTitle} / {sessionTitle}
            </span>
            <Video
              size={20}
              fill={recordingIndicatorColor}
              stroke={recordingIndicatorColor}
              strokeWidth={2.4}
              className={
                isRecording ? 'reaction-recording-icon shrink-0' : 'shrink-0'
              }
              aria-hidden="true"
            />
            {shouldShowRecordingTime && (
              <span
                className={[
                  'rounded-full px-2.5 py-1 text-xs font-bold',
                  isRecording
                    ? 'reaction-recording-time border border-[#D15757]/70 bg-[#431B1B]/42 text-[#fff8ef]'
                    : 'border border-[#9f9a95]/60 bg-[#5f5b57]/38 text-[#d8d3ce]',
                ].join(' ')}
              >
                {isRecording ? 'REC' : 'STOP'} {recordingTime}
              </span>
            )}
            {actorsError && (
              <span className="truncate text-xs font-bold text-[#ffb4a8]">
                {actorsError}
              </span>
            )}
            {logoNavigationMessage && (
              <span className="truncate text-xs font-bold text-[#ffb4a8]">
                {logoNavigationMessage}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#eee7dc] transition hover:bg-white/12 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="설정"
            >
              <Settings size={17} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,0.82fr)] items-stretch gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.72fr)] lg:grid-rows-1">
          <section
            className={[
              'grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(112px,0.18fr)] gap-4 transition',
              isFeedbackInputDisabled ? 'pointer-events-none opacity-45' : '',
            ].join(' ')}
          >
            <MovementArea
              actors={actors}
              selectedActors={feedback.selectedActors}
              timestamp={feedback.timestamp}
              content={feedback.content}
              onTimestampStart={feedback.handleStartTimestamp}
              onContentChange={feedback.setContent}
              onSubmit={feedback.handleSubmit}
            />

            <ActorTagBar
              actors={actors}
              selectedActors={feedback.selectedActors}
              onActorSelect={feedback.toggleSelectedActor}
            />
          </section>

          <FeedbackPanel
            actors={actors}
            feedbacks={feedback.feedbacks}
            selectedActors={feedback.selectedActors}
            timestamp={feedback.timestamp}
            content={feedback.content}
            editingId={feedback.editingId}
            editingContent={feedback.editingContent}
            onActorSelect={feedback.addSelectedActor}
            onActorBackspace={feedback.removeLastSelectedActor}
            onTimestampStart={feedback.handleStartTimestamp}
            onContentChange={feedback.setContent}
            onSubmit={feedback.handleSubmit}
            onEdit={feedback.handleEdit}
            onEditContentChange={feedback.setEditingContent}
            onEditSave={feedback.handleEditSave}
            onEditCancel={feedback.handleEditCancel}
            onDelete={feedback.handleDelete}
            onToggleUrgent={feedback.handleToggleUrgent}
            feedbackListSlot={cameraSessionSlot}
            isInteractionDisabled={isFeedbackInputDisabled}
          />
        </div>
      </div>

      {showUploadCompleteModal && (
        <VideoUploadCompleteModal
          onConfirm={openActorMapping}
          confirmLabel="태그 매칭하기"
        />
      )}
    </main>
  );
}
