import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createFeedbackV2 } from '../../apis/feedback';
import type { FeedbackV2Response } from '../../apis/feedback';
import type { Actor } from '../../types/feedback';
import { getScriptActorColor } from '../../utils/scriptFeedbackStyle';

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
  isClosing?: boolean;
  focusRequestVersion?: number;
  onContentChange: (content: string) => void;
  onPendingCreate?: (feedback: {
    actorIds: number[];
    actorNames: string[];
    content: string;
    scriptPage: number;
    scriptX: number;
    scriptY: number;
    videoOffsetSeconds: number;
  }) => number;
  onPendingRemove?: (feedbackId: number) => void;
  onCreated: (feedback: FeedbackV2Response, pendingFeedbackId?: number) => void;
  onCancel: () => void;
};

const MIN_RADIAL_DISTANCE = 24;
const RADIAL_DISTANCE_STEP = 6;
const MAX_RADIAL_DISTANCE = 42;
const ACTOR_ORB_SIZE = 31;
const URGENT_MARK_PATTERN = /!{3,}/;
const ACTOR_ORB_BASE = '#FFF8EFE6';
const FEEDBACK_BUBBLE_BASE = 'rgba(255, 248, 239, 0.28)';

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
  isClosing = false,
  focusRequestVersion = 0,
  onContentChange,
  onPendingCreate,
  onPendingRemove,
  onCreated,
  onCancel,
}: ScriptFeedbackComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<ActorSelectionState>({
    actorIds: [],
    activeActorId: null,
    hasOpenedInput: false,
  });
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
  const actorOrbPositions = useMemo(() => {
    const radialDistance = Math.min(
      MAX_RADIAL_DISTANCE,
      MIN_RADIAL_DISTANCE +
        Math.max(0, visibleActors.length - 3) * RADIAL_DISTANCE_STEP,
    );

    return visibleActors.map((actor, index, currentVisibleActors) => {
      const angle =
        -90 + (360 / Math.max(currentVisibleActors.length, 1)) * index;
      const radians = (angle * Math.PI) / 180;

      return {
        actor,
        color: getScriptActorColor(index),
        left: Math.cos(radians) * radialDistance,
        top: Math.sin(radians) * radialDistance,
      };
    });
  }, [visibleActors]);
  const activeActorColor = activeActor
    ? getScriptActorColor(activeActorIndex)
    : '#431B1B';
  const activeActorPosition =
    actorOrbPositions.find((position) => position.actor.id === activeActor?.id) ??
    null;
  const shouldOpenBubbleToLeft = (activeActorPosition?.left ?? 0) < 0;
  const bubbleLeft =
    (activeActorPosition?.left ?? 0) +
    (shouldOpenBubbleToLeft ? -ACTOR_ORB_SIZE / 2 - 14 : ACTOR_ORB_SIZE / 2 + 14);
  const bubbleTop = (activeActorPosition?.top ?? 0) - 10;

  useEffect(() => {
    if (selection.hasOpenedInput) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [selection.hasOpenedInput]);

  useEffect(() => {
    if (!selection.hasOpenedInput || isClosing) {
      return;
    }

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [focusRequestVersion, isClosing, selection.hasOpenedInput]);

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

    const feedbackContent = content.trim();
    const selectedActorIds = selectedActors.map((actor) => actor.id);
    const selectedActorNames = selectedActors.map((actor) => actor.name);
    const pendingFeedbackId = onPendingCreate?.({
      actorIds: selectedActorIds,
      actorNames: selectedActorNames,
      content: feedbackContent,
      scriptPage: anchor.page,
      scriptX: anchor.x,
      scriptY: anchor.y,
      videoOffsetSeconds: anchor.videoOffsetSeconds,
    });

    onCancel();

    try {
      const createdFeedback = await createFeedbackV2(
        sessionId,
        {
          content: feedbackContent,
          video_offset_seconds: anchor.videoOffsetSeconds,
          actor_ids: selectedActorIds,
          script_page: anchor.page,
          script_x: anchor.x,
          script_y: anchor.y,
        },
        userId,
      );

      onCreated(createdFeedback, pendingFeedbackId);
    } catch {
      if (pendingFeedbackId !== undefined) {
        onPendingRemove?.(pendingFeedbackId);
      }
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
      data-script-feedback-composer="true"
      className={[
        'script-feedback-composer absolute z-40',
        isClosing
          ? 'script-feedback-composer-out pointer-events-none'
          : 'pointer-events-auto',
      ].join(' ')}
      style={{
        left: anchor.left,
        top: anchor.top,
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#431B1B]/70"
        aria-label="피드백 입력 취소"
      />

      <div className="relative h-0 w-0">
        {actorOrbPositions.map(({ actor, color, left, top }, index) => {
            const isSelected = selection.actorIds.includes(actor.id);

            return (
              <button
                key={actor.id}
                type="button"
                onClick={() => toggleActor(actor)}
                className={[
                  'script-actor-orb absolute flex h-[31px] w-[31px] items-center justify-center rounded-full border-2 text-xs font-black',
                  isSelected ? 'script-actor-orb-selected' : '',
                ].join(' ')}
                style={{
                  left,
                  top,
                  backgroundColor: isSelected ? color : ACTOR_ORB_BASE,
                  borderColor: color,
                  color: isSelected ? '#fff8ef' : color,
                  '--script-actor-color': color,
                  '--script-actor-glow': `${color}8c`,
                  '--script-actor-glow-strong': `${color}d9`,
                  '--script-actor-glow-soft': `${color}80`,
                  transform: isSelected
                    ? 'translate(-50%, -50%) scale(1.08)'
                    : undefined,
                  animationDelay: `${index * 36}ms`,
                } as CSSProperties}
                aria-label={`${actor.name} 선택`}
                aria-pressed={isSelected}
                title={actor.name}
              >
                {actor.shortcut}
              </button>
            );
          })}
      </div>

      {selection.hasOpenedInput && (
        <div
          className={[
            'script-feedback-bubble absolute min-w-[190px] max-w-[320px] rounded-[22px] px-5 py-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.22)]',
            'border',
            shouldOpenBubbleToLeft
              ? 'script-feedback-bubble-left right-auto rounded-br-[8px]'
              : 'rounded-bl-[8px]',
          ].join(' ')}
          style={{
            backgroundColor: FEEDBACK_BUBBLE_BASE,
            borderColor: activeActorColor,
            left: bubbleLeft,
            top: bubbleTop,
          }}
        >
          <span
            className={[
              'absolute top-5 h-5 w-5 rotate-45 rounded-[4px]',
              shouldOpenBubbleToLeft ? 'right-[-9px]' : 'left-[-9px]',
            ].join(' ')}
            style={{ backgroundColor: FEEDBACK_BUBBLE_BASE }}
            aria-hidden="true"
          />
          <p className="mb-1 text-sm font-black leading-none text-[#2d1715]">
            {selectedActors.length > 0
              ? selectedActors.map((actor) => actor.name).join(', ')
              : '배우를 선택해 주세요'}
          </p>
          {URGENT_MARK_PATTERN.test(content) && (
            <span className="mb-1 inline-flex rounded-full border border-[#D15757]/30 bg-[#D15757]/14 px-2 py-0.5 text-[10px] font-black text-[#9b3030]">
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
            className="block max-h-[132px] min-h-[24px] w-full resize-none overflow-y-auto bg-transparent text-[15px] font-bold leading-snug text-[#2d1715] outline-none placeholder:text-[#2d1715]/58"
            placeholder={
              selectedActors.length > 0
                ? '피드백 입력'
                : '배우를 선택한 뒤 입력'
            }
            rows={1}
          />
          {errorMessage && (
            <p className="mt-2 text-[11px] font-bold text-[#9b3030]">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
