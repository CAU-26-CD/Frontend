import { useCallback, useEffect, useState } from 'react';
import {
  createFeedback,
  deleteFeedback,
  getFeedbacks,
  updateFeedback,
} from '../apis/feedback';
import type { FeedbackSessionId } from '../apis/feedback';
import { realtimeClient } from '../realtime';
import { useRealtimeScope } from './useRealtimeScope';
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

type FeedbackResponse = Awaited<ReturnType<typeof getFeedbacks>>[number];

const toFeedback = (feedback: FeedbackResponse): Feedback => ({
  id: feedback.feedback_id,
  createdByUserId: feedback.created_by_user_id,
  timestamp: secondsToTimestamp(feedback.video_offset_seconds),
  actorIds: feedback.actor_ids,
  actorNames: feedback.actor_names,
  content: feedback.content,
  isUrgent: URGENT_MARK_PATTERN.test(feedback.content),
  aiTags: [],
  analysisStatus: 'idle',
  isPersisted: true,
});

const isSamePendingFeedback = (feedback: Feedback, nextFeedback: Feedback) =>
  feedback.isPersisted === false &&
  feedback.content === nextFeedback.content &&
  feedback.timestamp === nextFeedback.timestamp &&
  feedback.actorIds.length === nextFeedback.actorIds.length &&
  feedback.actorIds.every((actorId) => nextFeedback.actorIds.includes(actorId));

export function useFeedback(
  sessionId?: FeedbackSessionId,
  getCurrentOffsetSeconds: () => number = () => 0,
  currentUserId?: number | null,
  projectId?: number,
) {
  const [selectedActors, setSelectedActors] = useState<Actor[]>([]);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [pendingSubmissionCount, setPendingSubmissionCount] = useState(0);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const hasPendingFeedbacks =
    pendingSubmissionCount > 0 ||
    feedbacks.some((feedback) => feedback.isPersisted === false);

  useRealtimeScope(
    {
      project_id: projectId,
      session_id: sessionId,
    },
    hasValidSessionId(sessionId),
  );

  useEffect(() => {
    if (!hasValidSessionId(sessionId)) return;
    if (!currentUserId) {
      setFeedbacks([]);
      return;
    }

    let ignore = false;

    const loadFeedbacks = async () => {
      setIsLoadingFeedbacks(true);

      try {
        const fetchedFeedbacks = await getFeedbacks(sessionId, {
          userId: currentUserId,
        });

        if (ignore) return;

        setFeedbacks(fetchedFeedbacks.map((feedback) => toFeedback(feedback)));
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
  }, [currentUserId, sessionId]);

  useEffect(() => {
    if (!hasValidSessionId(sessionId)) return;

    const unsubscribeCreated = realtimeClient.subscribe(
      'feedback.created',
      (event) => {
        if (String(event.payload.session_id) !== String(sessionId)) return;

        const nextFeedback = toFeedback(event.payload);

        setFeedbacks((prev) => {
          if (prev.some((feedback) => feedback.id === nextFeedback.id)) {
            return prev.map((feedback) =>
              feedback.id === nextFeedback.id ? nextFeedback : feedback,
            );
          }

          const pendingIndex = prev.findIndex((feedback) =>
            isSamePendingFeedback(feedback, nextFeedback),
          );

          if (pendingIndex === -1) {
            return [...prev, nextFeedback];
          }

          return prev.map((feedback, index) =>
            index === pendingIndex ? nextFeedback : feedback,
          );
        });
      },
    );

    const unsubscribeUpdated = realtimeClient.subscribe(
      'feedback.updated',
      (event) => {
        if (String(event.payload.session_id) !== String(sessionId)) return;

        const nextFeedback = toFeedback(event.payload);

        setFeedbacks((prev) =>
          prev.map((feedback) =>
            feedback.id === nextFeedback.id ? nextFeedback : feedback,
          ),
        );
      },
    );

    const unsubscribeDeleted = realtimeClient.subscribe(
      'feedback.deleted',
      (event) => {
        if (String(event.payload.session_id) !== String(sessionId)) return;

        setFeedbacks((prev) =>
          prev.filter(
            (feedback) => feedback.id !== event.payload.feedback_id,
          ),
        );
      },
    );

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [sessionId]);

  const handleStartTimestamp = useCallback(() => {
    setTimestamp(secondsToTimestamp(getCurrentOffsetSeconds()));
  }, [getCurrentOffsetSeconds]);

  const handleSubmit = async () => {
    if (selectedActors.length === 0 || !timestamp || !content.trim()) return;
    if (!hasValidSessionId(sessionId)) return;
    if (!currentUserId) return;

    const feedbackActorIds = selectedActors.map((actor) => actor.id);
    const feedbackActorNames = selectedActors.map((actor) => actor.name);
    const feedbackContent = content;
    const feedbackTimestamp = timestamp;
    const temporaryFeedbackId = -(
      Date.now() + Math.floor(Math.random() * 1000)
    );
    const optimisticFeedback: Feedback = {
      id: temporaryFeedbackId,
      createdByUserId: currentUserId,
      timestamp: feedbackTimestamp,
      actorIds: feedbackActorIds,
      actorNames: feedbackActorNames,
      content: feedbackContent,
      isUrgent: URGENT_MARK_PATTERN.test(feedbackContent),
      aiTags: [],
      analysisStatus: 'idle',
      isPersisted: false,
    };

    setFeedbacks((prev) => [...prev, optimisticFeedback]);
    setContent('');
    setTimestamp(null);
    setSelectedActors([]);
    setPendingSubmissionCount((count) => count + 1);

    try {
      const createdFeedback = await createFeedback(
        sessionId,
        {
          content: feedbackContent,
          video_offset_seconds: timestampToSeconds(feedbackTimestamp),
          actor_ids: feedbackActorIds,
        },
        currentUserId,
      );

      const newFeedback = {
        ...toFeedback(createdFeedback),
        timestamp: feedbackTimestamp,
        actorNames: createdFeedback.actor_names ?? feedbackActorNames,
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
      setPendingSubmissionCount((count) => Math.max(0, count - 1));
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
    if (!currentUserId) {
      console.error('Cannot update feedback without a valid user id');
      setFeedbacks((prev) =>
        prev.map((item) => (item.id === id ? targetFeedback : item)),
      );
      return;
    }

    try {
      const updatedFeedback = await updateFeedback(
        sessionId,
        id,
        {
          content: nextContent,
          video_offset_seconds: timestampToSeconds(targetFeedback.timestamp),
          actor_ids: targetFeedback.actorIds,
        },
        currentUserId,
      );

      setFeedbacks((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                createdByUserId: updatedFeedback.created_by_user_id,
                content: updatedFeedback.content,
                timestamp: secondsToTimestamp(
                  updatedFeedback.video_offset_seconds,
                ),
                actorIds: updatedFeedback.actor_ids,
                actorNames:
                  updatedFeedback.actor_names ?? targetFeedback.actorNames,
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
    if (!currentUserId) {
      console.error('Cannot delete feedback without a valid user id');
      setFeedbacks((prev) => [...prev, deletedFeedback]);
      return;
    }

    try {
      await deleteFeedback(sessionId, id, currentUserId);
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
    isSubmitting: pendingSubmissionCount > 0,
    isLoadingFeedbacks,
    hasPendingFeedbacks,

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
