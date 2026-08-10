import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

const MOVEMENT_POINTS = [
  { id: 1, x: 22, y: 36 },
  { id: 2, x: 16.5, y: 55 },
  { id: 3, x: 18, y: 77 },
  { id: 4, x: 25.5, y: 77 },
  { id: 5, x: 39, y: 77 },
  { id: 6, x: 52, y: 63 },
  { id: 7, x: 43.5, y: 38 },
  { id: 8, x: 44, y: 10.5 },
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

type ScriptMovementPanelProps = {
  timestamp: string | null;
  content: string;
  disabled?: boolean;
  onTimestampStart: () => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ScriptMovementPanel({
  timestamp,
  content,
  disabled = false,
  onTimestampStart,
  onContentChange,
  onSubmit,
}: ScriptMovementPanelProps) {
  const [movementPath, setMovementPath] = useState<number[]>([]);
  const [cursorPoint, setCursorPoint] = useState<MovementPoint | null>(null);
  const lastAppliedMovementContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!content && !timestamp) {
      const resetTimer = window.setTimeout(() => {
        setMovementPath([]);
        setCursorPoint(null);
        lastAppliedMovementContentRef.current = null;
      }, 0);

      return () => {
        window.clearTimeout(resetTimer);
      };
    }
  }, [content, timestamp]);

  const buildMovementContent = (nextPath: number[]) =>
    `동선: ${nextPath.join(' -> ')}`;

  const replaceLastAppliedMovementContent = (
    value: string,
    nextMovementContent: string,
  ) => {
    const lastAppliedMovementContent = lastAppliedMovementContentRef.current;

    if (!lastAppliedMovementContent) {
      return null;
    }

    const movementStartIndex = value.lastIndexOf(lastAppliedMovementContent);

    if (movementStartIndex === -1) {
      return null;
    }

    return `${value.slice(0, movementStartIndex)}${nextMovementContent}${value.slice(
      movementStartIndex + lastAppliedMovementContent.length,
    )}`;
  };

  const removeLastAppliedMovementContent = (value: string) => {
    const lastAppliedMovementContent = lastAppliedMovementContentRef.current;

    if (!lastAppliedMovementContent) {
      return value;
    }

    const movementStartIndex = value.lastIndexOf(lastAppliedMovementContent);

    if (movementStartIndex === -1) {
      return value;
    }

    const beforeMovement = value.slice(0, movementStartIndex);
    const afterMovement = value.slice(
      movementStartIndex + lastAppliedMovementContent.length,
    );

    if (!afterMovement) {
      return beforeMovement.trimEnd();
    }

    if (!beforeMovement) {
      return afterMovement.trimStart();
    }

    return `${beforeMovement}${afterMovement}`;
  };

  const appendMovementContent = (
    baseContent: string,
    movementContent: string,
  ) => {
    const normalizedBaseContent = baseContent.trimEnd();

    return normalizedBaseContent
      ? `${normalizedBaseContent}\n${movementContent}`
      : movementContent;
  };

  const applyMovementPath = (nextPath: number[]) => {
    setMovementPath(nextPath);

    if (nextPath.length > 0) {
      const movementContent = buildMovementContent(nextPath);
      const replacedContent = replaceLastAppliedMovementContent(
        content,
        movementContent,
      );

      onContentChange(
        replacedContent ?? appendMovementContent(content, movementContent),
      );
      lastAppliedMovementContentRef.current = movementContent;
      return;
    }

    const baseContent = removeLastAppliedMovementContent(content);

    if (baseContent !== content) {
      onContentChange(baseContent);
    }

    lastAppliedMovementContentRef.current = null;
  };

  const handlePointClick = (pointId: number) => {
    if (disabled) {
      return;
    }

    if (!timestamp) {
      onTimestampStart();
    }

    applyMovementPath([...movementPath, pointId]);
  };

  const handleReset = () => {
    if (disabled) {
      return;
    }

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

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled) {
      return;
    }

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
      data-script-draft-movement-area="true"
      className={[
        'reaction-ui-font relative h-full min-h-[198px] overflow-hidden rounded-[8px] border border-white/20 bg-[#1b0708]/24 p-3 text-[#eee7dc] shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm',
        disabled ? 'opacity-70' : '',
      ].join(' ')}
      onKeyDown={handleKeyDown}
    >
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_24px] gap-2">
        <div className="relative min-h-0 overflow-hidden rounded-[8px] border border-white/10 bg-[#431B1B] [container-type:size]">
          <div
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-[8px] bg-[#431B1B] [container-type:inline-size]"
            style={{
              width: 'min(100cqw, calc(100cqh * 793 / 450))',
              height: 'min(100cqh, calc(100cqw * 450 / 793))',
              transform: 'translate(-50%, -50%)',
            }}
            onMouseMove={handleStageMouseMove}
            onMouseLeave={() => setCursorPoint(null)}
            onDoubleClick={handleReset}
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
                      key={`script-movement-line-gradient-${index}`}
                      id={`script-movement-line-gradient-${index}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop
                        offset="0%"
                        stopColor="#fff8ef"
                        stopOpacity="0.24"
                      />
                      <stop
                        offset="100%"
                        stopColor="#fff8ef"
                        stopOpacity="0.92"
                      />
                    </linearGradient>
                  );
                })}
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
                    stroke={`url(#script-movement-line-gradient-${index})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
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
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={cursorPoint.x}
                      y2={cursorPoint.y}
                      vectorEffect="non-scaling-stroke"
                      stroke="#fff8ef"
                      strokeOpacity="0.52"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  );
                })()}
            </svg>

            {MOVEMENT_POINTS.map((point) => {
              const isPicked = movementPath.includes(point.id);

              return (
                <button
                  key={point.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePointClick(point.id)}
                  className={[
                    'absolute z-20 flex h-[clamp(12px,4.6cqw,18px)] w-[clamp(12px,4.6cqw,18px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[clamp(6px,1.5cqw,7px)] font-bold leading-none transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DF8181]/72 disabled:cursor-not-allowed',
                    isPicked
                      ? 'border-[#fff8ef] bg-[#DF8181] text-[#431B1B] shadow-[0_0_0_3px_rgba(223,129,129,0.18)]'
                      : 'border-[#DF8181]/82 bg-[#431B1B] text-[#efe6de]',
                  ].join(' ')}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  aria-label={`${point.id}번 위치 선택`}
                >
                  {point.id}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex h-6 items-center justify-between gap-3 text-[11px] font-bold">
          <span className="min-w-0 truncate text-[#d9cec4]">
            {movementPath.length > 0
              ? movementPath.join(' -> ')
              : '번호를 순서대로 클릭하면 동선 피드백이 입력됩니다'}
          </span>

          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="flex h-6 shrink-0 items-center rounded-full border border-white/35 bg-white/10 px-2.5 text-[11px] text-[#eee7dc] transition hover:bg-white/18"
          >
            초기화
          </button>
        </div>
      </div>
    </section>
  );
}
