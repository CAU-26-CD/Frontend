import { ArrowUp } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import type { Actor, Feedback } from '../../types/feedback';
import type { ReviewFeedbackTag } from './ReviewFilterBar';

type ReviewFeedbackPanelProps = {
  feedbacks: Feedback[];
  actors: Actor[];
  feedbackTags: ReviewFeedbackTag[];
  selectedFeedbackTags: string[];
  selectedActorIds: number[];
  isLoading?: boolean;
};

const getFeedbackTagIds = (feedback: Feedback) => {
  const content = feedback.content;
  const tags: string[] = [];

  if (content.includes('[동선]')) tags.push('movement');
  if (content.includes('감정')) tags.push('emotion');
  if (content.includes('타이밍')) tags.push('timing');
  if (content.includes('대사')) tags.push('line');
  if (content.includes('제안')) tags.push('suggestion');
  if (content.includes('관리')) tags.push('management');
  if (tags.length === 0) tags.push('acting');

  return tags;
};

export default function ReviewFeedbackPanel({
  feedbacks,
  actors,
  feedbackTags,
  selectedFeedbackTags,
  selectedActorIds,
  isLoading = false,
}: ReviewFeedbackPanelProps) {
  const visibleFeedbacks = feedbacks.filter((feedback) => {
    const feedbackTagIds = getFeedbackTagIds(feedback);
    const matchesFeedbackTag =
      selectedFeedbackTags.length === 0 ||
      selectedFeedbackTags.some((tagId) => feedbackTagIds.includes(tagId));
    const matchesActor =
      selectedActorIds.length === 0 ||
      selectedActorIds.some((actorId) => feedback.actorIds.includes(actorId));

    return matchesFeedbackTag && matchesActor;
  });

  const selectedActorNames = selectedActorIds
    .map((actorId) => actors.find((actor) => actor.id === actorId)?.name)
    .filter(Boolean);
  const selectedFeedbackTagLabels = selectedFeedbackTags
    .map((tagId) => feedbackTags.find((tag) => tag.id === tagId)?.label)
    .filter(Boolean);
  const selectedLabels = [...selectedFeedbackTagLabels, ...selectedActorNames];

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
            const tagIds = getFeedbackTagIds(feedback);
            const primaryTag = feedbackTags.find((tag) =>
              tagIds.includes(tag.id),
            );
            const feedbackActorNames = feedback.actorIds
              .map((actorId) => actors.find((actor) => actor.id === actorId)?.name)
              .filter(Boolean)
              .join(', ');

            return (
              <article
                key={feedback.id}
                className="grid grid-cols-[58px_minmax(0,1fr)] gap-2 text-xs font-semibold leading-relaxed"
              >
                <span className="text-[#fff8ef]">{feedback.timestamp}</span>
                <p className="min-w-0 truncate">
                  {feedbackActorNames && (
                    <span className="mr-1 text-[#fff8ef]/86">
                      | {feedbackActorNames}
                    </span>
                  )}
                  {primaryTag && (
                    <span
                      className="mr-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold text-[#431B1B]"
                      style={{ backgroundColor: primaryTag.color }}
                    >
                      {primaryTag.label}
                    </span>
                  )}
                  <span className="text-[#eee7dc]/86">{feedback.content}</span>
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

      <div className="flex min-h-[36px] items-center justify-between gap-3 rounded-[10px] bg-[#efe6de] px-4 text-xs font-bold text-[#431B1B] shadow-[0_14px_32px_rgba(0,0,0,0.18)]">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {selectedLabels.length > 0 ? (
            selectedLabels.map((label) => (
              <span
                key={label}
                className="rounded-[5px] bg-[#431B1B]/10 px-2 py-1 text-[11px]"
              >
                {label}
              </span>
            ))
          ) : (
            <span className="text-[#431B1B]/45">선택된 필터 없음</span>
          )}
        </div>
        <ArrowUp size={17} strokeWidth={3} className="shrink-0" />
      </div>
    </aside>
  );
}
