import type { ReactNode } from 'react';
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
  onFeedbackTagToggle: (tagId: string) => void;
  onPriorityTagToggle: (priority: FeedbackPriority) => void;
  onActorToggle: (actorId: number) => void;
  layout?: 'horizontal' | 'vertical';
  scopeControl?: ReactNode;
};

export default function ReviewFilterBar({
  feedbackTags,
  priorityTags,
  actors,
  selectedFeedbackTags,
  selectedPriorityTags,
  selectedActorIds,
  onFeedbackTagToggle,
  onPriorityTagToggle,
  onActorToggle,
  layout = 'horizontal',
  scopeControl,
}: ReviewFilterBarProps) {
  const topFeedbackTags = feedbackTags.slice(3, 7);
  const bottomFeedbackTags = feedbackTags.slice(0, 3);

  if (layout === 'vertical') {
    return (
      <aside className="reaction-ui-font flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-[10px] border border-[#d3c3b7] bg-[#efe6de] p-3 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
        {scopeControl}

        <section className="min-w-0 rounded-[8px] bg-white/28 px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
            <span>Actor Tag</span>
            <span>{actors.length}</span>
          </div>

          <div className="reaction-hidden-scrollbar flex max-h-28 min-w-0 flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
            {actors.length > 0 ? (
              actors.map((actor) => {
                const isSelected = selectedActorIds.includes(actor.id);

                return (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => onActorToggle(actor.id)}
                    className={[
                      'h-7 flex-none rounded-[5px] px-2.5 text-[11px] font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
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
              <span className="flex h-7 items-center text-[11px] font-bold text-[#431B1B]/38">
                배우 태그 없음
              </span>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-[8px] bg-white/28 px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
            <span>Feedback Tag</span>
            <span>{selectedFeedbackTags.length}</span>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-1.5">
            {feedbackTags.map((tag) => {
              const isSelected = selectedFeedbackTags.includes(tag.id);

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onFeedbackTagToggle(tag.id)}
                  className={[
                    'h-7 min-w-0 rounded-[5px] px-1.5 text-[11px] font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
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
        </section>

        <section className="min-w-0 rounded-[8px] bg-white/28 px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
            <span>Priority</span>
            <span>{selectedPriorityTags.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {priorityTags.map((priority) => {
              const isSelected = selectedPriorityTags.includes(priority.id);

              return (
                <button
                  key={priority.id}
                  type="button"
                  onClick={() => onPriorityTagToggle(priority.id)}
                  className={[
                    'h-7 rounded-[5px] border bg-white/28 px-1.5 text-[11px] font-bold text-[#431B1B] transition hover:scale-[1.03] hover:bg-white/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                    isSelected ? 'border-[2px] bg-white/52' : 'border',
                  ].join(' ')}
                  style={{ borderColor: priority.color }}
                >
                  {priority.label}
                </button>
              );
            })}
          </div>
        </section>

      </aside>
    );
  }

  return (
    <section className="relative z-20 flex min-h-[96px] overflow-hidden rounded-[10px] border border-[#d3c3b7] bg-[#efe6de] px-4 py-2.5 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)] sm:px-5">
      <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_112px]">
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
                    rowIndex === 0 ? 'grid-cols-4' : 'grid-cols-3',
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

        <div className="min-w-0 border-t border-[#431B1B]/12 pt-2 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
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
        </div>
      </div>
    </section>
  );
}
