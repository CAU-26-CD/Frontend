import { useCallback, useEffect, useState } from 'react';
import {
  createFeedback,
  deleteFeedback,
  getFeedbacks,
  updateFeedback,
} from '../apis/feedback';
import type { FeedbackSessionId } from '../apis/feedback';
import type { Actor, Feedback } from '../types/feedback';

const URGENT_MARK_PATTERN = /!{3,}/;

const timestampToSeconds = (value: string) => {
  const [minutes = '0', seconds = '0'] = value.split(':');

  return Number(minutes) * 60 + Number(seconds);
};

const secondsToTimestamp = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const hasValidSessionId = (
  sessionId: FeedbackSessionId | undefined,
): sessionId is FeedbackSessionId =>
  sessionId !== undefined && String(sessionId).trim().length > 0;

export function useFeedback(
  sessionId?: FeedbackSessionId,
  getCurrentOffsetSeconds: () => number = () => 0,
) {
  const [selectedActors, setSelectedActors] = useState<Actor[]>([]);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  useEffect(() => {
    if (!hasValidSessionId(sessionId)) return;

    let ignore = false;

    const loadFeedbacks = async () => {
      setIsLoadingFeedbacks(true);

      try {
        const fetchedFeedbacks = await getFeedbacks(sessionId);

        if (ignore) return;

        setFeedbacks(
          fetchedFeedbacks.map((feedback) => ({
            id: feedback.feedback_id,
            timestamp: secondsToTimestamp(feedback.video_offset_seconds),
            actorIds: [],
            content: feedback.content,
            isUrgent: URGENT_MARK_PATTERN.test(feedback.content),
            aiTags: [],
            analysisStatus: 'idle',
            isPersisted: true,
          })),
        );
      } catch (error) {
        console.error('Failed to load feedbacks', error);
      } finally {
        if (!ignore) {
          setIsLoadingFeedbacks(false);
        }
      }
    };

    void loadFeedbacks();

    return () => {
      ignore = true;
    };
  }, [sessionId]);

  const handleStartTimestamp = useCallback(() => {
    setTimestamp(secondsToTimestamp(getCurrentOffsetSeconds()));
  }, [getCurrentOffsetSeconds]);

  const handleSubmit = async () => {
    if (selectedActors.length === 0 || !timestamp || !content.trim()) return;
    if (!hasValidSessionId(sessionId) || isSubmitting) return;

    const feedbackActorIds = selectedActors.map((actor) => actor.id);
    const feedbackContent = content;
    const feedbackTimestamp = timestamp;
    const temporaryFeedbackId = Date.now();
    const optimisticFeedback: Feedback = {
      id: temporaryFeedbackId,
      timestamp: feedbackTimestamp,
      actorIds: feedbackActorIds,
      content: feedbackContent,
      isUrgent: URGENT_MARK_PATTERN.test(feedbackContent),
      aiTags: [],
      analysisStatus: 'idle',
      isPersisted: false,
    };

    setFeedbacks((prev) => [...prev, optimisticFeedback]);
    setContent('');
    setTimestamp(null);
    setIsSubmitting(true);

    try {
      const createdFeedback = await createFeedback(sessionId, {
        content: feedbackContent,
        video_offset_seconds: timestampToSeconds(feedbackTimestamp),
      });

      const newFeedback: Feedback = {
        id: createdFeedback.feedback_id,
        timestamp: feedbackTimestamp,
        actorIds: feedbackActorIds,
        content: createdFeedback.content,
        isUrgent: URGENT_MARK_PATTERN.test(createdFeedback.content),
        aiTags: [],
        analysisStatus: 'idle',
        isPersisted: true,
      };

      setFeedbacks((prev) =>
        prev.map((feedback) =>
          feedback.id === temporaryFeedbackId ? newFeedback : feedback,
        ),
      );
    } catch (error) {
      console.error('Failed to create feedback', error);
      setFeedbacks((prev) =>
        prev.map((feedback) =>
          feedback.id === temporaryFeedbackId
            ? { ...feedback, analysisStatus: 'error' }
            : feedback,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSelectedActor = (actor: Actor) => {
    setSelectedActors((prev) =>
      prev.some((item) => item.id === actor.id) ? prev : [...prev, actor],
    );
  };

  const toggleSelectedActor = (actor: Actor) => {
    setSelectedActors((prev) =>
      prev.some((item) => item.id === actor.id)
        ? prev.filter((item) => item.id !== actor.id)
        : [...prev, actor],
    );
  };

  const removeLastSelectedActor = () => {
    setSelectedActors((prev) => prev.slice(0, -1));
  };

  const handleEdit = (feedback: Feedback) => {
    setEditingId(feedback.id);
    setEditingContent(feedback.content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleEditSave = async (id: number) => {
    if (!editingContent.trim()) return;

    const targetFeedback = feedbacks.find((item) => item.id === id);
    const nextContent = editingContent;

    if (!targetFeedback) return;

    setFeedbacks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              content: nextContent,
              isUrgent: URGENT_MARK_PATTERN.test(nextContent),
              aiTags: [],
              analysisStatus: 'idle',
            }
          : item,
      ),
    );

    handleEditCancel();

    if (!targetFeedback.isPersisted) {
      return;
    }

    if (!hasValidSessionId(sessionId)) {
      console.error('Cannot update feedback without a valid session id');
      return;
    }

    try {
      const updatedFeedback = await updateFeedback(sessionId, id, {
        content: nextContent,
        video_offset_seconds: timestampToSeconds(targetFeedback.timestamp),
      });

      setFeedbacks((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                content: updatedFeedback.content,
                timestamp: secondsToTimestamp(
                  updatedFeedback.video_offset_seconds,
                ),
                isUrgent: URGENT_MARK_PATTERN.test(updatedFeedback.content),
                analysisStatus: 'idle',
                isPersisted: true,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error('Failed to update feedback', error);
      setFeedbacks((prev) =>
        prev.map((item) => (item.id === id ? targetFeedback : item)),
      );
    }
  };

  const handleDelete = async (id: number) => {
    const deletedFeedback = feedbacks.find((item) => item.id === id);

    if (!deletedFeedback) return;

    setFeedbacks((prev) => prev.filter((item) => item.id !== id));

    if (editingId === id) {
      handleEditCancel();
    }

    if (!deletedFeedback.isPersisted) {
      return;
    }

    if (!hasValidSessionId(sessionId)) {
      console.error('Cannot delete feedback without a valid session id');
      setFeedbacks((prev) => [...prev, deletedFeedback]);
      return;
    }

    try {
      await deleteFeedback(sessionId, id);
    } catch (error) {
      console.error('Failed to delete feedback', error);

      if (deletedFeedback) {
        setFeedbacks((prev) => [...prev, deletedFeedback]);
      }
    }
  };

  const handleToggleUrgent = (id: number) => {
    setFeedbacks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isUrgent: !item.isUrgent,
            }
          : item,
      ),
    );
  };

  return {
    selectedActors,
    timestamp,
    content,
    feedbacks,
    editingId,
    editingContent,
    isSubmitting,
    isLoadingFeedbacks,

    addSelectedActor,
    toggleSelectedActor,
    removeLastSelectedActor,
    setContent,
    setEditingContent,

    handleStartTimestamp,
    handleSubmit,
    handleEdit,
    handleEditCancel,
    handleEditSave,
    handleDelete,
    handleToggleUrgent,
  };
}
