import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Actor, FeedbackPriority } from '../../types/feedback';

export type ReviewFeedbackTag = {
  id: string;
  label: string;
  color: string;
  values: string[];
};

export type ReviewPriorityTag = {
  id: FeedbackPriority;
  label: string;
  color: string;
};

type ReviewFilterBarProps = {
  feedbackTags: ReviewFeedbackTag[];
  priorityTags: ReviewPriorityTag[];
  actors: Actor[];
  selectedFeedbackTags: string[];
  selectedPriorityTags: FeedbackPriority[];
  selectedActorIds: number[];
  actorIdsWithTimeline: number[];
  onFeedbackTagToggle: (tagId: string) => void;
  onPriorityTagToggle: (priority: FeedbackPriority) => void;
  onActorToggle: (actorId: number) => void;
  onSelectedActorPlayback: () => void;
  onSelectedActorTimelineMove: (direction: 'previous' | 'next') => void;
};

export default function ReviewFilterBar({
  feedbackTags,
  priorityTags,
  actors,
  selectedFeedbackTags,
  selectedPriorityTags,
  selectedActorIds,
  actorIdsWithTimeline,
  onFeedbackTagToggle,
  onPriorityTagToggle,
  onActorToggle,
  onSelectedActorPlayback,
  onSelectedActorTimelineMove,
}: ReviewFilterBarProps) {
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const priorityMenuRef = useRef<HTMLDivElement | null>(null);
  const priorityButtonRef = useRef<HTMLButtonElement | null>(null);
  const [priorityMenuPosition, setPriorityMenuPosition] = useState({
    top: 0,
    right: 0,
  });
  const selectedActors = actors.filter((actor) =>
    selectedActorIds.includes(actor.id),
  );
  const selectedActorsWithTimeline = selectedActors.filter((actor) =>
    actorIdsWithTimeline.includes(actor.id),
  );
  const canPlaySelectedActors = selectedActorsWithTimeline.length > 0;
  const selectedPriorityLabels = selectedPriorityTags
    .map((priority) => priorityTags.find((tag) => tag.id === priority)?.label)
    .filter(Boolean);
  const priorityButtonLabel =
    selectedPriorityLabels.length > 0
      ? selectedPriorityLabels.join(', ')
      : '우선순위';
  const updatePriorityMenuPosition = () => {
    const button = priorityButtonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuHeight = 146;
    const gap = 6;
    const shouldOpenUp = rect.bottom + gap + menuHeight > window.innerHeight;

    setPriorityMenuPosition({
      top: shouldOpenUp
        ? Math.max(gap, rect.top - menuHeight - gap)
        : rect.bottom + gap,
      right: Math.max(gap, window.innerWidth - rect.right),
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        priorityMenuRef.current &&
        !priorityMenuRef.current.contains(event.target as Node)
      ) {
        setIsPriorityMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!isPriorityMenuOpen) {
      return;
    }

    updatePriorityMenuPosition();

    window.addEventListener('resize', updatePriorityMenuPosition);
    window.addEventListener('scroll', updatePriorityMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updatePriorityMenuPosition);
      window.removeEventListener('scroll', updatePriorityMenuPosition, true);
    };
  }, [isPriorityMenuOpen]);

  return (
    <section
      className={[
        'relative z-20 flex min-h-[142px] rounded-[10px] border border-[#d3c3b7] bg-[#efe6de] px-4 py-3 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)] sm:px-5',
        isPriorityMenuOpen ? 'overflow-visible' : 'overflow-hidden',
      ].join(' ')}
    >
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.38fr)]">
        <div className="grid min-w-0 content-center gap-2">
          <div className="grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-3">
            <p className="text-xs font-bold leading-tight">
              Feedback
              <br />
              Tag
            </p>

            <div className="reaction-hidden-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1">
              {feedbackTags.map((tag) => {
                const isSelected = selectedFeedbackTags.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onFeedbackTagToggle(tag.id)}
                    className={[
                      'h-8 flex-none rounded-[5px] px-3 text-xs font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                      isSelected
                        ? 'text-[#431B1B] ring-2 ring-[#431B1B]/35'
                        : 'text-[#431B1B]/70',
                    ].join(' ')}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-3">
            <p className="text-xs font-bold leading-tight">Actor Tag</p>

            <div className="reaction-hidden-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1">
              {actors.length > 0 ? (
                actors.map((actor) => {
                  const isSelected = selectedActorIds.includes(actor.id);

                  return (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => onActorToggle(actor.id)}
                      className={[
                        'h-8 flex-none rounded-[5px] px-3 text-xs font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                        isSelected
                          ? 'bg-[#431B1B] text-[#fff8ef]'
                          : 'bg-white/45 text-[#431B1B]/72 hover:text-[#431B1B]',
                      ].join(' ')}
                    >
                      {actor.name}
                    </button>
                  );
                })
              ) : (
                <span className="flex h-8 items-center text-[11px] font-bold text-[#431B1B]/38">
                  배우 태그 없음
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-2 border-t border-[#431B1B]/12 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <div className="min-w-0 rounded-[8px] bg-white/28 px-2.5 py-2">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
              <span>Selected Actor</span>
              <span>{selectedActors.length}</span>
            </div>

            <div className="reaction-hidden-scrollbar flex min-h-8 min-w-0 items-center gap-1.5 overflow-x-auto">
              {selectedActors.length > 0 ? (
                selectedActors.map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => onActorToggle(actor.id)}
                    className="h-7 flex-none rounded-[5px] bg-[#431B1B] px-2.5 text-[11px] font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30"
                  >
                    {actor.name}
                  </button>
                ))
              ) : (
                <span className="text-[11px] font-bold text-[#431B1B]/38">
                  선택된 배우 없음
                </span>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <div ref={priorityMenuRef} className="relative min-w-0">
              <button
                ref={priorityButtonRef}
                type="button"
                onClick={() => {
                  updatePriorityMenuPosition();
                  setIsPriorityMenuOpen((current) => !current);
                }}
                className="flex h-8 max-w-[178px] items-center gap-1.5 rounded-[5px] bg-[#431B1B] px-3 text-xs font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30"
                aria-expanded={isPriorityMenuOpen}
                aria-haspopup="menu"
              >
                <span className="min-w-0 truncate">{priorityButtonLabel}</span>
                <ChevronDown size={13} strokeWidth={2.8} className="shrink-0" />
              </button>

              {isPriorityMenuOpen && (
                <div
                  role="menu"
                  className="fixed z-[80] w-40 rounded-[7px] border border-[#431B1B]/12 bg-[#fff8ef] p-1.5 shadow-[0_12px_30px_rgba(67,27,27,0.2)]"
                  style={{
                    top: priorityMenuPosition.top,
                    right: priorityMenuPosition.right,
                  }}
                >
                  {priorityTags.map((priority) => {
                    const isSelected = selectedPriorityTags.includes(
                      priority.id,
                    );

                    return (
                      <button
                        key={priority.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={isSelected}
                        onClick={() => onPriorityTagToggle(priority.id)}
                        className="flex h-8 w-full items-center justify-between gap-2 rounded-[5px] px-2 text-left text-xs font-bold text-[#431B1B] transition hover:bg-[#431B1B]/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/25"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: priority.color }}
                          />
                          <span className="truncate">{priority.label}</span>
                        </span>
                        {isSelected && (
                          <Check
                            size={13}
                            strokeWidth={3}
                            className="shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSelectedActorTimelineMove('previous')}
              disabled={!canPlaySelectedActors}
              className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[#431B1B]/12 text-[#431B1B] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
              aria-label="이전 등장 구간으로 이동"
              title="이전 등장 구간"
            >
              <ChevronLeft size={15} strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={onSelectedActorPlayback}
              disabled={!canPlaySelectedActors}
              className="flex h-8 items-center gap-1.5 rounded-[5px] bg-[#431B1B] px-3 text-[11px] font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
            >
              <Play size={12} fill="#fff8ef" strokeWidth={2.8} />
              선택 배우 재생
            </button>
            <button
              type="button"
              onClick={() => onSelectedActorTimelineMove('next')}
              disabled={!canPlaySelectedActors}
              className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[#431B1B]/12 text-[#431B1B] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
              aria-label="다음 등장 구간으로 이동"
              title="다음 등장 구간"
            >
              <ChevronRight size={15} strokeWidth={3} />
            </button>
          </div>

          {selectedActors.length > 0 && !canPlaySelectedActors && (
            <p className="text-[10px] font-bold text-[#A94444]/72">
              선택한 배우의 등장 구간이 없습니다.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
