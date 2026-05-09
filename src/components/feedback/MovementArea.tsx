import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Actor } from '../../types/feedback';

const MOVEMENT_FEEDBACK_PREFIX = '[동선]';

const MOVEMENT_POINTS = [
  { id: 1, x: 22, y: 36 },
  { id: 2, x: 16.5, y: 55 },
  { id: 3, x: 15, y: 77 },
  { id: 4, x: 25.5, y: 77 },
  { id: 5, x: 39, y: 77 },
  { id: 6, x: 52, y: 63 },
  { id: 7, x: 43.5, y: 38 },
  { id: 8, x: 57, y: 15 },
  { id: 9, x: 74, y: 58 },
  { id: 10, x: 81.5, y: 69 },
];

const STAGE_BLOCKS = [
  { id: 'left', x: 6, y: 56, width: 6.5, height: 29 },
  { id: 'center-left', x: 23, y: 47, width: 14.5, height: 16 },
  { id: 'center', x: 48, y: 16, width: 18.5, height: 24 },
];

type MovementAreaProps = {
  actors: Actor[];
  selectedActors: Actor[];
  timestamp: string | null;
  content: string;
  onTimestampStart: () => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void;
};

export default function MovementArea({
  selectedActors,
  timestamp,
  content,
  onTimestampStart,
  onContentChange,
  onSubmit,
}: MovementAreaProps) {
  const [movementPath, setMovementPath] = useState<number[]>([]);

  useEffect(() => {
    if (!content && !timestamp) {
      setMovementPath([]);
    }
  }, [content, timestamp]);

  const buildMovementContent = (nextPath: number[]) => {
    const actorNames =
      selectedActors.length > 0
        ? selectedActors.map((actor) => actor.name).join(', ')
        : '배우';

    return `${MOVEMENT_FEEDBACK_PREFIX} ${actorNames}: ${nextPath.join(
      ', ',
    )} 순서로 이동`;
  };

  const applyMovementPath = (nextPath: number[]) => {
    setMovementPath(nextPath);

    if (nextPath.length > 0) {
      onContentChange(buildMovementContent(nextPath));
      return;
    }

    if (content.startsWith(MOVEMENT_FEEDBACK_PREFIX)) {
      onContentChange('');
    }
  };

  const handlePointClick = (pointId: number) => {
    if (!timestamp) {
      onTimestampStart();
    }

    const nextPath = [...movementPath, pointId];

    applyMovementPath(nextPath);
  };

  const handleReset = () => {
    applyMovementPath([]);
  };

  const handleUndo = () => {
    if (movementPath.length === 0) {
      return;
    }

    applyMovementPath(movementPath.slice(0, -1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      handleUndo();
    }
  };

  return (
    <section
      className="min-h-0 flex-1 rounded-3xl bg-neutral-300 p-6"
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-full min-h-0 flex-col rounded-2xl bg-neutral-200 p-4">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-neutral-300">
          <div className="absolute left-[10%] right-[32%] top-[7%] border-t border-neutral-700" />
          <div className="absolute left-[68%] top-[7%] h-[36%] w-[28%] origin-top-left rotate-[31deg] border-t border-neutral-700" />
          <div className="absolute left-[6%] top-[55%] h-[20%] w-[22%] origin-top-left -rotate-45 border-t border-neutral-700" />
          <div className="absolute left-[77%] top-[46%] h-[36%] w-[24%] origin-top-left rotate-[55deg] border-t border-neutral-700" />
          <div className="absolute inset-x-0 top-[39%] border-t border-dashed border-neutral-400" />

          {STAGE_BLOCKS.map((block) => (
            <div
              key={block.id}
              className="absolute bg-neutral-500"
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
              }}
            />
          ))}

          {MOVEMENT_POINTS.map((point) => {
            const isPicked = movementPath.includes(point.id);

            return (
              <button
                key={point.id}
                type="button"
                onClick={() => handlePointClick(point.id)}
                className={[
                  'absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg text-sm font-semibold shadow-md transition',
                  isPicked
                    ? 'bg-orange-500 text-white ring-2 ring-white/80'
                    : 'bg-orange-200 text-neutral-700 hover:-translate-y-[55%] hover:bg-orange-300',
                ].join(' ')}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                aria-label={`${point.id}번 위치 선택`}
              >
                {point.id}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-600">
          {movementPath.length > 0 ? (
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto pr-2">
              {movementPath.map((pointId, index) => (
                <div key={`${pointId}-${index}`} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-1 h-px w-5 shrink-0 bg-orange-300" />
                  )}
                  <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 px-2 text-[11px] font-bold text-white shadow-sm">
                    {pointId}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="truncate">
              번호를 순서대로 클릭하면 동선 피드백이 입력됩니다
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 rounded-full bg-white/70 px-3 py-1 font-semibold text-neutral-700 transition hover:bg-white"
          >
            초기화
          </button>
        </div>
      </div>
    </section>
  );
}
