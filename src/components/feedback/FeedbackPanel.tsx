// src/components/feedback/FeedbackPanel.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Actor, Feedback } from '../../types/feedback';

const FEEDBACK_PAGE_SIZE = 15;

type FeedbackPanelProps = {
  actors: Actor[];
  feedbacks: Feedback[];
  selectedActors: Actor[];
  timestamp: string | null;
  content: string;
  editingId: number | null;
  editingContent: string;
  onActorSelect: (actor: Actor) => void;
  onActorBackspace: () => void;
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
  actors,
  feedbacks,
  selectedActors,
  timestamp,
  content,
  editingId,
  editingContent,
  onActorSelect,
  onActorBackspace,
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
  const actorRowRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(FEEDBACK_PAGE_SIZE);
  const [actorMenuOpen, setActorMenuOpen] = useState(false);
  const [actorCommandIndex, setActorCommandIndex] = useState<number | null>(
    null,
  );
  const [actorRowActive, setActorRowActive] = useState(false);
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

  const closeActorMenu = () => {
    setActorMenuOpen(false);
    setActorCommandIndex(null);
  };

  const removeActorCommand = () => {
    if (actorCommandIndex === null || content[actorCommandIndex] !== '/') {
      return content;
    }

    return (
      content.slice(0, actorCommandIndex) + content.slice(actorCommandIndex + 1)
    );
  };

  const selectActorByShortcut = (
    shortcut: string | undefined,
    nextContent = content,
    commandLength = 1,
  ) => {
    const matchedActor = actors.find((actor) => actor.shortcut === shortcut);

    if (!matchedActor || actorCommandIndex === null) {
      return false;
    }

    onActorSelect(matchedActor);
    onContentChange(
      nextContent.slice(0, actorCommandIndex) +
        nextContent.slice(actorCommandIndex + commandLength),
    );
    closeActorMenu();
    setActorRowActive(false);

    requestAnimationFrame(() => {
      contentTextareaRef.current?.focus();
    });

    return true;
  };

  const openActorCommand = useCallback((commandIndex = content.length) => {
    if (!timestamp) {
      onTimestampStart();
    }

    onContentChange(
      content.slice(0, commandIndex) + '/' + content.slice(commandIndex),
    );
    setActorMenuOpen(true);
    setActorCommandIndex(commandIndex);

    requestAnimationFrame(() => {
      const textarea = contentTextareaRef.current;

      textarea?.focus();
      textarea?.setSelectionRange(commandIndex + 1, commandIndex + 1);
    });
  }, [content, onContentChange, onTimestampStart, timestamp]);

  useEffect(() => {
    if (timestamp || content) return;

    contentTextareaRef.current?.blur();
  }, [content, timestamp]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isTyping || event.key !== '/') return;

      event.preventDefault();
      openActorCommand();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActorCommand]);

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
          const feedbackActorNames = feedback.actorIds
            .map((actorId) => actors.find((actor) => actor.id === actorId)?.name)
            .filter(Boolean)
            .join(', ');

          return (
            <div
              key={feedback.id}
              className="group rounded-2xl bg-white/60 p-3 text-sm text-neutral-700"
            >
              <div className="mb-1 flex items-center gap-2 text-neutral-500">
                <span>{feedback.timestamp}</span>
                <span>|</span>
                <span className="font-semibold text-neutral-700">
                  {feedbackActorNames}
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
            타임스탬프 {timestamp ?? '00:00'}
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            {actorMenuOpen && (
              <div className="absolute bottom-full left-0 z-10 mb-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm shadow-lg">
                <div className="border-b border-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500">
                  배우 선택
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {actors.map((actor) => (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => {
                        onActorSelect(actor);
                        onContentChange(removeActorCommand());
                        closeActorMenu();
                        contentTextareaRef.current?.focus();
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100"
                    >
                      <span className="font-medium">{actor.name}</span>
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                        {actor.shortcut}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-400">
                  Space로 닫고 "/ " 입력
                </div>
              </div>
            )}

            <div
              ref={actorRowRef}
              tabIndex={0}
              onClick={() => setActorRowActive(true)}
              onFocus={() => setActorRowActive(true)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  e.preventDefault();
                  onActorBackspace();
                  return;
                }

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActorRowActive(false);
                  contentTextareaRef.current?.focus();
                }
              }}
              className={[
                'flex min-h-9 flex-wrap items-center gap-2 rounded-t-xl border border-neutral-300 bg-white/60 px-3 py-1.5 text-sm outline-none',
                actorRowActive ? 'border-neutral-600' : '',
              ].join(' ')}
            >
              {selectedActors.length > 0 ? (
                selectedActors.map((actor) => (
                  <span
                    key={actor.id}
                    className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-medium text-white"
                  >
                    {actor.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-neutral-400">
                  /번호로 배우를 선택하세요
                </span>
              )}
            </div>

            <textarea
              ref={contentTextareaRef}
              value={content}
              onFocus={() => {
                setActorRowActive(false);

                if (!timestamp) {
                  onTimestampStart();
                }
              }}
              onChange={(e) => {
                const nextContent = e.target.value;
                const commandValue =
                  actorCommandIndex === null
                    ? ''
                    : nextContent.slice(
                        actorCommandIndex,
                        actorCommandIndex + 2,
                      );

                if (
                  actorMenuOpen &&
                  commandValue.length === 2 &&
                  commandValue.startsWith('/') &&
                  selectActorByShortcut(commandValue[1], nextContent, 2)
                ) {
                  return;
                }

                onContentChange(nextContent);

                if (
                  actorMenuOpen &&
                  (actorCommandIndex === null ||
                    nextContent[actorCommandIndex] !== '/')
                ) {
                  closeActorMenu();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && e.shiftKey) {
                  e.preventDefault();
                  onActorBackspace();
                  return;
                }

                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  closeActorMenu();
                  onSubmit();
                  return;
                }

                if (actorRowActive) {
                  if (e.key === 'Backspace') {
                    e.preventDefault();
                    onActorBackspace();
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActorRowActive(false);
                    return;
                  }
                }

                if (!timestamp && e.key === ' ') {
                  e.preventDefault();
                  onTimestampStart();
                  return;
                }

                if (actorMenuOpen) {
                  if (selectActorByShortcut(e.key)) {
                    e.preventDefault();
                    return;
                  }

                  if (e.key === 'Escape') {
                    e.preventDefault();
                    closeActorMenu();
                    return;
                  }

                  if (e.key === ' ') {
                    closeActorMenu();
                    return;
                  }
                }

                if (e.key === '/') {
                  e.preventDefault();
                  openActorCommand(e.currentTarget.selectionStart);
                  return;
                }

                if (
                  e.key === 'ArrowUp' &&
                  e.currentTarget.selectionStart === 0
                ) {
                  e.preventDefault();
                  setActorRowActive(true);
                  e.currentTarget.blur();
                  actorRowRef.current?.focus();
                  return;
                }
              }}
              placeholder={
                timestamp
                  ? '피드백을 입력하세요'
                  : '클릭하거나 Space를 눌러 피드백을 입력하세요'
              }
              readOnly={!timestamp}
              className="min-h-[44px] w-full resize-none rounded-b-xl border border-t-0 border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              closeActorMenu();
              onSubmit();
            }}
            className="rounded-xl bg-neutral-800 px-4 text-sm font-medium text-white disabled:bg-neutral-400"
            disabled={
              selectedActors.length === 0 || !timestamp || !content.trim()
            }
          >
            등록
          </button>
        </div>
      </div>
    </aside>
  );
}
