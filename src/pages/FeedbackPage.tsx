import { useEffect } from 'react';
import { actors } from '../data/actors';
import { useFeedback } from '../hooks/useFeedback';
import ActorTagBar from '../components/feedback/ActorTagbar';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import MovementArea from '../components/feedback/MovementArea';

const getShortcutFromEvent = (event: KeyboardEvent) => {
  if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    return null;
  }

  if (event.code.startsWith('Digit')) {
    return `Shift+${event.code.replace('Digit', '')}`;
  }

  if (event.code.startsWith('Numpad')) {
    return `Shift+${event.code.replace('Numpad', '')}`;
  }

  return null;
};

export default function RehearsalFeedbackPage() {
  const feedback = useFeedback();
  const { handleStartTimestamp, setSelectedActor } = feedback;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      const shortcut = getShortcutFromEvent(event);
      const matchedActor = actors.find((actor) => actor.shortcut === shortcut);

      if (matchedActor) {
        event.preventDefault();
        setSelectedActor(matchedActor);
        return;
      }

      if (event.code !== 'Space' || isTyping) return;

      event.preventDefault();
      handleStartTimestamp();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleStartTimestamp, setSelectedActor]);

  return (
    <main className="h-full min-h-0 bg-neutral-100">
      <div className="mx-auto grid h-full min-h-0 max-w-7xl grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-4 lg:grid-cols-[1fr_420px] lg:grid-rows-1">
        <section className="flex min-h-0 flex-col gap-4">
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
