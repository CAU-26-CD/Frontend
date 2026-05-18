import { Settings, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFeedbacks } from '../apis/feedback';
import ReviewFeedbackPanel from '../components/review/ReviewFeedbackPanel';
import ReviewFilterBar, {
  type ReviewFeedbackTag,
} from '../components/review/ReviewFilterBar';
import ReviewVideoPanel from '../components/review/ReviewVideoPanel';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import { actors } from '../data/actors';
import type { Feedback } from '../types/feedback';

const feedbackTags: ReviewFeedbackTag[] = [
  { id: 'line', label: '대사', color: '#f7b1bd' },
  { id: 'timing', label: '타이밍', color: '#f5a8b5' },
  { id: 'acting', label: '연기', color: '#f6e4a8' },
  { id: 'emotion', label: '감정', color: '#f7e7a7' },
  { id: 'suggestion', label: '제안', color: '#9cccf0' },
  { id: 'management', label: '관리', color: '#dfe4e8' },
  { id: 'movement', label: '동선', color: '#f5e6a8' },
];

const secondsToTimestamp = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const inferActorIds = (content: string) =>
  actors
    .filter((actor) => content.includes(actor.name))
    .map((actor) => actor.id);

export default function ReviewPage() {
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedFeedbackTags, setSelectedFeedbackTags] = useState<string[]>(
    [],
  );
  const [selectedActorIds, setSelectedActorIds] = useState<number[]>([]);
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle = Number.isNaN(numericSessionId)
    ? 'Session'
    : `Session ${numericSessionId}`;

  useEffect(() => {
    if (!sessionId) return;

    let ignore = false;

    const loadFeedbacks = async () => {
      try {
        const fetchedFeedbacks = await getFeedbacks(sessionId);

        if (ignore) return;

        setFeedbacks(
          fetchedFeedbacks.map((feedback) => ({
            id: feedback.feedback_id,
            timestamp: secondsToTimestamp(feedback.video_offset_seconds),
            actorIds: inferActorIds(feedback.content),
            content: feedback.content,
            isUrgent: feedback.content.includes('!!!'),
          })),
        );
      } catch (error) {
        console.error('Failed to load review feedbacks', error);
      }
    };

    void loadFeedbacks();

    return () => {
      ignore = true;
    };
  }, [sessionId]);

  const toggleFeedbackTag = (tagId: string) => {
    setSelectedFeedbackTags((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId],
    );
  };

  const toggleActor = (actorId: number) => {
    setSelectedActorIds((current) =>
      current.includes(actorId)
        ? current.filter((item) => item !== actorId)
        : [...current, actorId],
    );
  };

  const completedCount = useMemo(() => feedbacks.length, [feedbacks.length]);

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader align="left" />
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-[1320px] flex-col overflow-hidden px-4 pb-7 pt-24 sm:px-6 lg:px-12">
        <div className="reaction-ui-font mb-2 flex shrink-0 items-center justify-between gap-4 text-sm font-semibold text-[#eee7dc]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">
              My Projects / {projectTitle} / {sessionTitle}
            </span>
            <Video
              size={20}
              fill="#D15757"
              stroke="#D15757"
              strokeWidth={2.4}
              className="shrink-0"
              aria-hidden="true"
            />
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#eee7dc] transition hover:bg-white/12 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="설정"
          >
            <Settings size={17} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,0.82fr)] items-stretch gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.72fr)] lg:grid-rows-1">
          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(112px,0.18fr)] gap-4">
            <ReviewVideoPanel sessionId={numericSessionId} />
            <ReviewFilterBar
              feedbackTags={feedbackTags}
              actors={actors}
              selectedFeedbackTags={selectedFeedbackTags}
              selectedActorIds={selectedActorIds}
              onFeedbackTagToggle={toggleFeedbackTag}
              onActorToggle={toggleActor}
            />
          </section>

          <ReviewFeedbackPanel
            feedbacks={feedbacks}
            actors={actors}
            feedbackTags={feedbackTags}
            selectedFeedbackTags={selectedFeedbackTags}
            selectedActorIds={selectedActorIds}
          />
        </div>

        <p className="reaction-ui-font sr-only">
          {completedCount}개의 피드백을 표시합니다
        </p>
      </div>
    </main>
  );
}
