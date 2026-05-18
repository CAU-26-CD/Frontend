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
  onFeedbackTagToggle: (tagId: string) => void;
  onActorToggle: (actorId: number) => void;
};

export default function ReviewFilterBar({
  feedbackTags,
  actors,
  selectedFeedbackTags,
  selectedActorIds,
  onFeedbackTagToggle,
  onActorToggle,
}: ReviewFilterBarProps) {
  return (
    <section className="flex h-full min-h-[112px] rounded-2xl border border-[#d3c3b7] bg-[#efe6de] px-6 py-4 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
      <div className="grid h-full w-full min-w-0 grid-cols-[76px_minmax(0,1fr)] gap-x-5 gap-y-2">
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
