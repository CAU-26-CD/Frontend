import { useEffect, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import movePanelBg from '../../images/icon/move-pannel-bg.svg';
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

type MovementPoint = {
  x: number;
  y: number;
};

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
  const [cursorPoint, setCursorPoint] = useState<MovementPoint | null>(null);

  useEffect(() => {
    if (!content && !timestamp) {
      setMovementPath([]);
      setCursorPoint(null);
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
    setCursorPoint(null);
  };

  const handleUndo = () => {
    if (movementPath.length === 0) {
      return;
    }

    applyMovementPath(movementPath.slice(0, -1));
  };

  const handleStageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (movementPath.length === 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    setCursorPoint({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleStageDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;

    if (target instanceof HTMLElement && target.closest('button')) {
      return;
    }

    handleReset();
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
      className="relative h-full min-h-[360px] w-full overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      <div className="relative z-10 grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden p-[clamp(18px,2.2vw,28px)]">
        <img
          src={movePanelBg}
          alt=""
          className="pointer-events-none absolute inset-0 z-0 block h-full w-full max-w-none object-fill"
          aria-hidden="true"
        />

        <div
          className="relative z-10 h-full min-h-0 w-full overflow-hidden rounded-[10px] bg-[#431B1B]"
          onMouseMove={handleStageMouseMove}
          onMouseLeave={() => setCursorPoint(null)}
          onDoubleClick={handleStageDoubleClick}
        >
          <div className="absolute left-[10%] right-[32%] top-[7%] border-t border-[#DF8181]/55" />
          <div className="absolute left-[68%] top-[7%] h-[36%] w-[28%] origin-top-left rotate-[31deg] border-t border-[#DF8181]/55" />
          <div className="absolute left-[6%] top-[55%] h-[20%] w-[22%] origin-top-left -rotate-45 border-t border-[#DF8181]/55" />
          <div className="absolute left-[77%] top-[46%] h-[36%] w-[24%] origin-top-left rotate-[55deg] border-t border-[#DF8181]/55" />
          <div className="absolute inset-x-0 top-[39%] border-t border-dashed border-[#DF8181]/35" />

          {STAGE_BLOCKS.map((block) => (
            <div
              key={block.id}
              className="absolute border border-[#DF8181]/50 bg-[#5B2A2A]"
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
              }}
            />
          ))}

          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              {movementPath.slice(1).map((pointId, index) => {
                const from = MOVEMENT_POINTS.find(
                  (point) => point.id === movementPath[index],
                );
                const to = MOVEMENT_POINTS.find(
                  (point) => point.id === pointId,
                );

                if (!from || !to) {
                  return null;
                }

                return (
                  <linearGradient
                    key={`movement-line-gradient-${index}`}
                    id={`movement-line-gradient-${index}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#f4f4f5" stopOpacity="0.22" />
                    <stop
                      offset="100%"
                      stopColor="#f4f4f5"
                      stopOpacity="0.95"
                    />
                  </linearGradient>
                );
              })}

              {movementPath.length > 0 &&
                cursorPoint &&
                (() => {
                  const from = MOVEMENT_POINTS.find(
                    (point) =>
                      point.id === movementPath[movementPath.length - 1],
                  );

                  if (!from) {
                    return null;
                  }

                  return (
                    <linearGradient
                      id="movement-preview-gradient"
                      x1={from.x}
                      y1={from.y}
                      x2={cursorPoint.x}
                      y2={cursorPoint.y}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop
                        offset="0%"
                        stopColor="#f4f4f5"
                        stopOpacity="0.18"
                      />
                      <stop
                        offset="100%"
                        stopColor="#f4f4f5"
                        stopOpacity="0.82"
                      />
                    </linearGradient>
                  );
                })()}
            </defs>

            {movementPath.slice(1).map((pointId, index) => {
              const from = MOVEMENT_POINTS.find(
                (point) => point.id === movementPath[index],
              );
              const to = MOVEMENT_POINTS.find((point) => point.id === pointId);

              if (!from || !to) {
                return null;
              }

              return (
                <line
                  key={`${movementPath[index]}-${pointId}-${index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  vectorEffect="non-scaling-stroke"
                  stroke={`url(#movement-line-gradient-${index})`}
                  strokeWidth="3.3"
                  strokeLinecap="round"
                />
              );
            })}

            {movementPath.length > 0 &&
              cursorPoint &&
              (() => {
                const from = MOVEMENT_POINTS.find(
                  (point) => point.id === movementPath[movementPath.length - 1],
                );

                if (!from) {
                  return null;
                }

                return (
                  <g>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={cursorPoint.x}
                      y2={cursorPoint.y}
                      vectorEffect="non-scaling-stroke"
                      stroke="url(#movement-preview-gradient)"
                      strokeWidth="3.3"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })()}
          </svg>

          {movementPath.length > 0 && cursorPoint && (
            <span
              className="pointer-events-none absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4f4f5] shadow-[0_0_12px_rgba(244,244,245,0.42)]"
              style={{
                left: `${cursorPoint.x}%`,
                top: `${cursorPoint.y}%`,
              }}
              aria-hidden="true"
            />
          )}

          {MOVEMENT_POINTS.map((point) => {
            const isPicked = movementPath.includes(point.id);

            return (
              <button
                key={point.id}
                type="button"
                onClick={() => handlePointClick(point.id)}
                className={[
                  'absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-semibold transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DF8181]/65',
                  isPicked
                    ? 'border-[#DF8181] bg-[#DF8181] text-[#431B1B]'
                    : 'border-[#DF8181]/80 bg-[#431B1B] text-[#EFE6DE]',
                ].join(' ')}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                aria-label={`${point.id}번 위치 선택`}
              >
                {point.id}
              </button>
            );
          })}
        </div>

        <div className="relative z-10 flex min-h-7 items-center justify-between gap-3 text-xs text-[#604942]">
          {movementPath.length > 0 ? (
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto pr-2">
              {movementPath.map((pointId, index) => (
                <div key={`${pointId}-${index}`} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-1 h-px w-5 shrink-0 bg-[#DF8181]/70" />
                  )}
                  <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border border-[#DF8181] bg-[#431B1B] px-2 text-[11px] font-bold text-[#EFE6DE]">
                    {pointId}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="truncate text-[#431B1B]">
              번호를 순서대로 클릭하면 동선 피드백이 입력됩니다
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 rounded-full border border-[#431B1B] bg-transparent px-3 py-1 font-semibold text-[#431B1B] transition hover:scale-105"
          >
            초기화
          </button>
        </div>
      </div>
    </section>
  );
}
