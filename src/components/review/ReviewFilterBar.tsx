import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Actor, FeedbackPriority } from '../../types/feedback';

export type ReviewFeedbackTag = {
  id: string;
  label: string;
  color: string;
  values: string[];
};

export type ReviewPriorityTag = {
  id: FeedbackPriority;
  label: string;
  color: string;
};

type ReviewFilterBarProps = {
  feedbackTags: ReviewFeedbackTag[];
  priorityTags: ReviewPriorityTag[];
  actors: Actor[];
  selectedFeedbackTags: string[];
  selectedPriorityTags: FeedbackPriority[];
  selectedActorIds: number[];
  actorIdsWithTimeline?: number[];
  onFeedbackTagToggle: (tagId: string) => void;
  onPriorityTagToggle: (priority: FeedbackPriority) => void;
  onActorToggle: (actorId: number) => void;
  onSelectedActorPlayback?: () => void;
  onSelectedActorTimelineMove?: (direction: 'previous' | 'next') => void;
  layout?: 'horizontal' | 'vertical';
  scopeControl?: ReactNode;
};

type ActiveFilterMenu = 'actor' | 'feedback' | 'priority';

const filterMenus: {
  id: ActiveFilterMenu;
  label: string;
}[] = [
  { id: 'actor', label: 'Actor' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'priority', label: 'Priority' },
];

const getBalancedGridStyle = (itemCount: number): CSSProperties => {
  if (itemCount <= 0) {
    return { gridTemplateColumns: 'minmax(0, 1fr)' };
  }

  const rowCount = itemCount <= 3 ? 1 : itemCount <= 4 ? 2 : 3;
  const columnCount = Math.ceil(itemCount / rowCount);

  return {
    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
  };
};

const getBalancedRowCount = (itemCount: number) =>
  itemCount <= 3 ? 1 : itemCount <= 4 ? 2 : 3;

const getOptionRowsHeight = (rowCount: number) =>
  rowCount * 32 + Math.max(rowCount - 1, 0) * 6;

const getFilterPanelHeight = (
  activeMenu: ActiveFilterMenu | null,
  actorCount: number,
  feedbackCount: number,
  priorityCount: number,
) => {
  if (activeMenu === null) {
    return 0;
  }

  const panelVerticalPaddingAndBorder = 6;

  if (activeMenu === 'actor') {
    return panelVerticalPaddingAndBorder + getOptionRowsHeight(getBalancedRowCount(actorCount));
  }

  if (activeMenu === 'feedback') {
    const feedbackRowCount =
      Math.min(feedbackCount, 3) > 0 && Math.max(feedbackCount - 3, 0) > 0
        ? 2
        : 1;

    return panelVerticalPaddingAndBorder + getOptionRowsHeight(feedbackRowCount);
  }

  return panelVerticalPaddingAndBorder + getOptionRowsHeight(priorityCount > 0 ? 1 : 1);
};

export default function ReviewFilterBar({
  feedbackTags,
  priorityTags,
  actors,
  selectedFeedbackTags,
  selectedPriorityTags,
  selectedActorIds,
  actorIdsWithTimeline = [],
  onFeedbackTagToggle,
  onPriorityTagToggle,
  onActorToggle,
  onSelectedActorPlayback,
  onSelectedActorTimelineMove,
  layout = 'horizontal',
  scopeControl,
}: ReviewFilterBarProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<ActiveFilterMenu | null>(null);
  const selectedActors = useMemo(
    () => actors.filter((actor) => selectedActorIds.includes(actor.id)),
    [actors, selectedActorIds],
  );
  const selectedActorsWithTimeline = selectedActors.filter((actor) =>
    actorIdsWithTimeline.includes(actor.id),
  );
  const canPlaySelectedActors = selectedActorsWithTimeline.length > 0;
  const canShowSelectedActorPlayback =
    Boolean(onSelectedActorPlayback) && Boolean(onSelectedActorTimelineMove);
  const isVertical = layout === 'vertical';
  const topFeedbackTags = feedbackTags.slice(3, 7);
  const bottomFeedbackTags = feedbackTags.slice(0, 3);
  useEffect(() => {
    if (activeMenu === null) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        rootRef.current &&
        rootRef.current.contains(target)
      ) {
        return;
      }

      setActiveMenu(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [activeMenu]);

  const filterPanelHeight = getFilterPanelHeight(
    activeMenu,
    actors.length,
    feedbackTags.length,
    priorityTags.length,
  );

  const filterCounts: Record<ActiveFilterMenu, number> = {
    actor: selectedActorIds.length,
    feedback: selectedFeedbackTags.length,
    priority: selectedPriorityTags.length,
  };

  const renderActorOptions = () => (
    <div
      className="grid min-w-0 gap-1.5"
      style={getBalancedGridStyle(actors.length)}
    >
      {actors.length > 0 ? (
        actors.map((actor) => {
          const isSelected = selectedActorIds.includes(actor.id);

          return (
            <button
              key={actor.id}
              type="button"
              onClick={() => onActorToggle(actor.id)}
              className={[
                'h-8 min-w-0 cursor-pointer rounded-[6px] px-2.5 text-[11px] font-black transition hover:scale-[1.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                isSelected
                  ? 'bg-[#431B1B] text-[#fff8ef] shadow-[0_8px_16px_rgba(67,27,27,0.18)]'
                  : 'bg-white/56 text-[#431B1B]/70 hover:text-[#431B1B]',
              ].join(' ')}
            >
              <span className="block truncate">{actor.name}</span>
            </button>
          );
        })
      ) : (
        <span className="flex h-8 items-center text-[11px] font-bold text-[#431B1B]/38">
          배우 태그 없음
        </span>
      )}
    </div>
  );

  const renderFeedbackOptions = () => (
    <div className="grid min-w-0 gap-1.5">
      {[feedbackTags.slice(0, 3), feedbackTags.slice(3)].map((tagRow, index) =>
        tagRow.length > 0 ? (
          <div
            key={index}
            className={['grid gap-1.5', index === 0 ? 'grid-cols-3' : 'grid-cols-4'].join(
              ' ',
            )}
          >
            {tagRow.map((tag) => {
              const isSelected = selectedFeedbackTags.includes(tag.id);

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onFeedbackTagToggle(tag.id)}
                  className={[
                    'h-8 min-w-0 cursor-pointer rounded-[6px] px-2 text-[11px] font-black transition hover:scale-[1.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                    isSelected
                      ? 'brightness-[0.92] saturate-[1.35] text-[#431B1B] ring-2 ring-[#431B1B]/72 shadow-[inset_0_0_0_1px_rgba(67,27,27,0.22),0_8px_16px_rgba(67,27,27,0.16)]'
                      : 'text-[#431B1B]/72',
                  ].join(' ')}
                  style={{ backgroundColor: tag.color }}
                >
                  <span className="block truncate">{tag.label}</span>
                </button>
              );
            })}
          </div>
        ) : null,
      )}
    </div>
  );

  const renderPriorityOptions = () => (
    <div className="grid min-w-0 grid-cols-4 gap-1.5">
      {priorityTags.map((priority) => {
        const isSelected = selectedPriorityTags.includes(priority.id);

        return (
          <button
            key={priority.id}
            type="button"
            onClick={() => onPriorityTagToggle(priority.id)}
            className={[
              'h-8 min-w-0 cursor-pointer rounded-[6px] border px-2 text-[11px] font-black text-[#431B1B] transition hover:scale-[1.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
              isSelected
                ? 'border-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_16px_rgba(67,27,27,0.12)]'
                : 'bg-white/34 text-[#431B1B]/70 hover:bg-white/52',
            ].join(' ')}
            style={{
              backgroundColor: isSelected ? priority.color : undefined,
              borderColor: priority.color,
            }}
          >
            <span className="block truncate">{priority.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderActiveOptions = () => {
    if (activeMenu === 'actor') {
      return renderActorOptions();
    }

    if (activeMenu === 'feedback') {
      return renderFeedbackOptions();
    }

    if (activeMenu === 'priority') {
      return renderPriorityOptions();
    }

    return null;
  };

  const filterControl = (
    <div className="grid min-w-0 gap-1">
      <div
        className={[
          'overflow-hidden transition-[height,opacity,transform] duration-[220ms] ease-out',
          activeMenu
            ? 'opacity-100 translate-y-0'
            : 'pointer-events-none -translate-y-1 opacity-0',
        ].join(' ')}
        style={{ height: activeMenu ? filterPanelHeight : 0 }}
      >
        <div className="overflow-hidden">
          <div className="rounded-[9px] border border-[#431B1B]/10 bg-white/34 px-2.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.56)]">
            {renderActiveOptions()}
          </div>
        </div>
      </div>

      <div className="grid h-9 grid-cols-3 overflow-hidden rounded-[9px] border border-[#431B1B]/10 bg-white/30">
        {filterMenus.map((menu) => {
          const isActive = activeMenu === menu.id;

          return (
            <button
              key={menu.id}
              type="button"
              onClick={() =>
                setActiveMenu((currentMenu) =>
                  currentMenu === menu.id ? null : menu.id,
                )
              }
              className={[
                'relative flex min-w-0 cursor-pointer items-center justify-center gap-1 border-r border-[#431B1B]/10 px-2 text-[11px] font-black text-[#431B1B] transition last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#431B1B]/30',
                isActive
                  ? 'bg-[#431B1B] text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]'
                  : 'hover:bg-white/42',
              ].join(' ')}
              aria-expanded={isActive}
            >
              <span className="truncate">{menu.label}</span>
              {filterCounts[menu.id] > 0 && (
                <span
                  className={[
                    'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] leading-none',
                    isActive
                      ? 'bg-[#fff8ef]/20 text-[#fff8ef]'
                      : 'bg-[#431B1B]/10 text-[#431B1B]/58',
                  ].join(' ')}
                >
                  {filterCounts[menu.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isVertical) {
    return (
      <aside
        ref={rootRef}
        className="reaction-ui-font flex min-h-0 flex-col gap-1 overflow-visible rounded-[10px] border border-[#d3c3b7] bg-[#efe6de] p-2 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)]"
      >
        {scopeControl}
        {filterControl}
      </aside>
    );
  }

  return (
    <section
      className="relative z-20 flex min-h-[96px] overflow-hidden rounded-[10px] border border-[#d3c3b7] bg-[#efe6de] px-4 py-2.5 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)] sm:px-5"
    >
      <div
        className={[
          'grid w-full min-w-0 grid-cols-1 gap-2',
          canShowSelectedActorPlayback
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.44fr)]'
            : 'lg:grid-cols-[minmax(0,1fr)_112px]',
        ].join(' ')}
      >
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
          <div className="min-w-0 rounded-[8px] bg-white/28 px-2.5 py-1.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
              <span>Actor Tag</span>
              <span>{actors.length}</span>
            </div>

            <div className="reaction-hidden-scrollbar flex min-h-[62px] min-w-0 flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
              {actors.length > 0 ? (
                actors.map((actor) => {
                  const isSelected = selectedActorIds.includes(actor.id);

                  return (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => onActorToggle(actor.id)}
                      className={[
                        'h-6 flex-none cursor-pointer rounded-[5px] px-2.5 text-[11px] font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                        isSelected
                          ? 'bg-[#431B1B] text-[#fff8ef]'
                          : 'bg-white/45 text-[#431B1B]/72 hover:text-[#431B1B]',
                      ].join(' ')}
                    >
                      {actor.name}
                    </button>
                  );
                })
              ) : (
                <span className="flex h-6 items-center text-[11px] font-bold text-[#431B1B]/38">
                  배우 태그 없음
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[8px] bg-white/28 px-2.5 py-1.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
              <span>Feedback Tag</span>
              <span>{selectedFeedbackTags.length}</span>
            </div>

            <div className="grid min-w-0 gap-1">
              {[topFeedbackTags, bottomFeedbackTags].map((tagRow, rowIndex) => (
                <div
                  key={rowIndex}
                  className={[
                    'grid gap-1',
                    rowIndex === 0 ? 'grid-cols-4' : 'grid-cols-3',
                  ].join(' ')}
                >
                  {tagRow.map((tag) => {
                    const isSelected = selectedFeedbackTags.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => onFeedbackTagToggle(tag.id)}
                        className={[
                          'relative h-6 min-w-0 cursor-pointer rounded-[5px] px-1 text-[11px] font-bold transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                          isSelected
                            ? 'brightness-[0.92] saturate-[1.35] text-[#431B1B] ring-2 ring-[#431B1B]/76 shadow-[inset_0_0_0_1px_rgba(67,27,27,0.22),0_0_0_3px_rgba(67,27,27,0.12),0_8px_16px_rgba(67,27,27,0.16)]'
                            : 'text-[#431B1B]/70',
                        ].join(' ')}
                        style={{ backgroundColor: tag.color }}
                      >
                        <span
                          className={[
                            'block truncate',
                            isSelected ? 'font-black' : '',
                          ].join(' ')}
                        >
                          {tag.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className={[
            'min-w-0 border-t border-[#431B1B]/12 pt-2 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0',
            canShowSelectedActorPlayback
              ? 'grid grid-cols-1 gap-2 lg:grid-cols-[112px_1px_minmax(0,1fr)]'
              : '',
          ].join(' ')}
        >
          <div className="min-w-0 rounded-[8px] bg-white/28 px-2 py-1.5">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
              Priority
            </p>
            <div className="grid grid-cols-2 gap-1">
              {priorityTags.map((priority) => {
                const isSelected = selectedPriorityTags.includes(priority.id);

                return (
                  <button
                    key={priority.id}
                    type="button"
                    onClick={() => onPriorityTagToggle(priority.id)}
                    className={[
                      'relative h-6 cursor-pointer rounded-[5px] border px-1.5 text-[11px] font-bold text-[#431B1B] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                      isSelected
                        ? 'border-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_16px_rgba(67,27,27,0.12)]'
                        : 'bg-white/28 text-[#431B1B]/70 hover:bg-white/45',
                    ].join(' ')}
                    style={{
                      backgroundColor: isSelected ? priority.color : undefined,
                      borderColor: priority.color,
                    }}
                  >
                    <span className="block truncate">{priority.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {canShowSelectedActorPlayback && (
            <>
              <span className="hidden h-full w-px bg-[#431B1B]/12 lg:block" />

              <div className="grid min-w-0 content-center gap-1.5">
                <div className="min-w-0 rounded-[8px] bg-white/28 px-2.5 py-1.5">
                  <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/52">
                    <span>Selected Actor</span>
                    <span>{selectedActors.length}</span>
                  </div>

                  <div className="reaction-hidden-scrollbar flex min-h-7 min-w-0 items-center gap-1.5 overflow-x-auto">
                    {selectedActors.length > 0 ? (
                      selectedActors.map((actor) => (
                        <button
                          key={actor.id}
                          type="button"
                          onClick={() => onActorToggle(actor.id)}
                          className="h-7 flex-none cursor-pointer rounded-[5px] bg-[#431B1B] px-2.5 text-[11px] font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30"
                        >
                          {actor.name}
                        </button>
                      ))
                    ) : (
                      <span className="text-[11px] font-bold text-[#431B1B]/38">
                        선택된 배우 없음
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectedActorTimelineMove?.('previous')}
                    disabled={!canPlaySelectedActors}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[5px] bg-[#431B1B]/12 text-[#431B1B] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                    aria-label="이전 등장 구간으로 이동"
                    title="이전 등장 구간"
                  >
                    <ChevronLeft size={15} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={onSelectedActorPlayback}
                    disabled={!canPlaySelectedActors}
                    className="flex h-7 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[5px] bg-[#431B1B] px-2.5 text-[11px] font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                  >
                    <Play size={12} fill="#fff8ef" strokeWidth={2.8} />
                    <span className="truncate">선택 배우 재생</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectedActorTimelineMove?.('next')}
                    disabled={!canPlaySelectedActors}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[5px] bg-[#431B1B]/12 text-[#431B1B] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                    aria-label="다음 등장 구간으로 이동"
                    title="다음 등장 구간"
                  >
                    <ChevronRight size={15} strokeWidth={3} />
                  </button>
                </div>

                {selectedActors.length > 0 && !canPlaySelectedActors && (
                  <p className="text-[10px] font-bold text-[#A94444]/72">
                    선택한 배우의 등장 구간이 없습니다.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
