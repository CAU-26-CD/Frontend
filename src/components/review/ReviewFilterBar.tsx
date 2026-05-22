import type { Actor } from '../../types/feedback';

export type ReviewFeedbackTag = {
  id: string;
  label: string;
  color: string;
};

type ReviewFilterBarProps = {
  feedbackTags: ReviewFeedbackTag[];
  actors: Actor[];
  selectedFeedbackTags: string[];
  selectedActorIds: number[];
  actorIdsWithTimeline: number[];
  onFeedbackTagToggle: (tagId: string) => void;
  onActorToggle: (actorId: number) => void;
  onSelectedActorPlayback: () => void;
};

export default function ReviewFilterBar({
  feedbackTags,
  actors,
  selectedFeedbackTags,
  selectedActorIds,
  actorIdsWithTimeline,
  onFeedbackTagToggle,
  onActorToggle,
  onSelectedActorPlayback,
}: ReviewFilterBarProps) {
  const selectedActors = actors.filter((actor) =>
    selectedActorIds.includes(actor.id),
  );
  const selectedActorsWithTimeline = selectedActors.filter((actor) =>
    actorIdsWithTimeline.includes(actor.id),
  );
  const canPlaySelectedActors = selectedActorsWithTimeline.length > 0;

  return (
    <section className="flex h-full min-h-[112px] rounded-2xl border border-[#d3c3b7] bg-[#efe6de] px-6 py-4 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
      <div className="grid h-full w-full min-w-0 grid-cols-[76px_minmax(0,1fr)_minmax(180px,0.42fr)] gap-x-5 gap-y-2">
        <p className="self-center text-xs font-bold leading-tight">
          Feedback
          <br />
          Tag
        </p>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {feedbackTags.map((tag) => {
            const isSelected = selectedFeedbackTags.includes(tag.id);

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onFeedbackTagToggle(tag.id)}
                className={[
                  'h-7 rounded-[5px] px-3 text-xs font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
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

        <div className="row-span-2 flex min-w-0 flex-col justify-center border-l border-[#431B1B]/12 pl-5">
          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
            {selectedActors.length > 0 ? (
              selectedActors.map((actor) => (
                <span
                  key={actor.id}
                  className="rounded-[5px] bg-[#431B1B]/12 px-2 py-1 text-[11px] font-bold text-[#431B1B]"
                >
                  {actor.name}
                </span>
              ))
            ) : (
              <span className="text-[11px] font-bold text-[#431B1B]/38">
                선택된 배우 없음
              </span>
            )}
          </div>
          {selectedActors.length > 0 && !canPlaySelectedActors && (
            <p className="mt-1 text-[10px] font-bold text-[#A94444]/72">
              선택한 배우의 등장 구간이 없습니다.
            </p>
          )}
          <button
            type="button"
            onClick={onSelectedActorPlayback}
            disabled={!canPlaySelectedActors}
            className="mt-2 h-7 self-start rounded-[5px] bg-[#431B1B] px-3 text-[11px] font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          >
            선택 배우만 재생
          </button>
        </div>

        <p className="self-center text-xs font-bold leading-tight">Actor Tag</p>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {actors.map((actor) => {
            const isSelected = selectedActorIds.includes(actor.id);

            return (
              <button
                key={actor.id}
                type="button"
                onClick={() => onActorToggle(actor.id)}
                className={[
                  'h-7 rounded-[5px] px-3 text-xs font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                  isSelected
                    ? 'bg-[#431B1B] text-[#fff8ef]'
                    : 'bg-white/45 text-[#431B1B]/72 hover:text-[#431B1B]',
                ].join(' ')}
              >
                {actor.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
