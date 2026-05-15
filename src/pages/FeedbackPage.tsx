import { useEffect } from 'react';
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
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const feedback = useFeedback(numericSessionId);
  const { handleStartTimestamp } = feedback;
  const selectedProject = projectDummy.find(
    (project) => project.id === numericProjectId,
  );
  const selectedSession = feedbackSessionDummy.find(
    (session) =>
      session.projectId === numericProjectId && session.id === numericSessionId,
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

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-7xl flex-col overflow-hidden px-4 pb-8 pt-28 sm:px-6 lg:px-8">
        <p className="reaction-ui-font mb-5 shrink-0 text-xs font-semibold text-[#bcb2aa]">
          My Project / {projectTitle} / {sessionTitle}
        </p>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-4 overflow-hidden lg:grid-cols-[1fr_420px] lg:grid-rows-1">
          <section className="flex min-h-0 flex-col gap-4">
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
