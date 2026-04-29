// src/components/feedback/FeedbackPanel.tsx

import { useEffect, useRef, useState } from 'react';
import type { Actor, Feedback } from '../../types/feedback';

const FEEDBACK_PAGE_SIZE = 15;

type FeedbackPanelProps = {
  feedbacks: Feedback[];
  selectedActor: Actor | null;
  timestamp: string | null;
  content: string;
  editingId: number | null;
  editingContent: string;
  onTimestampStart: () => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void;
  onEdit: (feedback: Feedback) => void;
  onEditContentChange: (value: string) => void;
  onEditSave: (id: number) => void;
  onEditCancel: () => void;
  onDelete: (id: number) => void;
};

export default function FeedbackPanel({
  feedbacks,
  selectedActor,
  timestamp,
  content,
  editingId,
  editingContent,
  onTimestampStart,
  onContentChange,
  onSubmit,
  onEdit,
  onEditContentChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: FeedbackPanelProps) {
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackListRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(FEEDBACK_PAGE_SIZE);
  const visibleFeedbacks = feedbacks.slice(
    Math.max(feedbacks.length - visibleCount, 0),
  );

  useEffect(() => {
    if (timestamp) {
      contentTextareaRef.current?.focus();
    }
  }, [timestamp]);

  useEffect(() => {
    const list = feedbackListRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [feedbacks.length]);

  const handleFeedbackScroll = () => {
    const list = feedbackListRef.current;

    if (!list || list.scrollTop > 24 || visibleCount >= feedbacks.length) {
      return;
    }

    setVisibleCount((count) =>
      Math.min(count + FEEDBACK_PAGE_SIZE, feedbacks.length),
    );
  };

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl bg-neutral-200 p-5">
      <div
        ref={feedbackListRef}
        onScroll={handleFeedbackScroll}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {visibleCount < feedbacks.length && (
          <div className="py-1 text-center text-xs text-neutral-500">
            위로 스크롤하면 이전 피드백을 불러옵니다
          </div>
        )}

        {visibleFeedbacks.map((feedback) => {
          const isEditing = editingId === feedback.id;

          return (
            <div
              key={feedback.id}
              className="group rounded-2xl bg-white/60 p-3 text-sm text-neutral-700"
            >
              <div className="mb-1 flex items-center gap-2 text-neutral-500">
                <span>{feedback.timestamp}</span>
                <span>|</span>
                <span className="font-semibold text-neutral-700">
                  {feedback.actorId}
                </span>
              </div>

              {isEditing ? (
                <textarea
                  value={editingContent}
                  onChange={(e) => onEditContentChange(e.target.value)}
                  autoFocus
                  className="min-h-[72px] w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-neutral-500"
                />
              ) : (
                <p className="whitespace-pre-wrap">{feedback.content}</p>
              )}

              <div className="mt-2 flex gap-2 text-xs text-neutral-500 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => onEditSave(feedback.id)}
                      disabled={!editingContent.trim()}
                      className="disabled:text-neutral-300"
                    >
                      저장
                    </button>
                    <button onClick={onEditCancel}>취소</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onEdit(feedback)}>수정</button>
                    <button onClick={() => onDelete(feedback.id)}>삭제</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-400 bg-neutral-100 p-3">
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-neutral-500">
          <button
            type="button"
            onClick={onTimestampStart}
            className="rounded-full bg-white px-3 py-1"
          >
            타임스탬프
          </button>

          <span>
            {timestamp ?? '--:--'} | {selectedActor?.name ?? '배우 선택 필요'}
          </span>
        </div>

        <div className="flex gap-2">
          <textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return;

              e.preventDefault();
              onSubmit();
            }}
            placeholder={
              timestamp
                ? '피드백을 입력하세요'
                : 'Space를 눌러 피드백을 입력하세요'
            }
            disabled={!timestamp}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:text-neutral-400"
          />

          <button
            type="button"
            onClick={onSubmit}
            className="rounded-xl bg-neutral-800 px-4 text-sm font-medium text-white disabled:bg-neutral-400"
            disabled={!selectedActor || !timestamp || !content.trim()}
          >
            등록
          </button>
        </div>
      </div>
    </aside>
  );
}
