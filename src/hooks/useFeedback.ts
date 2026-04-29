import { useCallback, useState } from 'react';
import type { Actor, Feedback } from '../types/feedback';

export function useFeedback() {
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const handleStartTimestamp = useCallback(() => {
    const now = new Date();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    setTimestamp(`${mm}:${ss}`);
  }, []);

  const handleSubmit = () => {
    if (!selectedActor || !timestamp || !content.trim()) return;

    const newFeedback: Feedback = {
      id: Date.now(),
      timestamp,
      actorId: selectedActor.id,
      content,
      aiTags: [],
      analysisStatus: 'idle',
    };

    setFeedbacks((prev) => [...prev, newFeedback]);
    setContent('');
    setTimestamp(null);
  };

  const handleEdit = (feedback: Feedback) => {
    setEditingId(feedback.id);
    setEditingContent(feedback.content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleEditSave = (id: number) => {
    if (!editingContent.trim()) return;

    setFeedbacks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              content: editingContent,
              aiTags: [],
              analysisStatus: 'idle',
            }
          : item,
      ),
    );

    handleEditCancel();
  };

  const handleDelete = (id: number) => {
    setFeedbacks((prev) => prev.filter((item) => item.id !== id));

    if (editingId === id) {
      handleEditCancel();
    }
  };

  return {
    selectedActor,
    timestamp,
    content,
    feedbacks,
    editingId,
    editingContent,

    setSelectedActor,
    setContent,
    setEditingContent,

    handleStartTimestamp,
    handleSubmit,
    handleEdit,
    handleEditCancel,
    handleEditSave,
    handleDelete,
  };
}
