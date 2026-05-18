// src/components/feedback/FeedbackPanel.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import sirenIcon from '../../images/icon/bitcoin-icons_siren-filled.svg';
import urgentSirenIcon from '../../images/icon/bitcoin-icons_siren-filled2.svg';
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
  feedbackListSlot?: ReactNode;
  isInteractionDisabled?: boolean;
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
  feedbackListSlot,
  isInteractionDisabled = false,
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
  const [scrollProgress, setScrollProgress] = useState(0);
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
      const maxScrollTop = list.scrollHeight - list.clientHeight;
      setScrollProgress(maxScrollTop > 0 ? list.scrollTop / maxScrollTop : 0);
    }
  }, [feedbacks.length]);

  const handleFeedbackScroll = () => {
    const list = feedbackListRef.current;

    if (!list) {
      return;
    }

    const maxScrollTop = list.scrollHeight - list.clientHeight;
    setScrollProgress(maxScrollTop > 0 ? list.scrollTop / maxScrollTop : 0);

    if (list.scrollTop > 24 || visibleCount >= feedbacks.length) {
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

  const openActorCommand = useCallback(
    (commandIndex = content.length) => {
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
    },
    [content, onContentChange, onTimestampStart, timestamp],
  );

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
    <aside className="reaction-ui-font flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-transparent px-1 py-0 text-[#2d1715]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute right-0 h-28 w-1.5 rounded-sm bg-gradient-to-b from-zinc-100/0 via-zinc-100/40 via-[14%] to-zinc-100/0 shadow-[inset_0px_0px_4px_0px_rgba(238,238,238,0.93)]"
          style={{
            top: `calc(${scrollProgress * 100}% - ${scrollProgress * 7}rem)`,
          }}
          aria-hidden="true"
        />
        <div
          ref={feedbackListRef}
          onScroll={handleFeedbackScroll}
          className={[
            'reaction-hidden-scrollbar flex h-full flex-col items-end gap-3 pr-3',
            feedbackListSlot ? 'overflow-hidden' : 'overflow-y-auto',
          ].join(' ')}
        >
          {feedbackListSlot ?? (
            <>
              {visibleCount < feedbacks.length && (
                <div className="w-80 max-w-full shrink-0 py-1 text-center text-xs text-[#806b61]">
                  위로 스크롤하면 이전 피드백을 불러옵니다
                </div>
              )}

              {visibleFeedbacks.map((feedback) => {
                const isEditing = editingId === feedback.id;
                const feedbackActorNames = feedback.actorIds
                  .map(
                    (actorId) =>
                      actors.find((actor) => actor.id === actorId)?.name,
                  )
                  .filter(Boolean)
                  .join(', ');
                const isMovementFeedback = feedback.content.startsWith(
                  MOVEMENT_FEEDBACK_PREFIX,
                );

                return (
                  <div
                    key={feedback.id}
                    className={[
                      'group relative min-h-[86px] w-80 max-w-full shrink-0 overflow-hidden rounded-md border px-3 py-2.5 text-sm transition-colors',
                      feedback.isUrgent
                        ? 'border-[#DF8181] bg-[#D15757] text-[#fff8ef] shadow-none'
                        : isMovementFeedback
                          ? 'border-[#d5c8bc] bg-[#efe6de] text-[#2d1715] shadow-none'
                          : 'border-[#d5c8bc] bg-[#efe6de] text-[#2d1715] shadow-none',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'mb-2 flex items-center gap-1.5 text-[11px] font-bold leading-none',
                        feedback.isUrgent ? 'text-[#fff8ef]' : 'text-[#2d1715]',
                      ].join(' ')}
                    >
                      <span>{feedback.timestamp}</span>
                      {feedbackActorNames && (
                        <>
                          <span>|</span>
                          <span>{feedbackActorNames}</span>
                        </>
                      )}
                      {isMovementFeedback && (
                        <span
                          className={[
                            'ml-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            feedback.isUrgent
                              ? 'border-white/50 bg-white/16 text-[#fff8ef]'
                              : 'border-[#c59b74] bg-[#fff8ef]/75 text-[#8a4734]',
                          ].join(' ')}
                        >
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
                      <p
                        className={[
                          'whitespace-pre-wrap pr-8 text-xs font-semibold leading-relaxed',
                          feedback.isUrgent
                            ? 'text-[#fff8ef]'
                            : 'text-[#2d1715]',
                        ].join(' ')}
                      >
                        {feedback.content}
                      </p>
                    )}

                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="flex gap-2 text-xs font-semibold text-[#806b61] opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditSave(feedback.id)}
                              disabled={!editingContent.trim()}
                              className="rounded-full border border-white/35 bg-white/20 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg transition hover:bg-white/34 hover:text-[#431B1B] disabled:text-[#c8b7aa]"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={onEditCancel}
                              className="rounded-full border border-white/35 bg-white/20 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg transition hover:bg-white/34 hover:text-[#431B1B]"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(feedback)}
                              className="rounded-full border border-white/35 bg-white/20 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg transition hover:bg-white/34 hover:text-[#431B1B]"
                            >
                              수정
                            </button>
                            <button
                              type="button"
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
                        className="absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        aria-pressed={feedback.isUrgent}
                        aria-label={
                          feedback.isUrgent ? '긴급 해제' : '긴급 설정'
                        }
                        title={feedback.isUrgent ? '긴급 해제' : '긴급 설정'}
                      >
                        <img
                          src={feedback.isUrgent ? urgentSirenIcon : sirenIcon}
                          alt=""
                          className="h-full w-full object-contain"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div
        className={[
          'relative right-2.5 h-44 w-80 max-w-full shrink-0 self-end rounded-[10px] bg-transparent transition',
          isInteractionDisabled ? 'pointer-events-none opacity-45' : '',
        ].join(' ')}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[10px] border-2 border-stone-200/50"
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0%, transparent 3%, black 50%, black 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, transparent 3%, black 50%, black 100%)',
          }}
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col gap-2 rounded-[10px] bg-transparent px-2.5 py-2.5">
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
              'flex min-h-[30px] shrink-0 flex-wrap items-center gap-1.5 rounded-lg outline-none transition',
              actorRowActive ? 'ring-2 ring-white/28' : '',
            ].join(' ')}
          >
            {selectedActors.length > 0 ? (
              selectedActors.map((actor) => (
                <span
                  key={actor.id}
                  className="rounded-full border border-white/24 bg-[#431B1B]/76 px-3 py-1 text-xs font-semibold text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_rgba(67,27,27,0.12)] backdrop-blur-lg"
                >
                  {actor.name}
                </span>
              ))
            ) : (
              <button
                type="button"
                onClick={() => openActorCommand()}
                className="rounded-full border border-white/24 bg-[#431B1B]/52 px-3 py-1 text-xs font-semibold text-[#fff8ef]/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-lg transition hover:scale-[1.03] hover:bg-[#431B1B]/66"
              >
                배우 선택
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onTimestampStart}
              className="reaction-glass-pill rounded-full px-3 py-1 text-[11px] font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              타임스탬프 {timestamp ?? '00:00'}
            </button>
            {isUrgentMode && (
              <span className="rounded-full border border-[#A94444] bg-[#A94444] px-3 py-1 text-[11px] font-bold text-[#fff8ef]">
                긴급
              </span>
            )}
          </div>

          <div className="relative min-h-0 flex-1 rounded-[14px] bg-[#EEEEEE] p-2">
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
                'h-full w-full resize-none border-0 bg-transparent py-1 pl-1 pr-[72px] text-xs font-semibold text-[#431B1B] outline-none transition-colors placeholder:text-[#431B1B]/45',
                isUrgentMode ? 'placeholder:text-[#A94444]/70' : '',
              ].join(' ')}
            />

            <button
              type="button"
              onClick={() => {
                closeActorMenu();
                onSubmit();
              }}
              className="absolute bottom-2 right-2 flex h-17 w-[56px] items-center justify-center rounded-[16px] border border-white/30 bg-[#431B1B]/58 text-[11px] font-bold text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-lg transition hover:scale-[1.04] hover:bg-[#431B1B]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:scale-100 disabled:opacity-45"
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
      </div>
    </aside>
  );
}
