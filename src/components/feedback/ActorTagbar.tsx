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
    <section className="rounded-3xl bg-neutral-300 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="shrink-0 border-b border-neutral-500 pb-3 text-center text-sm font-medium text-neutral-500 md:border-b-0 md:border-r md:pb-0 md:pr-5">
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
                  'rounded-xl px-4 py-2 text-sm transition',
                  isSelected
                    ? 'bg-neutral-700 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-white',
                ].join(' ')}
              >
                <div className="font-semibold">{actor.name}</div>
                <div className="text-xs opacity-70">/{actor.shortcut}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
