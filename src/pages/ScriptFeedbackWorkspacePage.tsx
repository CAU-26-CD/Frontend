import { useCallback, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { FeedbackV2Response } from '../apis/feedback';
import type { ProjectScript } from '../apis/script';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import ScriptMovementPanel from '../components/feedback/ScriptMovementPanel';
import ScriptPdfViewer from '../components/feedback/ScriptPdfViewer';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Actor, Feedback } from '../types/feedback';

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
    (createdFeedback: FeedbackV2Response) => {
      const nextFeedback = upsertFeedbackResponse(createdFeedback);

      setSelectedFeedbackTarget((currentTarget) => ({
        feedback: nextFeedback,
        version: currentTarget.version + 1,
      }));
    },
    [setSelectedFeedbackTarget, upsertFeedbackResponse],
  );
  const ignoreScriptMovementSubmit = useCallback(() => undefined, []);
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

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.72fr)_minmax(360px,0.9fr)]">
      <ScriptPdfViewer
        script={script}
        sessionId={sessionId}
        userId={userId}
        actors={actors}
        disabled={isFeedbackInputDisabled}
        selectedFeedback={selectedFeedbackTarget.feedback}
        selectionVersion={selectedFeedbackTarget.version}
        feedbacks={feedback.feedbacks}
        draftContent={scriptDraftContent}
        getCurrentOffsetSeconds={getCurrentOffsetSeconds}
        onDraftContentChange={setScriptDraftContent}
        onDraftOpenChange={setIsScriptDraftOpen}
        onFeedbackSelect={onFeedbackSelect}
        onFeedbackUpdated={handleFeedbackUpdated}
        onFeedbackDelete={handleFeedbackDelete}
        onFeedbackCreated={handleFeedbackCreated}
      />

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

        <div className="h-full min-h-0 pt-[30px]">
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
        />
      </section>
    </div>
  );
}
