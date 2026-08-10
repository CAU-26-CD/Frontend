import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, Video } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  getProjectSessions,
  createCameraSession,
  getRehearsalSessionStatus,
  startRehearsalSession,
} from '../apis/session';
import { getProjectScript, isScriptNotFoundError } from '../apis/script';
import type {
  CameraSessionStatusResponse,
  CreateCameraSessionResponse,
  CreateProjectSessionResponse,
  RehearsalSessionStatusResponse,
} from '../apis/session';
import type { ProjectScript } from '../apis/script';
import { listProjectActors } from '../apis/actor';
import { useFeedback } from '../hooks/useFeedback';
import { useProjectActorsRealtime } from '../hooks/useProjectActorsRealtime';
import { useProjectBreadcrumb } from '../hooks/useProjectBreadcrumb';
import { useRealtimeScope } from '../hooks/useRealtimeScope';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import MovementArea from '../components/feedback/MovementArea';
import LoadingSpinner from '../components/LoadingSpinner';
import WalkingLoadingPanel from '../components/WalkingLoadingPanel';
import CameraSessionModal from '../components/modals/CameraSessionModal';
import VideoUploadLoadingModal from '../components/modals/VideoUploadLoadingModal';
import VideoUploadRequestModal from '../components/modals/VideoUploadRequestModal';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import ScriptFeedbackWorkspacePage from './ScriptFeedbackWorkspacePage';
import type { SelectedFeedbackTarget } from './ScriptFeedbackWorkspacePage';
import { realtimeClient } from '../realtime';
import type { Actor, Feedback } from '../types/feedback';
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

const VIDEO_UPLOAD_COMPLETE_STATUSES = new Set([
  'done',
  'complete',
  'completed',
  'uploaded',
]);
const VIDEO_UPLOAD_IN_PROGRESS_STATUSES = new Set([
  'stop',
  'stopped',
  'uploading',
]);
const SESSION_POLL_INTERVAL_MS = 1000;
type ScriptLookupStatus = 'loading' | 'available' | 'notFound' | 'error';

const isStartedRehearsalStatus = (status: RehearsalSessionStatusResponse) =>
  status.started;
const isSessionMatchingCompleted = (
  session:
    | {
        matching_completed?: unknown;
      }
    | null
    | undefined,
) => {
  if (!session) {
    return false;
  }

  const matchingCompleted = session.matching_completed as unknown;

  return (
    matchingCompleted === true ||
    matchingCompleted === 1 ||
    String(matchingCompleted).toLowerCase() === 'true'
  );
};
const parseRecordingStartedAt = (value: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : timestamp;
};
const normalizeCameraStatus = (status: string | null | undefined) =>
  status
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_') ?? '';
const isCameraConnectedStatus = (normalizedStatus: string) =>
  normalizedStatus === 'connect' || normalizedStatus === 'connected';
const hasCameraVideoUrl = (status: CameraSessionStatusResponse) =>
  Boolean(status.video_url?.trim());
const isVideoUploadCompleteStatus = (
  normalizedStatus: string,
  status: CameraSessionStatusResponse,
) =>
  VIDEO_UPLOAD_COMPLETE_STATUSES.has(normalizedStatus) ||
  hasCameraVideoUrl(status);
const isVideoUploadStartedStatus = (
  normalizedStatus: string,
  status: CameraSessionStatusResponse,
) =>
  VIDEO_UPLOAD_IN_PROGRESS_STATUSES.has(normalizedStatus) ||
  isVideoUploadCompleteStatus(normalizedStatus, status);
const hasRecordingEvidence = (
  normalizedStatus: string,
  status: CameraSessionStatusResponse,
) =>
  normalizedStatus === 'recording' ||
  Boolean(status.recording_started_at) ||
  (typeof status.recording_elapsed_seconds === 'number' &&
    Number.isFinite(status.recording_elapsed_seconds) &&
    status.recording_elapsed_seconds > 0);
const getRecordingStartedAtFromStatus = (
  status: CameraSessionStatusResponse,
) => {
  const startedAt = parseRecordingStartedAt(status.recording_started_at);

  if (startedAt !== null) {
    return startedAt;
  }

  if (
    typeof status.recording_elapsed_seconds === 'number' &&
    Number.isFinite(status.recording_elapsed_seconds)
  ) {
    return Date.now() - Math.max(0, status.recording_elapsed_seconds) * 1000;
  }

  return null;
};

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
  const [cameraStatusText, setCameraStatusText] = useState('');
  const [logoNavigationMessage, setLogoNavigationMessage] = useState('');
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null,
  );
  const [isRecordingFinalized, setIsRecordingFinalized] = useState(false);
  const [hasVideoUploadStarted, setHasVideoUploadStarted] = useState(false);
  const [isRehearsalEntryBlocked, setIsRehearsalEntryBlocked] = useState(false);
  const [actors, setActors] = useState<Actor[]>([]);
  const [isLoadingActors, setIsLoadingActors] = useState(false);
  const [actorsError, setActorsError] = useState<string | null>(null);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const recordingOffsetRef = useRef({
    recordingStartedAt: null as number | null,
    recordingElapsedSeconds: 0,
  });
  const [selectedFeedbackTarget, setSelectedFeedbackTarget] =
    useState<SelectedFeedbackTarget>({
      feedback: null,
      version: 0,
    });
  const [scriptLookupStatus, setScriptLookupStatus] =
    useState<ScriptLookupStatus>('loading');
  const [projectScript, setProjectScript] = useState<ProjectScript | null>(
    null,
  );
  const [scriptLookupMessage, setScriptLookupMessage] = useState('');
  const hasRequestedCameraSessionRef = useRef(false);
  const hasShownUploadCompleteRef = useRef(false);
  const hasCameraRecordingStartedRef = useRef(false);
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
  useEffect(() => {
    recordingOffsetRef.current = {
      recordingStartedAt,
      recordingElapsedSeconds,
    };
  }, [recordingElapsedSeconds, recordingStartedAt]);

  const getCurrentRecordingOffsetSeconds = useCallback(() => {
    const recordingOffset = recordingOffsetRef.current;

    if (recordingOffset.recordingStartedAt === null) {
      return recordingOffset.recordingElapsedSeconds;
    }

    return Math.max(
      0,
      Math.floor((Date.now() - recordingOffset.recordingStartedAt) / 1000),
    );
  }, []);
  const feedback = useFeedback(
    activeSessionId,
    getCurrentRecordingOffsetSeconds,
    currentUserId,
    numericProjectId,
    scriptLookupStatus === 'available' ? 'v2' : 'v1',
    scriptLookupStatus !== 'loading',
  );
  const ownFeedbacks = useMemo(
    () =>
      feedback.feedbacks.filter(
        (item) => currentUserId !== null && item.createdByUserId === currentUserId,
      ),
    [currentUserId, feedback.feedbacks],
  );
  useRealtimeScope(
    {
      project_id: numericProjectId,
      session_id: activeSessionId,
    },
    !Number.isNaN(numericProjectId) && activeSessionId.length > 0,
  );
  useProjectActorsRealtime({
    projectId: numericProjectId,
    sessionId: activeSessionId,
    enabled: !Number.isNaN(numericProjectId),
    setActors,
  });
  const { handleStartTimestamp } = feedback;
  const { projectTitle, sessionTitle } = useProjectBreadcrumb(
    numericProjectId,
    numericSessionId,
    {
      fallbackSessionTitle:
        routeState?.projectSessionTitle ?? currentProjectSession?.title,
    },
  );

  useEffect(() => {
    if (Number.isNaN(numericProjectId)) {
      setProjectScript(null);
      setScriptLookupStatus('notFound');
      return;
    }

    let ignore = false;

    const loadProjectScript = async () => {
      setScriptLookupStatus('loading');
      setScriptLookupMessage('');
      setProjectScript(null);

      try {
        const nextScript = await getProjectScript(numericProjectId);

        if (ignore) {
          return;
        }

        setProjectScript(nextScript);
        setScriptLookupStatus('available');
      } catch (error) {
        if (ignore) {
          return;
        }

        setProjectScript(null);

        if (isScriptNotFoundError(error)) {
          setScriptLookupStatus('notFound');
          return;
        }

        setScriptLookupMessage(
          '대본 정보를 확인하지 못해 기본 레이아웃으로 표시합니다.',
        );
        setScriptLookupStatus('error');
      }
    };

    void loadProjectScript();

    return () => {
      ignore = true;
    };
  }, [numericProjectId]);

  const rehearsalStartedStorageKey = `reaction-camera-started:${activeSessionId}`;
  const hasExplicitSessionOwnerFlag =
    typeof routeState?.isSessionOwner === 'boolean';
  const isExplicitSessionOwner = routeState?.isSessionOwner === true;
  const isSessionOwnerKnown =
    hasExplicitSessionOwnerFlag || sessionOwnerId !== null;
  const isSessionOwner =
    isExplicitSessionOwner ||
    (currentUserId !== null && sessionOwnerId === currentUserId);
  const isRecording = cameraStatusText === 'recording' && !isRecordingFinalized;
  const isCameraRecordingEnded = cameraStatusText === 'end';
  const isCameraUploadDone =
    isSessionOwner && VIDEO_UPLOAD_COMPLETE_STATUSES.has(cameraStatusText);
  const isNonOwnerWaitingForMatching =
    !isSessionOwner &&
    hasVideoUploadStarted &&
    !isSessionMatchingCompleted(currentProjectSession);
  const isVideoUploadInProgress =
    (isSessionOwner && hasVideoUploadStarted && !isCameraUploadDone) ||
    isNonOwnerWaitingForMatching;
  const shouldShowVideoUploadRequestOverlay =
    !isCameraGateOpen && isCameraRecordingEnded && !hasVideoUploadStarted;
  const shouldShowVideoUploadOverlay =
    !isCameraGateOpen && isVideoUploadInProgress;
  const isFeedbackInputDisabled =
    isCameraGateOpen ||
    isRecordingFinalized ||
    shouldShowVideoUploadRequestOverlay ||
    isVideoUploadInProgress;
  const isLogoNavigationLocked =
    shouldShowVideoUploadRequestOverlay ||
    isVideoUploadInProgress ||
    (!isRecordingFinalized &&
      (isCameraConnectedStatus(cameraStatusText) ||
        cameraStatusText === 'recording'));
  const shouldShowRecordingTime = isRecording || isRecordingFinalized;
  const recordingIndicatorColor = isRecordingFinalized ? '#9f9a95' : '#D15757';
  const recordingTime = `${String(
    Math.floor(recordingElapsedSeconds / 60),
  ).padStart(2, '0')}:${String(recordingElapsedSeconds % 60).padStart(2, '0')}`;

  const routeAfterVideoUploadDone = useCallback(() => {
    if (!isSessionOwnerKnown || hasShownUploadCompleteRef.current) {
      return;
    }

    setHasVideoUploadStarted(true);
    setIsRecordingFinalized(true);
    setRecordingElapsedSeconds(getCurrentRecordingOffsetSeconds());
    setRecordingStartedAt(null);
    hasShownUploadCompleteRef.current = true;
    sessionStorage.removeItem(rehearsalStartedStorageKey);

    if (Number.isNaN(numericProjectId) || !activeSessionId) {
      return;
    }

    if (isSessionOwner) {
      navigate(
        `/project/${numericProjectId}/workspace/${activeSessionId}/actors`,
        {
          replace: true,
          state: {
            projectSessionTitle: sessionTitle,
            sessionOwnerId,
            allowActorMapping: true,
          },
        },
      );
      return;
    }

    navigate(
      `/project/${numericProjectId}/workspace/${activeSessionId}/actors/waiting`,
      {
        replace: true,
        state: {
          projectSessionTitle: sessionTitle,
        },
      },
    );
  }, [
    activeSessionId,
    getCurrentRecordingOffsetSeconds,
    isSessionOwner,
    isSessionOwnerKnown,
    navigate,
    numericProjectId,
    rehearsalStartedStorageKey,
    sessionOwnerId,
    sessionTitle,
  ]);

  const applyCameraStatus = useCallback(
    (nextStatus: CameraSessionStatusResponse) => {
      const normalizedStatus = normalizeCameraStatus(nextStatus.status);
      const isUploadComplete = isVideoUploadCompleteStatus(
        normalizedStatus,
        nextStatus,
      );
      const hasStartedRecording =
        hasCameraRecordingStartedRef.current ||
        hasRecordingEvidence(normalizedStatus, nextStatus);

      setCameraStatusText(normalizedStatus);

      if (hasStartedRecording) {
        hasCameraRecordingStartedRef.current = true;
      }

      if (isVideoUploadStartedStatus(normalizedStatus, nextStatus)) {
        setHasVideoUploadStarted(true);
      }

      if (normalizedStatus === 'recording') {
        const serverRecordingStartedAt =
          getRecordingStartedAtFromStatus(nextStatus);

        setIsRecordingFinalized(false);

        if (serverRecordingStartedAt !== null) {
          setRecordingStartedAt(serverRecordingStartedAt);
          setRecordingElapsedSeconds(
            Math.max(
              0,
              Math.floor((Date.now() - serverRecordingStartedAt) / 1000),
            ),
          );
        } else {
          setRecordingStartedAt((current) => current ?? Date.now());
        }
      }

      if (normalizedStatus === 'end') {
        setIsRecordingFinalized(true);
        setRecordingElapsedSeconds(getCurrentRecordingOffsetSeconds());
        setRecordingStartedAt(null);
      }

      if (isUploadComplete && isSessionOwner) {
        routeAfterVideoUploadDone();
      }
    },
    [
      getCurrentRecordingOffsetSeconds,
      isSessionOwner,
      routeAfterVideoUploadDone,
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

    const unsubscribe = realtimeClient.subscribe(
      'session.status.changed',
      (event) => {
        if (
          event.scope?.project_id != null &&
          event.scope.project_id !== numericProjectId
        ) {
          return;
        }
        if (String(event.payload.session_id) !== String(numericSessionId)) {
          return;
        }

        setCurrentProjectSession((currentSession) =>
          currentSession
            ? {
                ...currentSession,
                ...event.payload,
              }
            : ({
                project_id: numericProjectId,
                title: sessionTitle,
                s_category: '',
                created_at: '',
                in_progress: true,
                ...event.payload,
              } as CreateProjectSessionResponse),
        );

        const hasStarted =
          event.payload.started === true ||
          event.payload.rehearsal_started === true ||
          event.payload.status === 'started' ||
          event.payload.status === 'recording';

        if (hasStarted && isCameraGateOpen) {
          enterRehearsal();
        }

        if (isSessionMatchingCompleted(event.payload)) {
          navigate(
            `/project/${numericProjectId}/workspace/${numericSessionId}/review`,
            {
              replace: true,
              state: {
                projectSessionTitle: event.payload.title ?? sessionTitle,
              },
            },
          );
        }
      },
    );

    return unsubscribe;
  }, [
    enterRehearsal,
    isCameraGateOpen,
    navigate,
    numericProjectId,
    numericSessionId,
    sessionTitle,
  ]);

  useEffect(() => {
    if (Number.isNaN(numericSessionId)) {
      return;
    }

    const unsubscribe = realtimeClient.subscribe(
      'camera.status.changed',
      (event) => {
        const matchesDbSession =
          event.payload.db_session_id === numericSessionId ||
          String(event.scope?.session_id) === String(numericSessionId);
        const matchesCameraSession =
          cameraSession !== null &&
          event.payload.session_id === cameraSession.session_id;

        if (!matchesDbSession && !matchesCameraSession) {
          return;
        }

        applyCameraStatus(event.payload);
      },
    );

    return unsubscribe;
  }, [applyCameraStatus, cameraSession, numericSessionId]);

  useEffect(() => {
    if (Number.isNaN(numericProjectId) || Number.isNaN(numericSessionId)) {
      return;
    }

    let ignore = false;

    const loadCurrentSession = async () => {
      try {
        const sessions = await getProjectSessions(numericProjectId, {
          refresh: true,
        });
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

        if (isSessionMatchingCompleted(matchedSession)) {
          navigate(
            `/project/${numericProjectId}/workspace/${numericSessionId}/review`,
            {
              replace: true,
              state: {
                projectSessionTitle: matchedSession?.title ?? sessionTitle,
              },
            },
          );
          return;
        }

        const hasStarted = sessionStorage.getItem(rehearsalStartedStorageKey);

        if (!hasStarted && matchedSession?.in_progress) {
          try {
            const rehearsalStatus =
              await getRehearsalSessionStatus(numericSessionId);

            if (rehearsalStatus.started) {
              setIsRehearsalEntryBlocked(true);
              setIsCameraGateOpen(false);
              return;
            }
          } catch (error) {
            console.error('Failed to verify rehearsal entry status', error);
          }
        }

        setIsRehearsalEntryBlocked(false);

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
    sessionTitle,
  ]);

  useEffect(() => {
    if (
      Number.isNaN(numericProjectId) ||
      Number.isNaN(numericSessionId) ||
      isSessionOwner
    ) {
      return;
    }

    let ignore = false;

    const loadSessionCompletionStatus = async () => {
      try {
        const sessions = await getProjectSessions(numericProjectId, {
          refresh: true,
        });
        const matchedSession = sessions.find(
          (session) => session.session_id === numericSessionId,
        );

        if (ignore || !matchedSession) {
          return;
        }

        setCurrentProjectSession(matchedSession);

        const nextOwnerId =
          getSessionOwnerId(matchedSession) ??
          getStoredSessionOwnerId(numericSessionId) ??
          routeSessionOwnerId ??
          null;

        if (nextOwnerId !== null) {
          setSessionOwnerId(nextOwnerId);
          saveSessionOwnerId(numericSessionId, nextOwnerId);
        }

        if (isSessionMatchingCompleted(matchedSession)) {
          navigate(
            `/project/${numericProjectId}/workspace/${numericSessionId}/review`,
            {
              replace: true,
              state: {
                projectSessionTitle: matchedSession.title ?? sessionTitle,
              },
            },
          );
        }
      } catch (error) {
        console.error('Failed to poll session completion status', error);
      }
    };

    void loadSessionCompletionStatus();
    const intervalId = window.setInterval(() => {
      void loadSessionCompletionStatus();
    }, SESSION_POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [
    isSessionOwner,
    navigate,
    numericProjectId,
    numericSessionId,
    routeSessionOwnerId,
    sessionTitle,
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
      isRehearsalEntryBlocked ||
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
  }, [
    currentProjectSession?.in_progress,
    isRehearsalEntryBlocked,
    numericSessionId,
  ]);

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

  const handleFeedbackSelect = useCallback((nextFeedback: Feedback) => {
    setSelectedFeedbackTarget((currentTarget) => ({
      feedback: nextFeedback,
      version: currentTarget.version + 1,
    }));
  }, []);

  const isScriptWorkspaceAvailable =
    scriptLookupStatus === 'available' && projectScript !== null;
  const shouldDisableWorkspace =
    shouldShowVideoUploadRequestOverlay || shouldShowVideoUploadOverlay;
  const { clearDraft, handleEditCancel } = feedback;

  useEffect(() => {
    if (!shouldDisableWorkspace) {
      return;
    }

    clearDraft();
    handleEditCancel();
    setSelectedFeedbackTarget((currentTarget) =>
      currentTarget.feedback
        ? {
            feedback: null,
            version: currentTarget.version + 1,
          }
        : currentTarget,
    );
  }, [clearDraft, handleEditCancel, shouldDisableWorkspace]);

  const feedbackListSlot =
    !isCameraGateOpen && (feedback.isLoadingFeedbacks || isLoadingActors) ? (
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

  const cameraSessionOverlay = isCameraGateOpen ? (
    cameraSession ? (
      <CameraSessionModal
        session={cameraSession}
        sessionName={sessionTitle}
        onStart={startRehearsal}
        onStatusChange={applyCameraStatus}
        isOwner={isSessionOwner}
      />
    ) : (
      <div className="reaction-ui-font fixed inset-0 z-50 flex items-center justify-center bg-black/18 px-4 backdrop-blur-sm">
        <div className="w-80 max-w-full rounded-2xl border border-white/35 bg-[#efe6de]/88 p-5 text-center text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
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
  ) : null;

  if (isRehearsalEntryBlocked) {
    return (
      <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
        <DesignedHeader align="left" />
        <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

        <div className="relative z-10 mx-auto flex h-screen w-full max-w-[960px] flex-col overflow-hidden px-4 pb-7 pt-24 sm:px-6 lg:px-12">
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

          <section className="reaction-ui-font flex flex-1 items-center justify-center text-center">
            <WalkingLoadingPanel
              title="리허설 진행중입니다"
              description="이미 시작된 세션에는 새로 진입할 수 없습니다."
            />
          </section>
        </div>
      </main>
    );
  }

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

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-[1320px] flex-col gap-4 overflow-hidden px-4 pb-7 pt-24 sm:px-6 lg:px-12">
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
            {scriptLookupMessage && (
              <span className="truncate text-xs font-bold text-[#ffb4a8]">
                {scriptLookupMessage}
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

        {scriptLookupStatus === 'loading' && (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <LoadingSpinner label="리허설 준비를 시작합니다" />
          </div>
        )}

        {scriptLookupStatus !== 'loading' &&
          isScriptWorkspaceAvailable &&
          !shouldDisableWorkspace && (
          <ScriptFeedbackWorkspacePage
            script={projectScript}
            sessionId={numericSessionId}
            userId={currentUserId}
            actors={actors}
            isLoadingActors={isLoadingActors}
            feedback={feedback}
            isFeedbackInputDisabled={isFeedbackInputDisabled}
            shouldDisableWorkspace={shouldDisableWorkspace}
            selectedFeedbackTarget={selectedFeedbackTarget}
            setSelectedFeedbackTarget={setSelectedFeedbackTarget}
            onFeedbackSelect={handleFeedbackSelect}
            getCurrentOffsetSeconds={getCurrentRecordingOffsetSeconds}
          />
        )}

        {scriptLookupStatus !== 'loading' &&
          !isScriptWorkspaceAvailable &&
          !shouldDisableWorkspace && (
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,0.82fr)] items-stretch gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.72fr)] lg:grid-rows-1">
            <section
              className={[
                'grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(112px,0.18fr)] gap-4 transition',
                isFeedbackInputDisabled
                  ? 'pointer-events-none opacity-45'
                  : '',
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

            <div
              className={[
                'h-full min-h-0 transition',
                shouldDisableWorkspace ? 'pointer-events-none opacity-45' : '',
              ].join(' ')}
            >
              <FeedbackPanel
                actors={actors}
                feedbacks={ownFeedbacks}
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
                feedbackListSlot={feedbackListSlot}
                isInteractionDisabled={isFeedbackInputDisabled}
              />
            </div>
          </div>
        )}
      </div>

      {cameraSessionOverlay}

      {shouldShowVideoUploadOverlay && <VideoUploadLoadingModal />}

      {shouldShowVideoUploadRequestOverlay && <VideoUploadRequestModal />}
    </main>
  );
}
