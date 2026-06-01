import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
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
  const topFeedbackTags = feedbackTags.slice(0, 3);
  const bottomFeedbackTags = feedbackTags.slice(3, 7);
  const selectedActors = actors.filter((actor) =>
    selectedActorIds.includes(actor.id),
  );
  const selectedActorsWithTimeline = selectedActors.filter((actor) =>
    actorIdsWithTimeline.includes(actor.id),
  );
  const canPlaySelectedActors = selectedActorsWithTimeline.length > 0;

  return (
    <section className="relative z-20 flex min-h-[96px] overflow-hidden rounded-[10px] border border-[#d3c3b7] bg-[#efe6de] px-4 py-2.5 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)] sm:px-5">
      <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.44fr)]">
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
          <div className="min-w-0 rounded-[8px] bg-white/28 px-2.5 py-1.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
              <span>Actor Tag</span>
              <span>{actors.length}</span>
            </div>

            <div className="reaction-hidden-scrollbar flex min-h-[62px] min-w-0 flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
              {actors.length > 0 ? (
                actors.map((actor) => {
                  const isSelected = selectedActorIds.includes(actor.id);

                  return (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => onActorToggle(actor.id)}
                      className={[
                        'h-6 flex-none rounded-[5px] px-2.5 text-[11px] font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
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
                <span className="flex h-6 items-center text-[11px] font-bold text-[#431B1B]/38">
                  배우 태그 없음
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[8px] bg-white/28 px-2.5 py-1.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
              <span>Feedback Tag</span>
              <span>{selectedFeedbackTags.length}</span>
            </div>

            <div className="grid min-w-0 gap-1">
              {[topFeedbackTags, bottomFeedbackTags].map((tagRow, rowIndex) => (
                <div
                  key={rowIndex}
                  className={[
                    'grid gap-1',
                    rowIndex === 0 ? 'grid-cols-3' : 'grid-cols-4',
                  ].join(' ')}
                >
                  {tagRow.map((tag) => {
                    const isSelected = selectedFeedbackTags.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => onFeedbackTagToggle(tag.id)}
                        className={[
                          'h-6 min-w-0 rounded-[5px] px-1 text-[11px] font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                          isSelected
                            ? 'text-[#431B1B] ring-2 ring-[#431B1B]/35'
                            : 'text-[#431B1B]/70',
                        ].join(' ')}
                        style={{ backgroundColor: tag.color }}
                      >
                        <span className="block truncate">{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 border-t border-[#431B1B]/12 pt-2 lg:grid-cols-[112px_1px_minmax(0,1fr)] lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <div className="min-w-0 rounded-[8px] bg-white/28 px-2 py-1.5">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
              Priority
            </p>
            <div className="grid grid-cols-2 gap-1">
              {priorityTags.map((priority) => {
                const isSelected = selectedPriorityTags.includes(priority.id);

                return (
                  <button
                    key={priority.id}
                    type="button"
                    onClick={() => onPriorityTagToggle(priority.id)}
                    className={[
                      'h-6 rounded-[5px] border bg-white/28 px-1.5 text-[11px] font-bold text-[#431B1B] transition hover:scale-[1.03] hover:bg-white/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                      isSelected
                        ? 'border-[2px] bg-white/52'
                        : 'border text-[#431B1B]/70',
                    ].join(' ')}
                    style={{ borderColor: priority.color }}
                  >
                    {priority.label}
                  </button>
                );
              })}
            </div>
          </div>

          <span className="hidden h-full w-px bg-[#431B1B]/12 lg:block" />

          <div className="grid min-w-0 content-center gap-1.5">
            <div className="min-w-0 rounded-[8px] bg-white/28 px-2.5 py-1.5">
              <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
                <span>Selected Actor</span>
                <span>{selectedActors.length}</span>
              </div>

              <div className="reaction-hidden-scrollbar flex min-h-7 min-w-0 items-center gap-1.5 overflow-x-auto">
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

            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectedActorTimelineMove('previous')}
                disabled={!canPlaySelectedActors}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#431B1B]/12 text-[#431B1B] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                aria-label="이전 등장 구간으로 이동"
                title="이전 등장 구간"
              >
                <ChevronLeft size={15} strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={onSelectedActorPlayback}
                disabled={!canPlaySelectedActors}
                className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-[#431B1B] px-2.5 text-[11px] font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
              >
                <Play size={12} fill="#fff8ef" strokeWidth={2.8} />
                <span className="truncate">선택 배우 재생</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectedActorTimelineMove('next')}
                disabled={!canPlaySelectedActors}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#431B1B]/12 text-[#431B1B] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
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
      </div>
    </section>
  );
}
