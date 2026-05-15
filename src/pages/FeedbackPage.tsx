import { useEffect } from 'react';
import { Settings, Video } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { actors } from '../data/actors';
import { feedbackSessionDummy } from '../data/feedbackSessionDummy';
import { projectDummy } from '../data/projectDummy';
import { useFeedback } from '../hooks/useFeedback';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import MovementArea from '../components/feedback/MovementArea';
import DesignedHeader from '../components/sidebar/DesignedHeader';

export default function RehearsalFeedbackPage() {
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const fallbackSession =
    feedbackSessionDummy.find((session) => session.status === 'inProgress') ??
    feedbackSessionDummy[0];
  const parsedProjectId = Number(projectId);
  const numericProjectId = Number.isNaN(parsedProjectId)
    ? fallbackSession.projectId
    : parsedProjectId;
  const activeSessionId = sessionId ?? String(fallbackSession.id);
  const numericSessionId = Number(activeSessionId);
  const feedback = useFeedback(activeSessionId);
  const { handleStartTimestamp } = feedback;
  const selectedProject = projectDummy.find(
    (project) => project.id === numericProjectId,
  );
  const selectedSession = feedbackSessionDummy.find(
    (session) =>
      session.projectId === numericProjectId &&
      !Number.isNaN(numericSessionId) &&
      session.id === numericSessionId,
  );
  const projectTitle = selectedProject?.title ?? 'Unknown Project';
  const sessionTitle = selectedSession?.title ?? 'Unknown Session';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, [handleStartTimestamp]);

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
              className="shrink-0"
              aria-hidden="true"
            />
          </div>

          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#eee7dc] transition hover:bg-white/12 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="설정"
          >
            <Settings size={17} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,0.82fr)] items-stretch gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.72fr)] lg:grid-rows-1">
          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(112px,0.18fr)] gap-4">
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
          />
        </div>
      </div>
    </main>
  );
}
