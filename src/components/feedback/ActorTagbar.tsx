import type { Actor } from '../../types/feedback.ts';

type Props = {
  actors: Actor[];
  selectedActors: Actor[];
};

export default function ActorTagBar({
  actors,
  selectedActors,
}: Props) {
  return (
    <section className="rounded-[28px] border border-white/42 bg-[#efe6de]/58 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),inset_0_14px_34px_rgba(255,248,239,0.24),inset_0_-18px_42px_rgba(67,27,27,0.14),0_20px_52px_rgba(0,0,0,0.20)] backdrop-blur-xl backdrop-saturate-150">
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
              <div
                key={actor.id}
                className={[
                  'flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm transition',
                  isSelected
                    ? 'border-white/28 bg-[#431B1B]/72 text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-10px_18px_rgba(0,0,0,0.16),0_8px_20px_rgba(67,27,27,0.22)] backdrop-blur-lg'
                    : 'border-white/42 bg-white/20 text-[#2d1715] shadow-[inset_0_1px_0_rgba(255,255,255,0.64),inset_0_-8px_18px_rgba(67,27,27,0.08),0_8px_18px_rgba(67,27,27,0.08)] backdrop-blur-lg hover:border-white/58 hover:bg-white/30 hover:text-[#431B1B]',
                ].join(' ')}
              >
                <span className="font-semibold leading-none">{actor.name}</span>
                <span
                  className={[
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
                    isSelected
                      ? 'border border-white/18 bg-white/18 text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
                      : 'border border-white/32 bg-white/24 text-[#806b61] shadow-[inset_0_1px_0_rgba(255,255,255,0.56)]',
                  ].join(' ')}
                >
                  /{actor.shortcut}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
