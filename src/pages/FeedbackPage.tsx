import { useEffect } from 'react';
import { actors } from '../data/actors';
import { useFeedback } from '../hooks/useFeedback';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import MovementArea from '../components/feedback/MovementArea';

export default function RehearsalFeedbackPage() {
  const feedback = useFeedback();
  const { handleStartTimestamp } = feedback;

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
    <main className="h-full min-h-0 bg-neutral-100">
      <div className="mx-auto grid h-full min-h-0 max-w-7xl grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-4 lg:grid-cols-[1fr_420px] lg:grid-rows-1">
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
        />
      </div>
    </main>
  );
}
