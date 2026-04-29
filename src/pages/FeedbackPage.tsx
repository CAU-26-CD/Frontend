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
    <main className="min-h-screen bg-neutral-100 p-4 md:p-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col gap-4">
          <MovementArea />

          <ActorTagBar
            actors={actors}
            selectedActor={feedback.selectedActor}
            onSelect={feedback.setSelectedActor}
          />
        </section>

        <FeedbackPanel
          feedbacks={feedback.feedbacks}
          selectedActor={feedback.selectedActor}
          timestamp={feedback.timestamp}
          content={feedback.content}
          editingId={feedback.editingId}
          editingContent={feedback.editingContent}
          onTimestampStart={feedback.handleStartTimestamp}
          onContentChange={feedback.setContent}
          onSubmit={feedback.handleSubmit}
          onEdit={feedback.handleEdit}
          onEditContentChange={feedback.setEditingContent}
          onEditSave={feedback.handleEditSave}
          onEditCancel={feedback.handleEditCancel}
          onDelete={feedback.handleDelete}
        />
      </div>
    </main>
  );
}
