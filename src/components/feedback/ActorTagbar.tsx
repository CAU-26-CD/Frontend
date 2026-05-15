import type { Actor } from '../../types/feedback.ts';

type Props = {
  actors: Actor[];
  selectedActors: Actor[];
  onActorSelect: (actor: Actor) => void;
};

export default function ActorTagBar({
  actors,
  selectedActors,
  onActorSelect,
}: Props) {
  return (
    <section className="rounded-2xl border border-[#d3c3b7] bg-[#efe6de] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="shrink-0 border-b border-[#b9a89c] pb-3 text-center text-sm font-bold text-[#431B1B] md:border-b-0 md:border-r md:pb-0 md:pr-5">
          ACTOR
          <br />
          TAG
        </div>

        <div className="flex flex-wrap gap-3">
          {actors.map((actor) => {
            const isSelected = selectedActors.some(
              (selectedActor) => selectedActor.id === actor.id,
            );

            return (
              <button
                type="button"
                onClick={() => onActorSelect(actor)}
                key={actor.id}
                className={[
                  'flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-10px_18px_rgba(67,27,27,0.08),0_10px_24px_rgba(67,27,27,0.10)] backdrop-blur-xl backdrop-saturate-150 transition',
                  isSelected
                    ? 'border-white/35 bg-[#431B1B]/72 text-[#fff8ef] hover:bg-[#431B1B]/84'
                    : 'border-white/45 bg-white/24 text-[#2d1715] hover:bg-white/36 hover:text-[#431B1B]',
                ].join(' ')}
              >
                <span className="font-semibold leading-none">{actor.name}</span>
                <span
                  className={[
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
                    isSelected
                      ? 'border border-white/20 bg-white/18 text-[#fff8ef]'
                      : 'border border-white/35 bg-white/26 text-[#806b61]',
                  ].join(' ')}
                >
                  /{actor.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
