// src/components/feedback/FeedbackPanel.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Actor, Feedback } from '../../types/feedback';

const FEEDBACK_PAGE_SIZE = 15;
const URGENT_MARK_PATTERN = /!{3,}/;
const MOVEMENT_FEEDBACK_PREFIX = '[동선]';

type FeedbackPanelProps = {
  actors: Actor[];
  feedbacks: Feedback[];
  selectedActors: Actor[];
  timestamp: string | null;
  content: string;
  editingId: number | null;
  editingContent: string;
  isSubmitting: boolean;
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
  onToggleUrgent: (id: number) => void;
};

export default function FeedbackPanel({
  actors,
  feedbacks,
  selectedActors,
  timestamp,
  content,
  editingId,
  editingContent,
  isSubmitting,
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
  onToggleUrgent,
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
  const isUrgentMode = URGENT_MARK_PATTERN.test(content);
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
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d3c3b7] bg-[#efe6de] p-5 text-[#2d1715] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
      <div
        ref={feedbackListRef}
        onScroll={handleFeedbackScroll}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {visibleCount < feedbacks.length && (
          <div className="py-1 text-center text-xs text-[#806b61]">
            위로 스크롤하면 이전 피드백을 불러옵니다
          </div>
        )}

        {visibleFeedbacks.map((feedback) => {
          const isEditing = editingId === feedback.id;
          const feedbackActorNames = feedback.actorIds
            .map((actorId) => actors.find((actor) => actor.id === actorId)?.name)
            .filter(Boolean)
            .join(', ');
          const isMovementFeedback = feedback.content.startsWith(
            MOVEMENT_FEEDBACK_PREFIX,
          );

          return (
            <div
              key={feedback.id}
              className={[
                'group rounded-xl border p-3 text-sm text-[#2d1715] transition-colors',
                feedback.isUrgent
                  ? 'border-[#ff9d9d]/76 bg-[#fff8ef]/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),inset_0_0_24px_rgba(255,77,77,0.18),0_0_18px_rgba(255,77,77,0.22),0_10px_26px_rgba(0,0,0,0.10)] backdrop-blur-xl backdrop-saturate-150'
                  : isMovementFeedback
                    ? 'border-[#ffe7cf]/66 bg-[#f4b36f]/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_26px_rgba(255,255,255,0.14),0_10px_26px_rgba(0,0,0,0.10)] backdrop-blur-xl backdrop-saturate-150'
                    : 'border-white/45 bg-white/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.74),inset_0_0_24px_rgba(255,255,255,0.14),0_10px_26px_rgba(0,0,0,0.10)] backdrop-blur-xl backdrop-saturate-150',
              ].join(' ')}
            >
              <div className="mb-1 flex items-center gap-2 text-[#806b61]">
                <span>{feedback.timestamp}</span>
                <span>|</span>
                <span className="font-semibold text-[#2d1715]">
                  {feedbackActorNames}
                </span>
                {isMovementFeedback && (
                  <span className="rounded-full border border-[#c59b74] bg-[#fff8ef]/75 px-2 py-0.5 text-[10px] font-semibold text-[#8a4734]">
                    동선
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  {URGENT_MARK_PATTERN.test(editingContent) && (
                    <span className="inline-flex rounded-full border border-[#d71920] bg-[#d71920] px-2 py-0.5 text-[10px] font-bold text-[#fff8ef]">
                      긴급
                    </span>
                  )}
                  <textarea
                    value={editingContent}
                    onChange={(e) => onEditContentChange(e.target.value)}
                    autoFocus
                    className={[
                      'min-h-[72px] w-full resize-none rounded-xl border px-3 py-2 text-sm text-[#2d1715] outline-none transition focus:border-[#431B1B] focus:ring-2 focus:ring-[#431B1B]/15',
                      URGENT_MARK_PATTERN.test(editingContent)
                        ? 'border-[#d71920]/55 bg-[#fff8ef]/30'
                        : 'border-[#c8b7aa] bg-[#fff8ef]',
                    ].join(' ')}
                  />
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{feedback.content}</p>
              )}

              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="flex gap-2 text-xs font-semibold text-[#806b61] opacity-100 md:opacity-0 md:group-hover:opacity-100">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => onEditSave(feedback.id)}
                        disabled={!editingContent.trim()}
                        className="rounded-full border border-white/35 bg-white/20 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg transition hover:bg-white/34 hover:text-[#431B1B] disabled:text-[#c8b7aa]"
                      >
                        저장
                      </button>
                      <button
                        onClick={onEditCancel}
                        className="rounded-full border border-white/35 bg-white/20 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg transition hover:bg-white/34 hover:text-[#431B1B]"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onEdit(feedback)}
                        className="rounded-full border border-white/35 bg-white/20 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg transition hover:bg-white/34 hover:text-[#431B1B]"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => onDelete(feedback.id)}
                        className="rounded-full border border-white/35 bg-white/20 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg transition hover:bg-white/34 hover:text-[#431B1B]"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onToggleUrgent(feedback.id)}
                  className={[
                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors',
                    feedback.isUrgent
                      ? 'border-white/35 bg-[#d71920]/88 text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_6px_16px_rgba(215,25,32,0.24)] backdrop-blur-lg hover:bg-[#bd1016]'
                      : 'border-white/35 bg-white/20 text-[#806b61] shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg hover:bg-white/34 hover:text-[#431B1B]',
                  ].join(' ')}
                  aria-pressed={feedback.isUrgent}
                  aria-label={feedback.isUrgent ? '긴급 해제' : '긴급 설정'}
                  title={feedback.isUrgent ? '긴급 해제' : '긴급 설정'}
                >
                  긴급
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={[
          'mt-4 rounded-xl border p-3 transition-colors',
          isUrgentMode
            ? 'border-[#ff9d9d]/76 bg-[#fff8ef]/24 shadow-[inset_0_0_22px_rgba(255,77,77,0.16),0_0_16px_rgba(255,77,77,0.16)]'
            : 'border-[#c8b7aa] bg-[#fff8ef]/70',
        ].join(' ')}
      >
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-[#806b61]">
          <button
            type="button"
            onClick={onTimestampStart}
            className="rounded-full border border-[#c8b7aa] bg-[#fff8ef] px-3 py-1 font-semibold text-[#2d1715] transition hover:border-[#431B1B] hover:text-[#431B1B]"
          >
            타임스탬프 {timestamp ?? '00:00'}
          </button>
          {isUrgentMode && (
            <span className="rounded-full border border-[#d71920] bg-[#d71920] px-3 py-1 font-bold text-[#fff8ef]">
              긴급
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            {actorMenuOpen && (
              <div className="absolute bottom-full left-0 z-10 mb-2 w-64 overflow-hidden rounded-xl border border-[#c8b7aa] bg-[#fff8ef] text-sm shadow-lg">
                <div className="border-b border-[#e2d5cb] px-3 py-2 text-xs font-semibold text-[#806b61]">
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
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[#2d1715] hover:bg-[#eadbd0]"
                    >
                      <span className="font-medium">{actor.name}</span>
                      <span className="rounded-full bg-[#efe6de] px-2 py-0.5 text-xs text-[#806b61]">
                        {actor.shortcut}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#e2d5cb] px-3 py-2 text-xs text-[#9b8a80]">
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
                'flex min-h-9 flex-wrap items-center gap-2 rounded-t-xl border border-[#c8b7aa] bg-[#fff8ef]/80 px-3 py-1.5 text-sm outline-none transition',
                isUrgentMode
                  ? 'border-[#d71920]/55 bg-[#fff8ef]/30 shadow-[inset_0_0_18px_rgba(255,77,77,0.14)]'
                  : '',
                actorRowActive ? 'border-[#431B1B] ring-2 ring-[#431B1B]/15' : '',
              ].join(' ')}
            >
              {selectedActors.length > 0 ? (
                selectedActors.map((actor) => (
                  <span
                    key={actor.id}
                    className="rounded-full border border-white/24 bg-[#431B1B]/76 px-3 py-1 text-xs font-medium text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_rgba(67,27,27,0.12)] backdrop-blur-lg"
                  >
                    {actor.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#9b8a80]">
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
              className={[
                'min-h-[44px] w-full resize-none rounded-b-xl border border-t-0 border-[#c8b7aa] px-3 py-2 text-sm text-[#2d1715] outline-none transition-colors placeholder:text-[#9b8a80]',
                isUrgentMode ? 'bg-[#fff8ef]/24' : 'bg-[#fff8ef]/45',
              ].join(' ')}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              closeActorMenu();
              onSubmit();
            }}
            className="rounded-xl bg-[#431B1B] px-5 text-sm font-semibold text-[#fff8ef] transition hover:bg-[#2f1212] disabled:bg-[#b9a89c] disabled:text-[#efe6de]"
            disabled={
              selectedActors.length === 0 ||
              !timestamp ||
              !content.trim() ||
              isSubmitting
            }
          >
            등록
          </button>
        </div>
      </div>
    </aside>
  );
}
