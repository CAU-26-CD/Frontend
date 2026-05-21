import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings, Video } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createCameraSession,
  analyzeSessionVideo,
  getCameraSessionStatus,
  getProjectSessions,
  stopCameraSession,
} from '../apis/session';
import type {
  CameraSessionStatusResponse,
  CreateCameraSessionResponse,
  CreateProjectSessionResponse,
} from '../apis/session';
import { actors } from '../data/actors';
import { useFeedback } from '../hooks/useFeedback';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import MovementArea from '../components/feedback/MovementArea';
import LoadingSpinner from '../components/LoadingSpinner';
import CameraSessionModal from '../components/modals/CameraSessionModal';
import EndRehearsalConfirmModal from '../components/modals/EndRehearsalConfirmModal';
import VideoUploadCompleteModal from '../components/modals/VideoUploadCompleteModal';
import DesignedHeader from '../components/sidebar/DesignedHeader';

type FeedbackRouteState = {
  openCameraSession?: boolean;
  projectSessionTitle?: string;
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
  const [showUploadCompleteModal, setShowUploadCompleteModal] = useState(false);
  const [showEndRehearsalModal, setShowEndRehearsalModal] = useState(false);
  const [cameraStatusText, setCameraStatusText] = useState('');
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null,
  );
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const hasRequestedCameraSessionRef = useRef(false);
  const hasShownUploadCompleteRef = useRef(false);
  const parsedProjectId = Number(projectId);
  const numericProjectId = parsedProjectId;
  const activeSessionId = sessionId ?? '';
  const numericSessionId = Number(activeSessionId);
  const getCurrentRecordingOffsetSeconds = useCallback(() => {
    if (recordingStartedAt === null) {
      return recordingElapsedSeconds;
    }

    return Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000));
  }, [recordingElapsedSeconds, recordingStartedAt]);
  const feedback = useFeedback(activeSessionId, getCurrentRecordingOffsetSeconds);
  const { handleStartTimestamp } = feedback;
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle =
    routeState?.projectSessionTitle ??
    currentProjectSession?.title ??
    (Number.isNaN(numericSessionId) ? 'Session' : `Session ${numericSessionId}`);
  const rehearsalStartedStorageKey = `reaction-camera-started:${activeSessionId}`;
  const isRecording = cameraStatusText === 'recording';
  const recordingTime = `${String(Math.floor(recordingElapsedSeconds / 60)).padStart(
    2,
    '0',
  )}:${String(recordingElapsedSeconds % 60).padStart(2, '0')}`;

  const applyCameraStatus = (nextStatus: CameraSessionStatusResponse) => {
    const normalizedStatus = nextStatus.status?.toLowerCase() ?? '';

    setCameraStatusText(normalizedStatus);

    if (normalizedStatus === 'recording') {
      setRecordingStartedAt((current) => current ?? Date.now());
    }

    if (normalizedStatus === 'stop' || normalizedStatus === 'stopped') {
      setRecordingElapsedSeconds(getCurrentRecordingOffsetSeconds());
      setRecordingStartedAt(null);
    }

    if (normalizedStatus === 'done' || nextStatus.video_url) {
      hasShownUploadCompleteRef.current = true;
      setRecordingElapsedSeconds(getCurrentRecordingOffsetSeconds());
      setRecordingStartedAt(null);
      setShowUploadCompleteModal(true);
    }
  };

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

        const isInProgress = matchedSession?.in_progress !== false;
        const hasStarted = sessionStorage.getItem(rehearsalStartedStorageKey);

        if (isInProgress && !hasStarted) {
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
  }, [numericProjectId, numericSessionId, rehearsalStartedStorageKey]);

  useEffect(() => {
    if (
      !isCameraGateOpen ||
      hasRequestedCameraSessionRef.current ||
      Number.isNaN(numericSessionId)
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
  }, [isCameraGateOpen, numericSessionId]);

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
  }, [
    cameraSession,
    isCameraGateOpen,
  ]);

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
      if (isCameraGateOpen) return;

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
  }, [handleStartTimestamp, isCameraGateOpen]);

  const startRehearsal = () => {
    setIsCameraGateOpen(false);
    sessionStorage.setItem(rehearsalStartedStorageKey, 'true');
    navigate(location.pathname, { replace: true, state: null });
  };

  const exitRehearsal = async () => {
    if (Number.isNaN(numericProjectId)) {
      return;
    }

    if (cameraSession) {
      try {
        const stopStatus = await stopCameraSession(cameraSession.session_id);

        if (stopStatus.toLowerCase() === 'stop') {
          setRecordingElapsedSeconds(getCurrentRecordingOffsetSeconds());
          setRecordingStartedAt(null);
          setCameraStatusText('stop');
        }
      } catch (error) {
        console.error('Failed to stop camera session', error);
      }

      setShowEndRehearsalModal(false);
      return;
    }

    sessionStorage.removeItem(rehearsalStartedStorageKey);
    navigate(`/project/${numericProjectId}/workspace`);
  };

  const openActorMapping = async () => {
    if (Number.isNaN(numericProjectId)) {
      return;
    }

    sessionStorage.removeItem(rehearsalStartedStorageKey);
    try {
      await analyzeSessionVideo(numericSessionId);
    } catch (error) {
      console.error('Failed to request video analysis', error);
    }

    navigate(`/project/${numericProjectId}/workspace/${activeSessionId}/actors`, {
      state: {
        shouldAnalyzeVideo: true,
      },
    });
  };

  const cameraSessionSlot = isCameraGateOpen ? (
    cameraSession ? (
      <CameraSessionModal
        session={cameraSession}
        sessionName={sessionTitle}
        onStart={startRehearsal}
        onStatusChange={applyCameraStatus}
        variant="panel"
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
            {cameraSessionError ?? 'QR 연결 세션을 생성하고 있습니다.'}
          </p>
        </div>
      </div>
    )
  ) : feedback.isLoadingFeedbacks ? (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner label="피드백을 불러오는 중입니다" />
    </div>
  ) : null;

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader align="left" />
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-[1320px] flex-col overflow-hidden px-4 pb-7 pt-24 sm:px-6 lg:px-12">
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
              className={isRecording ? 'reaction-recording-icon shrink-0' : 'shrink-0'}
              aria-hidden="true"
            />
            {isRecording && (
              <span className="reaction-recording-time rounded-full border border-[#D15757]/70 bg-[#431B1B]/42 px-2.5 py-1 text-xs font-bold text-[#fff8ef]">
                REC {recordingTime}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEndRehearsalModal(true)}
              className="reaction-glass-pill h-8 mb-2 rounded-full px-4 text-xs font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              리허설 종료하기
            </button>
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
              isCameraGateOpen ? 'pointer-events-none opacity-45' : '',
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
            isSubmitting={feedback.isSubmitting}
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
            isInteractionDisabled={isCameraGateOpen}
          />
        </div>
      </div>

      {showUploadCompleteModal && (
        <VideoUploadCompleteModal
          onCancel={() => setShowUploadCompleteModal(false)}
          onConfirm={openActorMapping}
          confirmLabel="태그 매칭하기"
        />
      )}

      {showEndRehearsalModal && (
        <EndRehearsalConfirmModal
          onCancel={() => setShowEndRehearsalModal(false)}
          onConfirm={exitRehearsal}
        />
      )}
    </main>
  );
}
