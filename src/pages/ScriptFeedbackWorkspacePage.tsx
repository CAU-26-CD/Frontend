import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { FeedbackV2Response } from '../apis/feedback';
import type { ProjectScript } from '../apis/script';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import ScriptMovementPanel from '../components/feedback/ScriptMovementPanel';
import ScriptPdfViewer from '../components/feedback/ScriptPdfViewer';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Actor, Feedback } from '../types/feedback';
import { getScriptActorColorById } from '../utils/scriptFeedbackStyle';

export type SelectedFeedbackTarget = {
  feedback: Feedback | null;
  version: number;
};

type FeedbackController = {
  selectedActors: Actor[];
  timestamp: string | null;
  content: string;
  feedbacks: Feedback[];
  editingId: number | null;
  editingContent: string;
  isLoadingFeedbacks: boolean;
  addSelectedActor: (actor: Actor) => void;
  toggleSelectedActor: (actor: Actor) => void;
  removeLastSelectedActor: () => void;
  setContent: (value: string) => void;
  setEditingContent: (value: string) => void;
  handleStartTimestamp: () => void;
  handleSubmit: () => void;
  handleEdit: (feedback: Feedback) => void;
  handleEditCancel: () => void;
  handleEditSave: (id: number) => void;
  handleDelete: (id: number) => void;
  handleToggleUrgent: (id: number) => void;
  upsertFeedbackResponse: (response: FeedbackV2Response) => Feedback;
};

type ScriptFeedbackWorkspacePageProps = {
  script: ProjectScript;
  sessionId: number;
  userId: number | null;
  actors: Actor[];
  isLoadingActors: boolean;
  feedback: FeedbackController;
  isFeedbackInputDisabled: boolean;
  shouldDisableWorkspace: boolean;
  selectedFeedbackTarget: SelectedFeedbackTarget;
  setSelectedFeedbackTarget: Dispatch<SetStateAction<SelectedFeedbackTarget>>;
  onFeedbackSelect: (feedback: Feedback) => void;
  getCurrentOffsetSeconds: () => number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const secondsToTimestamp = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const hasScriptFeedbackAnchor = (feedback: Feedback): feedback is Feedback & {
  scriptPage: number;
  scriptX: number;
  scriptY: number;
} =>
  typeof feedback.scriptPage === 'number' &&
  Number.isFinite(feedback.scriptPage) &&
  feedback.scriptPage >= 1 &&
  typeof feedback.scriptX === 'number' &&
  Number.isFinite(feedback.scriptX) &&
  feedback.scriptX >= 0 &&
  feedback.scriptX <= 1 &&
  typeof feedback.scriptY === 'number' &&
  Number.isFinite(feedback.scriptY) &&
  feedback.scriptY >= 0 &&
  feedback.scriptY <= 1;

function ScriptInputFeedbackTimeline({
  feedbacks,
  actors,
  pageCount,
  activeFeedbackId,
  scrollProgress,
  onFeedbackSelect,
  onScrollRequest,
}: {
  feedbacks: Feedback[];
  actors: Actor[];
  pageCount: number;
  activeFeedbackId: number | null;
  scrollProgress: number;
  onFeedbackSelect: (feedback: Feedback) => void;
  onScrollRequest: (progress: number) => void;
}) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const anchoredFeedbacks = useMemo(
    () =>
      feedbacks
        .filter(hasScriptFeedbackAnchor)
        .sort(
          (left, right) =>
            left.scriptPage - right.scriptPage || left.scriptY - right.scriptY,
        ),
    [feedbacks],
  );
  const resolvedPageCount = Math.max(
    1,
    pageCount,
    ...anchoredFeedbacks.map((feedback) => feedback.scriptPage),
  );
  const normalizedScrollProgress = clamp(scrollProgress, 0, 1);
  const getProgressFromPointer = useCallback((clientY: number) => {
    const timeline = timelineRef.current;

    if (!timeline) {
      return null;
    }

    const rect = timeline.getBoundingClientRect();
    const trackTop = rect.top + 16;
    const trackHeight = Math.max(1, rect.height - 32);

    return clamp((clientY - trackTop) / trackHeight, 0, 1);
  }, []);
  const requestScrollFromPointer = useCallback(
    (clientY: number) => {
      const nextProgress = getProgressFromPointer(clientY);

      if (nextProgress !== null) {
        onScrollRequest(nextProgress);
      }
    },
    [getProgressFromPointer, onScrollRequest],
  );
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    requestScrollFromPointer(event.clientY);
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      requestScrollFromPointer(event.clientY);
    }
  };
  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <aside
      className="reaction-ui-font flex h-full min-h-0 items-center justify-center"
      aria-label="입력 피드백 위치"
    >
      <div
        ref={timelineRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className={[
          'relative h-full min-h-[220px] w-6 touch-none select-none rounded-full border border-white/18 bg-[#fff8ef]/10 px-2.5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_28px_rgba(0,0,0,0.14)] backdrop-blur-sm',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        ].join(' ')}
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalizedScrollProgress * 100)}
        tabIndex={0}
      >
        <span
          className="absolute bottom-4 left-1/2 top-4 w-[3px] -translate-x-1/2 rounded-full bg-[#fff8ef]/28"
          aria-hidden="true"
        />
        <span
          className="absolute left-1/2 z-10 h-7 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff8ef] shadow-[0_0_14px_rgba(255,248,239,0.42)]"
          style={{
            top: `calc(16px + ${normalizedScrollProgress * 100}% - ${
              normalizedScrollProgress * 32
            }px)`,
          }}
          aria-hidden="true"
        />

        {anchoredFeedbacks.map((feedback) => {
          const markerTop = clamp(
            ((feedback.scriptPage - 1 + feedback.scriptY) /
              resolvedPageCount) *
              100,
            4,
            96,
          );
          const markerColor = getScriptActorColorById(
            actors,
            feedback.actorIds[0],
          );
          const isActive = activeFeedbackId === feedback.id;

          return (
            <button
              key={feedback.id}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onFeedbackSelect(feedback)}
              className={[
                'absolute left-1/2 z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                isActive ? 'scale-110 bg-white/24' : 'hover:scale-110',
              ].join(' ')}
              style={{ top: `${markerTop}%` }}
              aria-label={`${feedback.scriptPage}페이지 피드백으로 이동`}
              title={`${feedback.scriptPage}페이지 ${feedback.timestamp}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/90"
                style={{
                  backgroundColor: markerColor,
                  boxShadow: isActive
                    ? `0 0 12px ${markerColor}, 0 0 26px ${markerColor}a8`
                    : `0 0 10px ${markerColor}8c`,
                }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default function ScriptFeedbackWorkspacePage({
  script,
  sessionId,
  userId,
  actors,
  isLoadingActors,
  feedback,
  isFeedbackInputDisabled,
  shouldDisableWorkspace,
  selectedFeedbackTarget,
  setSelectedFeedbackTarget,
  onFeedbackSelect,
  getCurrentOffsetSeconds,
}: ScriptFeedbackWorkspacePageProps) {
  const [scriptDraftContent, setScriptDraftContent] = useState('');
  const [isScriptDraftOpen, setIsScriptDraftOpen] = useState(false);
  const [pendingScriptFeedbacks, setPendingScriptFeedbacks] = useState<
    Feedback[]
  >([]);
  const [scriptPageCount, setScriptPageCount] = useState(0);
  const [scriptScrollProgress, setScriptScrollProgress] = useState(0);
  const [scriptScrollProgressRequest, setScriptScrollProgressRequest] =
    useState<{
      id: number;
      progress: number;
    } | null>(null);
  const { handleDelete, upsertFeedbackResponse } = feedback;
  const handleFeedbackUpdated = useCallback(
    (updatedFeedback: FeedbackV2Response) => {
      const nextFeedback = upsertFeedbackResponse(updatedFeedback);

      setSelectedFeedbackTarget((currentTarget) => ({
        feedback: nextFeedback,
        version: currentTarget.version + 1,
      }));
    },
    [setSelectedFeedbackTarget, upsertFeedbackResponse],
  );
  const handleFeedbackDelete = useCallback(
    async (targetFeedback: Feedback) => {
      await handleDelete(targetFeedback.id);

      setSelectedFeedbackTarget((currentTarget) =>
        currentTarget.feedback?.id === targetFeedback.id
          ? {
              feedback: null,
              version: currentTarget.version + 1,
            }
          : currentTarget,
      );
    },
    [handleDelete, setSelectedFeedbackTarget],
  );
  const handleFeedbackCreated = useCallback(
    (createdFeedback: FeedbackV2Response, pendingFeedbackId?: number) => {
      upsertFeedbackResponse(createdFeedback);
      if (pendingFeedbackId !== undefined) {
        setPendingScriptFeedbacks((currentFeedbacks) =>
          currentFeedbacks.filter(
            (feedback) => feedback.id !== pendingFeedbackId,
          ),
        );
      }

      setSelectedFeedbackTarget((currentTarget) => ({
        feedback: null,
        version: currentTarget.version + 1,
      }));
    },
    [setSelectedFeedbackTarget, upsertFeedbackResponse],
  );
  const handlePendingFeedbackCreate = useCallback(
    ({
      actorIds,
      actorNames,
      content,
      scriptPage,
      scriptX,
      scriptY,
      videoOffsetSeconds,
    }: {
      actorIds: number[];
      actorNames: string[];
      content: string;
      scriptPage: number;
      scriptX: number;
      scriptY: number;
      videoOffsetSeconds: number;
    }) => {
      const pendingFeedbackId = -(
        Date.now() + Math.floor(Math.random() * 1000)
      );
      const pendingFeedback: Feedback = {
        id: pendingFeedbackId,
        createdByUserId: userId ?? undefined,
        timestamp: secondsToTimestamp(videoOffsetSeconds),
        actorIds,
        actorNames,
        content,
        isUrgent: content.includes('!!!'),
        scriptPage,
        scriptX,
        scriptY,
        aiTags: [],
        analysisStatus: 'analyzing',
        isPersisted: false,
      };

      setPendingScriptFeedbacks((currentFeedbacks) => [
        ...currentFeedbacks,
        pendingFeedback,
      ]);

      return pendingFeedbackId;
    },
    [userId],
  );
  const handlePendingFeedbackRemove = useCallback((feedbackId: number) => {
    setPendingScriptFeedbacks((currentFeedbacks) =>
      currentFeedbacks.filter((feedback) => feedback.id !== feedbackId),
    );
  }, []);
  const ignoreScriptMovementSubmit = useCallback(() => undefined, []);
  const requestScriptScrollProgress = useCallback((progress: number) => {
    setScriptScrollProgressRequest((current) => ({
      id: (current?.id ?? 0) + 1,
      progress,
    }));
  }, []);
  const feedbackListSlot: ReactNode =
    feedback.isLoadingFeedbacks || isLoadingActors ? (
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
  const visibleScriptFeedbacks = useMemo(
    () => [...feedback.feedbacks, ...pendingScriptFeedbacks],
    [feedback.feedbacks, pendingScriptFeedbacks],
  );
  const ownScriptFeedbacks = useMemo(
    () =>
      visibleScriptFeedbacks.filter(
        (scriptFeedback) =>
          userId !== null && scriptFeedback.createdByUserId === userId,
      ),
    [userId, visibleScriptFeedbacks],
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.72fr)_30px_minmax(360px,0.9fr)]">
      <ScriptPdfViewer
        script={script}
        sessionId={sessionId}
        userId={userId}
        actors={actors}
        disabled={isFeedbackInputDisabled}
        selectedFeedback={selectedFeedbackTarget.feedback}
        selectionVersion={selectedFeedbackTarget.version}
        feedbacks={visibleScriptFeedbacks}
        draftContent={scriptDraftContent}
        scrollProgressRequest={scriptScrollProgressRequest}
        getCurrentOffsetSeconds={getCurrentOffsetSeconds}
        onDraftContentChange={setScriptDraftContent}
        onDraftOpenChange={setIsScriptDraftOpen}
        onPageCountChange={setScriptPageCount}
        onScrollProgressChange={setScriptScrollProgress}
        onFeedbackSelect={onFeedbackSelect}
        onFeedbackUpdated={handleFeedbackUpdated}
        onFeedbackDelete={handleFeedbackDelete}
        onPendingFeedbackCreate={handlePendingFeedbackCreate}
        onPendingFeedbackRemove={handlePendingFeedbackRemove}
        onFeedbackCreated={handleFeedbackCreated}
      />

      <div className="hidden min-h-0 overflow-hidden lg:flex">
        <ScriptInputFeedbackTimeline
          feedbacks={visibleScriptFeedbacks}
          actors={actors}
          pageCount={scriptPageCount}
          activeFeedbackId={selectedFeedbackTarget.feedback?.id ?? null}
          scrollProgress={scriptScrollProgress}
          onFeedbackSelect={onFeedbackSelect}
          onScrollRequest={requestScriptScrollProgress}
        />
      </div>

      <section
        className={[
          'grid min-h-0 grid-rows-[minmax(270px,0.5fr)_minmax(0,1fr)_auto] gap-4 overflow-hidden transition',
          shouldDisableWorkspace ? 'pointer-events-none opacity-45' : '',
        ].join(' ')}
      >
        <div
          className={[
            'min-h-0 transition',
            isFeedbackInputDisabled ? 'pointer-events-none opacity-45' : '',
          ].join(' ')}
        >
          <ScriptMovementPanel
            timestamp={isScriptDraftOpen ? '00:00' : null}
            content={scriptDraftContent}
            disabled={isFeedbackInputDisabled || !isScriptDraftOpen}
            onTimestampStart={ignoreScriptMovementSubmit}
            onContentChange={setScriptDraftContent}
            onSubmit={ignoreScriptMovementSubmit}
          />
        </div>

        <div className="h-full min-h-0 pt-1">
          <FeedbackPanel
            actors={actors}
            feedbacks={ownScriptFeedbacks}
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
            mode="listOnly"
            listLayout="fluid"
            listActions="edit"
            selectedFeedbackId={selectedFeedbackTarget.feedback?.id ?? null}
            onFeedbackSelect={onFeedbackSelect}
          />
        </div>

        <ActorTagBar
          actors={actors}
          selectedActors={feedback.selectedActors}
          onActorSelect={feedback.toggleSelectedActor}
          disabled={isFeedbackInputDisabled}
          variant="compact"
          matchScriptColors
        />
      </section>
    </div>
  );
}
