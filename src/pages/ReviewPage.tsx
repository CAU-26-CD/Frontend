import { Settings, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { filterFeedbacks } from '../apis/feedback';
import {
  getSessionVideo,
  getSessionVideoActorAppearances,
  getSessionVideoAppearances,
  type SessionVideoAppearance,
  type SessionVideoResponse,
} from '../apis/session';
import ReviewFeedbackPanel from '../components/review/ReviewFeedbackPanel';
import ReviewFilterBar, {
  type ReviewFeedbackTag,
  type ReviewPriorityTag,
} from '../components/review/ReviewFilterBar';
import ReviewVideoPanel from '../components/review/ReviewVideoPanel';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import type { Actor, Feedback, FeedbackPriority } from '../types/feedback';

const feedbackTags: ReviewFeedbackTag[] = [
  {
    id: 'acting',
    label: '연기',
    color: '#f6e4a8',
    values: [
      'acting:expression',
      'acting:emotion',
      'acting:tone',
      'acting:gaze',
      'acting:character',
      'acting:reaction',
    ],
  },
  {
    id: 'vocal',
    label: '보컬',
    color: '#f7b1bd',
    values: [
      'vocal:pitch',
      'vocal:rhythm',
      'vocal:diction',
      'vocal:breath',
      'vocal:lyrics',
      'vocal:expression_singing',
      'vocal:multitasking',
    ],
  },
  {
    id: 'blocking',
    label: '무대동작',
    color: '#f5e6a8',
    values: [
      'blocking:movement',
      'blocking:posture',
      'blocking:gesture',
      'blocking:entrance_exit',
      'blocking:footwork',
    ],
  },
  {
    id: 'script',
    label: '대사',
    color: '#f6d7df',
    values: ['script:mistake', 'script:omission', 'script:memorization'],
  },
  {
    id: 'chemistry',
    label: '페어합',
    color: '#c6d8a8',
    values: [
      'chemistry:eye_contact',
      'chemistry:timing_sync',
      'chemistry:emotional_bond',
    ],
  },
  {
    id: 'props',
    label: '소품',
    color: '#d7c4f2',
    values: ['props:handling', 'props:timing', 'props:detail'],
  },
  {
    id: 'technical',
    label: '기술',
    color: '#9cccf0',
    values: [
      'technical:audio_cue',
      'technical:lighting',
      'technical:staff_collab',
    ],
  },
  { id: 'meta', label: '기타', color: '#dfe4e8', values: ['meta:other'] },
];

const priorityTags: ReviewPriorityTag[] = [
  { id: 'required', label: '필수', color: '#ff6b6b' },
  { id: 'recommended', label: '권장', color: '#f6d76f' },
  { id: 'discussion', label: '논의', color: '#c9c1ba' },
  { id: 'praise', label: '칭찬', color: '#80c7f5' },
];

const feedbackPriorities: FeedbackPriority[] = [
  'required',
  'recommended',
  'discussion',
  'praise',
];

const secondsToTimestamp = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const timestampToSeconds = (value: string) => {
  const [minutes = '0', seconds = '0'] = value.split(':');

  return Number(minutes) * 60 + Number(seconds);
};

const inferActorIds = (content: string, actors: Actor[]) =>
  actors
    .filter((actor) => content.includes(actor.name))
    .map((actor) => actor.id);

const normalizeFeedbackPriorities = (priority: string[]) =>
  priority.filter((item): item is FeedbackPriority =>
    feedbackPriorities.includes(item as FeedbackPriority),
  );

export default function ReviewPage() {
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [sessionVideo, setSessionVideo] = useState<SessionVideoResponse | null>(
    null,
  );
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoMessage, setVideoMessage] = useState('');
  const [selectedFeedbackTags, setSelectedFeedbackTags] = useState<string[]>(
    [],
  );
  const [selectedPriorityTags, setSelectedPriorityTags] = useState<
    FeedbackPriority[]
  >([]);
  const [selectedActorIds, setSelectedActorIds] = useState<number[]>([]);
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<
    number | null
  >(null);
  const [actorOnlyPlaybackRequest, setActorOnlyPlaybackRequest] = useState(0);
  const [actorTimelineNavigationRequest, setActorTimelineNavigationRequest] =
    useState<{
      id: number;
      direction: 'previous' | 'next';
    }>({ id: 0, direction: 'next' });
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle = Number.isNaN(numericSessionId)
    ? 'Session'
    : `Session ${numericSessionId}`;
  const reviewActors = useMemo<Actor[]>(
    () =>
      sessionVideo?.actors.map((actor, index) => ({
        id: actor.actor_id,
        name: actor.name ?? `배우 ${actor.actor_id}`,
        shortcut: String(index + 1),
      })) ?? [],
    [sessionVideo],
  );
  const actorAppearances = useMemo<SessionVideoAppearance[]>(() => {
    if (!sessionVideo) {
      return [];
    }

    const actorAppearances = getSessionVideoActorAppearances(sessionVideo);

    return actorAppearances.length > 0
      ? actorAppearances
      : getSessionVideoAppearances(sessionVideo.analysis_result);
  }, [sessionVideo]);
  const actorIdsWithTimeline = useMemo(
    () => [
      ...new Set(actorAppearances.map((appearance) => appearance.actorId)),
    ],
    [actorAppearances],
  );

  useEffect(() => {
    if (Number.isNaN(numericSessionId)) return;

    let ignore = false;

    const loadSessionVideo = async () => {
      setIsLoadingVideo(true);
      setSessionVideo(null);

      try {
        const video = await getSessionVideo(numericSessionId, {
          refresh: true,
        });

        if (ignore) return;

        setSessionVideo(video);
        setVideoMessage(
          video.analysis_status === 'failed'
            ? '영상 분석에 실패했습니다'
            : video.s3_url
              ? ''
              : '영상이 아직 없습니다',
        );
      } catch (error) {
        if (!ignore) {
          setSessionVideo(null);
          setVideoMessage('영상이 아직 없습니다');
        }

        console.error('Failed to load session video', error);
      } finally {
        if (!ignore) {
          setIsLoadingVideo(false);
        }
      }
    };

    void loadSessionVideo();

    return () => {
      ignore = true;
    };
  }, [numericSessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let ignore = false;

    const loadFeedbacks = async () => {
      setIsLoadingFeedbacks(true);

      try {
        const selectedCategories = selectedFeedbackTags.flatMap(
          (tagId) =>
            feedbackTags.find((tag) => tag.id === tagId)?.values ?? [tagId],
        );
        const fetchedFeedbacks = await filterFeedbacks(sessionId, {
          categories: selectedCategories,
          priority: selectedPriorityTags,
          actorIds: selectedActorIds,
        });

        if (ignore) return;

        setFeedbacks(
          fetchedFeedbacks.map((feedback) => ({
            id: feedback.feedback_id,
            timestamp: secondsToTimestamp(feedback.video_offset_seconds),
            actorIds:
              feedback.actor_ids ?? inferActorIds(feedback.content, reviewActors),
            content: feedback.content,
            isUrgent: feedback.content.includes('!!!'),
            priority: normalizeFeedbackPriorities(feedback.priority ?? []),
            categories: feedback.categories ?? [],
          })),
        );
      } catch (error) {
        console.error('Failed to load review feedbacks', error);
      } finally {
        if (!ignore) {
          setIsLoadingFeedbacks(false);
        }
      }
    };

    void loadFeedbacks();

    return () => {
      ignore = true;
    };
  }, [
    reviewActors,
    selectedActorIds,
    selectedFeedbackTags,
    selectedPriorityTags,
    sessionId,
  ]);

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

  const togglePriorityTag = (priority: FeedbackPriority) => {
    setSelectedPriorityTags((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : [...current, priority],
    );
  };

  const requestSelectedActorPlayback = () => {
    setActorOnlyPlaybackRequest((current) => current + 1);
  };

  const requestSelectedActorTimelineMove = (direction: 'previous' | 'next') => {
    setActorTimelineNavigationRequest((current) => ({
      id: current.id + 1,
      direction,
    }));
  };
  const highlightFeedback = (feedbackId: number) => {
    setHighlightedFeedbackId(feedbackId);
  };

  const completedCount = useMemo(() => feedbacks.length, [feedbacks.length]);
  const requiredFeedbackMarkers = useMemo(
    () =>
      feedbacks
        .filter((feedback) => feedback.priority?.includes('required'))
        .map((feedback) => ({
          feedbackId: feedback.id,
          time: timestampToSeconds(feedback.timestamp),
        }))
        .filter((marker) => Number.isFinite(marker.time) && marker.time >= 0),
    [feedbacks],
  );

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
            <ReviewVideoPanel
              videoUrl={sessionVideo?.s3_url ?? ''}
              isLandscape={sessionVideo?.is_landscape ?? null}
              actors={reviewActors}
              appearances={actorAppearances}
              requiredFeedbackMarkers={requiredFeedbackMarkers}
              selectedActorIds={selectedActorIds}
              isVideoLoading={isLoadingVideo}
              videoMessage={videoMessage}
              actorOnlyPlaybackRequest={actorOnlyPlaybackRequest}
              actorTimelineNavigationRequest={actorTimelineNavigationRequest}
              highlightedFeedbackId={highlightedFeedbackId}
              onRequiredFeedbackMarkerClick={highlightFeedback}
            />
            <ReviewFilterBar
              feedbackTags={feedbackTags}
              priorityTags={priorityTags}
              actors={reviewActors}
              selectedFeedbackTags={selectedFeedbackTags}
              selectedPriorityTags={selectedPriorityTags}
              selectedActorIds={selectedActorIds}
              actorIdsWithTimeline={actorIdsWithTimeline}
              onFeedbackTagToggle={toggleFeedbackTag}
              onPriorityTagToggle={togglePriorityTag}
              onActorToggle={toggleActor}
              onSelectedActorPlayback={requestSelectedActorPlayback}
              onSelectedActorTimelineMove={requestSelectedActorTimelineMove}
            />
          </section>

          <ReviewFeedbackPanel
            feedbacks={feedbacks}
            actors={reviewActors}
            feedbackTags={feedbackTags}
            priorityTags={priorityTags}
            selectedFeedbackTags={selectedFeedbackTags}
            selectedPriorityTags={selectedPriorityTags}
            selectedActorIds={selectedActorIds}
            highlightedFeedbackId={highlightedFeedbackId}
            isLoading={isLoadingFeedbacks}
          />
        </div>

        <p className="reaction-ui-font sr-only">
          {completedCount}개의 피드백을 표시합니다
        </p>
      </div>
    </main>
  );
}
