import type { CSSProperties } from 'react';
import type { Actor } from '../../types/feedback.ts';
import { getScriptActorColor } from '../../utils/scriptFeedbackStyle.ts';

type Props = {
  actors: Actor[];
  selectedActors: Actor[];
  onActorSelect: (actor: Actor) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  matchScriptColors?: boolean;
};

export default function ActorTagBar({
  actors,
  selectedActors,
  onActorSelect,
  disabled = false,
  variant = 'default',
}: Props) {
  const isCompact = variant === 'compact';

  return (
    <section
      className={[
        'flex rounded-2xl border border-[#d3c3b7] bg-[#efe6de] shadow-[0_18px_44px_rgba(0,0,0,0.16)] transition',
        isCompact
          ? 'h-auto min-h-0 px-4 py-2.5'
          : 'h-full min-h-[112px] px-6 py-4',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div
        className={[
          'flex w-full flex-col md:flex-row md:items-stretch',
          isCompact ? 'h-auto gap-2' : 'h-full gap-3',
        ].join(' ')}
      >
        <div
          className={[
            'flex shrink-0 items-center justify-center border-b border-[#b9a89c] text-center font-bold text-[#431B1B] md:border-b-0 md:border-r md:pb-0',
            isCompact
              ? 'min-w-[68px] pb-2 text-[10px] leading-tight md:pr-4'
              : 'h-full min-w-[88px] pb-3 text-xs md:pr-6',
          ].join(' ')}
        >
          ACTOR
          <br />
          TAG
        </div>

        <div
          className={[
            'flex min-w-0 flex-1 flex-col justify-center',
            isCompact ? 'gap-1.5' : 'gap-2',
          ].join(' ')}
        >
          <div
            className={[
              'flex flex-wrap items-center',
              isCompact ? 'gap-2' : 'gap-3',
            ].join(' ')}
          >
            {actors.length === 0 && (
              <p className="text-xs font-bold text-[#806b61]">
                등록된 배우가 없습니다.
              </p>
            )}

            {actors.map((actor, index) => {
              const isSelected = selectedActors.some(
                (selectedActor) => selectedActor.id === actor.id,
              );
              const actorColor = getScriptActorColor(index);

              return (
                <button
                  type="button"
                  onClick={() => onActorSelect(actor)}
                  disabled={disabled}
                  key={actor.id}
                  className={[
                    'flex flex-1 items-center justify-center gap-2 rounded-full border text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-10px_18px_rgba(67,27,27,0.08),0_10px_24px_rgba(67,27,27,0.10)] backdrop-blur-xl backdrop-saturate-150 transition hover:brightness-110 md:flex-none',
                    isCompact
                      ? 'min-h-8 min-w-[88px] px-3 py-1.5 text-xs'
                      : 'min-h-10 min-w-[104px] px-4 py-2 text-sm',
                    disabled ? 'cursor-not-allowed' : '',
                    isSelected ? 'actor-tag-button-selected' : '',
                  ].join(' ')}
                  style={
                    {
                      backgroundColor: actorColor,
                      borderColor: actorColor,
                      '--actor-tag-glow': `${actorColor}8c`,
                      '--actor-tag-glow-strong': `${actorColor}5c`,
                      '--actor-tag-glow-soft': `${actorColor}33`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -10px 18px rgba(67,27,27,0.08), 0 0 0 1px ${actorColor}33, 0 10px 24px rgba(67,27,27,0.10)`,
                    } as CSSProperties
                  }
                >
                  <span className="font-semibold leading-none">
                    {actor.name}
                  </span>
                  <span
                    className={[
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
                      'border border-white/36 bg-white/24 text-[#fff8ef]',
                    ].join(' ')}
                  >
                    /{actor.shortcut}
                  </span>
                </button>
              );
            })}
          </div>

          {!isCompact && !disabled && actors.length > 0 && (
            <p className="truncate text-[10px] font-semibold text-[#431B1B]/45">
              Shift+Backspace로 마지막 배우를 삭제할 수 있습니다
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
