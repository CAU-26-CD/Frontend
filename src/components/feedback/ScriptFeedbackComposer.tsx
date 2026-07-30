import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFeedbackV2 } from '../../apis/feedback';
import type { FeedbackV2Response } from '../../apis/feedback';
import type { Actor } from '../../types/feedback';

export type ScriptFeedbackDraftAnchor = {
  page: number;
  x: number;
  y: number;
  left: number;
  top: number;
  viewportLeft: number;
  viewportTop: number;
  videoOffsetSeconds: number;
};

type ScriptFeedbackComposerProps = {
  anchor: ScriptFeedbackDraftAnchor;
  actors: Actor[];
  sessionId: number;
  userId: number | null;
  content: string;
  disabled?: boolean;
  onContentChange: (content: string) => void;
  onCreated: (feedback: FeedbackV2Response) => void;
  onCancel: () => void;
};

const ACTOR_COLORS = [
  '#1D8FE8',
  '#18A66A',
  '#D15757',
  '#8C6EE8',
  '#EF9F2D',
  '#D9578A',
];
const RADIAL_DISTANCE = 49;
const URGENT_MARK_PATTERN = /!{3,}/;

const getActorColor = (index: number) =>
  ACTOR_COLORS[index % ACTOR_COLORS.length];

type ActorSelectionState = {
  actorIds: number[];
  activeActorId: number | null;
  hasOpenedInput: boolean;
};

export default function ScriptFeedbackComposer({
  anchor,
  actors,
  sessionId,
  userId,
  content,
  disabled = false,
  onContentChange,
  onCreated,
  onCancel,
}: ScriptFeedbackComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<ActorSelectionState>({
    actorIds: [],
    activeActorId: null,
    hasOpenedInput: false,
  });
  const [hoveredActorId, setHoveredActorId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const visibleActors = useMemo(() => actors.slice(0, 6), [actors]);
  const selectedActors = useMemo(() => {
    return selection.actorIds
      .map((actorId) => visibleActors.find((actor) => actor.id === actorId))
      .filter((actor): actor is Actor => Boolean(actor));
  }, [selection.actorIds, visibleActors]);
  const activeActor =
    visibleActors.find((actor) => actor.id === selection.activeActorId) ??
    selectedActors.at(-1) ??
    null;
  const activeActorIndex = activeActor
    ? Math.max(
        0,
        visibleActors.findIndex((actor) => actor.id === activeActor.id),
      )
    : 0;
  const activeActorColor = activeActor
    ? getActorColor(activeActorIndex)
    : '#431B1B';

  useEffect(() => {
    if (selection.hasOpenedInput) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [selection.hasOpenedInput]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [content]);

  const toggleActor = useCallback((actor: Actor) => {
    setSelection((currentSelection) => {
      const isSelected = currentSelection.actorIds.includes(actor.id);
      const nextActorIds = isSelected
        ? currentSelection.actorIds.filter((actorId) => actorId !== actor.id)
        : [...currentSelection.actorIds, actor.id];

      return {
        actorIds: nextActorIds,
        activeActorId: isSelected
          ? (nextActorIds.at(-1) ?? null)
          : actor.id,
        hasOpenedInput: true,
      };
    });
  }, []);

  const toggleActorByShortcut = useCallback((shortcut: string) => {
    const actor = visibleActors.find((item) => item.shortcut === shortcut);

    if (!actor) {
      return;
    }

    toggleActor(actor);
  }, [toggleActor, visibleActors]);

  const handleContentChange = (nextContent: string) => {
    const shortcutMatch = nextContent.match(/\/([1-6])$/);

    if (shortcutMatch) {
      toggleActorByShortcut(shortcutMatch[1]);
      onContentChange(nextContent.slice(0, -2));
      return;
    }

    onContentChange(nextContent);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isTyping || disabled || isSubmitting || !/^[1-6]$/.test(event.key)) {
        return;
      }

      event.preventDefault();
      toggleActorByShortcut(event.key);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, isSubmitting, toggleActorByShortcut]);

  const handleSubmit = async () => {
    if (
      disabled ||
      isSubmitting ||
      selectedActors.length === 0 ||
      !content.trim() ||
      userId === null
    ) {
      if (userId === null) {
        setErrorMessage('로그인 후 다시 시도해 주세요.');
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const createdFeedback = await createFeedbackV2(
        sessionId,
        {
          content: content.trim(),
          video_offset_seconds: anchor.videoOffsetSeconds,
          actor_ids: selectedActors.map((actor) => actor.id),
          script_page: anchor.page,
          script_x: anchor.x,
          script_y: anchor.y,
        },
        userId,
      );

      onCreated(createdFeedback);
      onCancel();
    } catch {
      setErrorMessage('피드백을 등록하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (actors.length === 0) {
    return (
      <div
        className="absolute z-40 w-52 -translate-x-1/2 rounded-[8px] border border-white/35 bg-[#efe6de]/95 px-4 py-3 text-center text-xs font-bold text-[#431B1B] shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
        style={{ left: anchor.left, top: anchor.top }}
      >
        등록된 배우가 없습니다.
      </div>
    );
  }

  return (
    <div
      className="pointer-events-auto absolute z-40"
      style={{ left: anchor.left, top: anchor.top }}
    >
      <button
        type="button"
        onClick={onCancel}
        className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-[#431B1B]/70"
        aria-label="피드백 입력 취소"
      />

      <div className="relative h-1 w-1">
        {visibleActors.map((actor, index, currentVisibleActors) => {
            const angle =
              -90 + (360 / Math.max(currentVisibleActors.length, 1)) * index;
            const radians = (angle * Math.PI) / 180;
            const x = Math.cos(radians) * RADIAL_DISTANCE;
            const y = Math.sin(radians) * RADIAL_DISTANCE;
            const color = getActorColor(index);
            const isHovered = hoveredActorId === actor.id;

            return (
              <button
                key={actor.id}
                type="button"
                onMouseEnter={() => setHoveredActorId(actor.id)}
                onMouseLeave={() => setHoveredActorId(null)}
                onClick={() => toggleActor(actor)}
                className="script-actor-orb absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-black text-white transition"
                style={{
                  left: x,
                  top: y,
                  backgroundColor: color,
                  boxShadow:
                    isHovered || selection.actorIds.includes(actor.id)
                      ? `0 0 0 8px ${color}38, 0 0 30px ${color}cc, 0 16px 34px rgba(0,0,0,0.24)`
                      : `0 10px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.35)`,
                  transform: selection.actorIds.includes(actor.id)
                    ? 'translate(-50%, -50%) scale(1.08)'
                    : undefined,
                  animationDelay: `${index * 36}ms`,
                }}
                aria-label={`${actor.name} 선택`}
                aria-pressed={selection.actorIds.includes(actor.id)}
                title={actor.name}
              >
                {actor.shortcut}
              </button>
            );
          })}
      </div>

      {selection.hasOpenedInput && (
        <div
          className="script-feedback-bubble absolute left-8 top-[-10px] min-w-[190px] max-w-[320px] rounded-[24px] px-5 py-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
          style={{ backgroundColor: activeActorColor }}
        >
          <p className="mb-1 text-sm font-black leading-none">
            {selectedActors.length > 0
              ? selectedActors.map((actor) => actor.name).join(', ')
              : '배우를 선택해 주세요'}
          </p>
          {URGENT_MARK_PATTERN.test(content) && (
            <span className="mb-1 inline-flex rounded-full border border-white/35 bg-white/18 px-2 py-0.5 text-[10px] font-black text-white">
              긴급
            </span>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => handleContentChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
                return;
              }

              if (event.shiftKey && event.key === 'Backspace') {
                event.preventDefault();
                setSelection((currentSelection) => {
                  const nextActorIds = currentSelection.actorIds.slice(0, -1);

                  return {
                    ...currentSelection,
                    actorIds: nextActorIds,
                    activeActorId: nextActorIds.at(-1) ?? null,
                  };
                });
              }
            }}
            disabled={disabled || isSubmitting}
            className="block max-h-[132px] min-h-[24px] w-full resize-none overflow-y-auto bg-transparent text-[15px] font-bold leading-snug text-white outline-none placeholder:text-white/68"
            placeholder={
              selectedActors.length > 0
                ? '피드백 입력'
                : '배우를 선택한 뒤 입력'
            }
            rows={1}
          />
          {errorMessage && (
            <p className="mt-2 text-[11px] font-bold text-white/82">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
