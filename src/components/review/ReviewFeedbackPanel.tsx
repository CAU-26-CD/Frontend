import { ArrowUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import type { Actor, Feedback, FeedbackPriority } from '../../types/feedback';
import type { ReviewFeedbackTag, ReviewPriorityTag } from './ReviewFilterBar';

type ReviewFeedbackPanelProps = {
  feedbacks: Feedback[];
  actors: Actor[];
  feedbackTags: ReviewFeedbackTag[];
  priorityTags: ReviewPriorityTag[];
  selectedFeedbackTags: string[];
  selectedPriorityTags: FeedbackPriority[];
  selectedActorIds: number[];
  highlightedFeedbackId?: number | null;
  isLoading?: boolean;
};

const priorityColorById: Record<FeedbackPriority, string> = {
  required: '#ff6b6b',
  recommended: '#f6d76f',
  discussion: '#c9c1ba',
  praise: '#80c7f5',
};

const priorityOrder: FeedbackPriority[] = [
  'required',
  'recommended',
  'discussion',
  'praise',
];

const getPrimaryPriority = (feedback: Feedback) =>
  priorityOrder.find((priority) => feedback.priority?.includes(priority));

const categoryLabelByValue: Record<string, string> = {
  'acting:expression': '표정',
  'acting:emotion': '감정선',
  'acting:tone': '대사 톤',
  'acting:gaze': '시선',
  'acting:character': '캐릭터',
  'acting:reaction': '리액션',
  'vocal:pitch': '음정',
  'vocal:rhythm': '박자',
  'vocal:diction': '발음',
  'vocal:breath': '호흡',
  'vocal:lyrics': '가사',
  'vocal:expression_singing': '노래 표현',
  'vocal:multitasking': '노래+동작',
  'blocking:movement': '동선',
  'blocking:posture': '자세',
  'blocking:gesture': '제스처',
  'blocking:entrance_exit': '입퇴장',
  'blocking:footwork': '걸음',
  'props:handling': '소품 핸들링',
  'props:timing': '소품 타이밍',
  'props:detail': '소품 디테일',
  'script:mistake': '대사 실수',
  'script:omission': '대사 누락',
  'script:memorization': '암기',
  'chemistry:eye_contact': '시선 교환',
  'chemistry:timing_sync': '합',
  'chemistry:emotional_bond': '케미',
  'technical:audio_cue': '음향',
  'technical:lighting': '조명',
  'technical:staff_collab': '스태프 협업',
  'meta:other': '기타',
};

export default function ReviewFeedbackPanel({
  feedbacks,
  actors,
  feedbackTags,
  priorityTags,
  selectedFeedbackTags,
  selectedPriorityTags,
  selectedActorIds,
  highlightedFeedbackId = null,
  isLoading = false,
}: ReviewFeedbackPanelProps) {
  const feedbackRefs = useRef(new Map<number, HTMLElement>());
  const visibleFeedbacks = feedbacks.filter((feedback) => {
    const matchesActor =
      selectedActorIds.length === 0 ||
      selectedActorIds.some((actorId) => feedback.actorIds.includes(actorId));

    return matchesActor;
  });

  const selectedActorNames = selectedActorIds
    .map((actorId) => actors.find((actor) => actor.id === actorId)?.name)
    .filter((name): name is string => Boolean(name));
  const selectedFeedbackChips = [
    ...selectedFeedbackTags.map((tagId) => {
      const tag = feedbackTags.find((feedbackTag) => feedbackTag.id === tagId);

      return tag
        ? {
            id: `feedback-${tag.id}`,
            label: tag.label,
            color: tag.color,
          }
        : null;
    }),
    ...selectedPriorityTags.map((priority) => {
      const tag = priorityTags.find(
        (priorityTag) => priorityTag.id === priority,
      );

      return tag
        ? {
            id: `priority-${tag.id}`,
            label: tag.label,
            color: tag.color,
          }
        : null;
    }),
  ].filter(
    (chip): chip is { id: string; label: string; color: string } =>
      chip !== null,
  );

  useEffect(() => {
    if (highlightedFeedbackId === null) {
      return;
    }

    feedbackRefs.current.get(highlightedFeedbackId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightedFeedbackId]);

  return (
    <aside className="reaction-ui-font flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-transparent px-1 py-0 text-[#2d1715]">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[10px] border-2 border-stone-200/50 bg-transparent p-3">
        <div className="reaction-hidden-scrollbar flex h-full flex-col gap-2 overflow-y-auto pr-3 text-[#eee7dc]">
          {isLoading ? (
            <LoadingSpinner
              label="피드백을 불러오는 중입니다"
              className="h-full"
            />
          ) : (
            visibleFeedbacks.map((feedback) => {
              const feedbackCategories = feedback.categories ?? [];
              const primaryTag = feedbackTags.find((tag) =>
                feedbackCategories.some(
                  (category) =>
                    category === tag.id || tag.values.includes(category),
                ),
              );
              const primaryCategory = feedbackCategories[0];
              const primaryPriority = getPrimaryPriority(feedback);
              const isHighlighted = feedback.id === highlightedFeedbackId;
              const feedbackActorNames = feedback.actorIds
                .map(
                  (actorId) =>
                    actors.find((actor) => actor.id === actorId)?.name,
                )
                .filter(Boolean)
                .join(', ');

              return (
                <article
                  key={feedback.id}
                  ref={(node) => {
                    if (node) {
                      feedbackRefs.current.set(feedback.id, node);
                    } else {
                      feedbackRefs.current.delete(feedback.id);
                    }
                  }}
                  className={[
                    'grid grid-cols-[58px_minmax(0,1fr)] items-start gap-2 rounded-[7px] px-2 py-1 text-xs font-semibold leading-relaxed transition',
                    isHighlighted
                      ? 'bg-[#fff8ef]/58 text-[#2d1715] ring-2 ring-white/88 shadow-[0_0_18px_rgba(255,255,255,0.3)]'
                      : 'ring-2 ring-transparent',
                  ].join(' ')}
                >
                  <span
                    className="font-bold"
                    style={{
                      color: isHighlighted
                        ? '#431B1B'
                        : primaryPriority
                          ? priorityColorById[primaryPriority]
                          : '#fff8ef',
                    }}
                  >
                    {feedback.timestamp}
                  </span>
                  <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {feedbackActorNames && (
                      <span
                        className={[
                          'mr-1',
                          isHighlighted
                            ? 'text-[#431B1B]/78'
                            : 'text-[#fff8ef]/86',
                        ].join(' ')}
                      >
                        | {feedbackActorNames}
                      </span>
                    )}
                    {primaryTag && (
                      <span
                        className="mr-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold text-[#431B1B]"
                        style={{ backgroundColor: primaryTag.color }}
                      >
                        {categoryLabelByValue[primaryCategory] ??
                          primaryTag.label}
                      </span>
                    )}
                    <span
                      className={
                        isHighlighted ? 'text-[#2d1715]' : 'text-[#eee7dc]/86'
                      }
                    >
                      {feedback.content}
                    </span>
                  </p>
                </article>
              );
            })
          )}

          {!isLoading && visibleFeedbacks.length === 0 && (
            <div className="flex h-full items-center justify-center text-xs font-semibold text-[#eee7dc]/54">
              선택한 필터에 해당하는 피드백이 없습니다
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-[74px] items-center justify-between gap-3 rounded-[10px] bg-[#efe6de] px-3 py-2 text-xs font-bold text-[#431B1B] shadow-[0_14px_32px_rgba(0,0,0,0.18)]">
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)] items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/50">
              Actor
            </span>
            <div className="reaction-hidden-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
              {selectedActorNames.length > 0 ? (
                selectedActorNames.map((label) => (
                  <span
                    key={label}
                    className="flex h-6 flex-none items-center rounded-[5px] bg-[#431B1B] px-2 text-[11px] font-bold text-[#fff8ef]"
                  >
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-[11px] font-bold text-[#431B1B]/38">
                  전체 배우
                </span>
              )}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)] items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.04em] text-[#431B1B]/50">
              Feedback
            </span>
            <div className="reaction-hidden-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
              {selectedFeedbackChips.length > 0 ? (
                selectedFeedbackChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="flex h-6 flex-none items-center rounded-[5px] px-2 text-[11px] font-bold text-[#431B1B]"
                    style={{ backgroundColor: chip.color }}
                  >
                    {chip.label}
                  </span>
                ))
              ) : (
                <span className="text-[11px] font-bold text-[#431B1B]/38">
                  전체 피드백
                </span>
              )}
            </div>
          </div>
        </div>
        <ArrowUp size={17} strokeWidth={3} className="shrink-0" />
      </div>
    </aside>
  );
}
