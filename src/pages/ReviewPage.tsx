import { BookOpen, MessageCircle, RotateCcw, Settings, Video } from 'lucide-react';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { listProjectActors } from '../apis/actor';
import {
  filterFeedbacks,
  getFeedbackTags,
  getFeedbacksV2,
  getProjectScriptFeedbacks,
  type FeedbackV2Response,
  type FeedbackTagsResponse,
} from '../apis/feedback';
import {
  getProjectScript,
  isScriptNotFoundError,
  type ProjectScript,
} from '../apis/script';
import {
  getSessionVideo,
  getSessionVideoActorAppearances,
  getSessionVideoActorsAppearances,
  getSessionVideoAppearances,
  parseSessionVideoAppearances,
  type SessionVideoAppearance,
  type SessionVideoAppearancesResponse,
  type SessionVideoResponse,
} from '../apis/session';
import ReviewFeedbackPanel from '../components/review/ReviewFeedbackPanel';
import ReviewFilterBar, {
  type ReviewFeedbackTag,
  type ReviewPriorityTag,
} from '../components/review/ReviewFilterBar';
import ScriptReviewPdfViewer from '../components/review/ScriptReviewPdfViewer';
import ReviewVideoPanel from '../components/review/ReviewVideoPanel';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useProjectBreadcrumb } from '../hooks/useProjectBreadcrumb';
import type { Actor, Feedback, FeedbackPriority } from '../types/feedback';
import {
  getFeedbackActorNames,
  getFeedbackPriorityColor,
  getFeedbackPriorityTextColor,
} from '../utils/scriptFeedbackStyle';

const feedbackTags: ReviewFeedbackTag[] = [
  {
    id: 'sync',
    label: '페어합',
    color: '#c6d8a8',
    values: [
      'sync:eye_contact',
      'sync:timing_sync',
      'sync:emotional_bond',
      'sync:audio_cue',
      'sync:lighting',
    ],
  },
  {
    id: 'gesture',
    label: '제스처',
    color: '#d7c4f2',
    values: [
      'gesture:gesture',
      'gesture:posture',
      'gesture:footwork',
      'gesture:props',
      'blocking:gesture',
      'blocking:posture',
      'blocking:footwork',
      'props:handling',
      'props:timing',
      'props:detail',
    ],
  },
  {
    id: 'movement',
    label: '동선',
    color: '#f5e6a8',
    values: ['movement:path', 'movement:entrance_exit'],
  },
  {
    id: 'vocal',
    label: '소리',
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
      'acting:improvisation',
    ],
  },
  {
    id: 'text',
    label: '암기',
    color: '#f6d7df',
    values: ['text:mistake', 'text:omission', 'text:lyrics', 'text:memorization'],
  },
  {
    id: 'meta',
    label: '기타',
    color: '#dfe4e8',
    values: [
      'meta:schedule',
      'meta:homework',
      'meta:condition',
      'meta:header',
      'meta:unclear',
      'meta:other',
    ],
  },
];

const priorityTags: ReviewPriorityTag[] = [
  { id: 'required', label: '필수', color: '#ff6b6b' },
  { id: 'recommended', label: '권장', color: '#f6d76f' },
  { id: 'discussion', label: '논의', color: '#c9c1ba' },
  { id: 'praise', label: '칭찬', color: '#80c7f5' },
];

type ReviewRouteActor = Partial<Actor> & {
  actor_id?: unknown;
};

type ReviewRouteState = {
  projectSessionTitle?: string;
  reviewActors?: ReviewRouteActor[];
};

type ScriptReviewStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'error';
type ScriptFeedbackScope = 'session' | 'project';
type ScriptFeedbackWithTags = FeedbackV2Response & FeedbackTagsResponse;

const feedbackPriorities: FeedbackPriority[] = [
  'required',
  'recommended',
  'discussion',
  'praise',
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

const getTaggedScriptFeedbackFallback = (
  feedback: FeedbackV2Response,
): ScriptFeedbackWithTags => {
  const optionalTags = feedback as FeedbackV2Response &
    Partial<FeedbackTagsResponse>;

  return {
    ...feedback,
    priority: normalizeFeedbackPriorities(optionalTags.priority ?? []),
    categories: optionalTags.categories ?? [],
  };
};

const toFiniteActorId = (value: unknown) => {
  const actorId = Number(value);

  return Number.isFinite(actorId) ? actorId : null;
};

const parseDateTimestamp = (value: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : timestamp;
};

const getVideoZeroOffsetSeconds = (video: SessionVideoResponse | null) => {
  const trimOffsetSeconds = Number(video?.trim_offset_seconds);

  if (Number.isFinite(trimOffsetSeconds)) {
    return trimOffsetSeconds;
  }

  const recordingStartedAt = parseDateTimestamp(
    video?.recording_started_at ?? null,
  );
  const videoZeroAt = parseDateTimestamp(video?.video_zero_at ?? null);

  if (recordingStartedAt === null || videoZeroAt === null) {
    return 0;
  }

  return Math.max(0, (videoZeroAt - recordingStartedAt) / 1000);
};

const hasScriptFeedbackAnchor = (feedback: Feedback): feedback is Feedback & {
  scriptPage: number;
  scriptX: number;
  scriptY: number;
} =>
  typeof feedback.scriptPage === 'number' &&
  Number.isFinite(feedback.scriptPage) &&
  feedback.scriptPage >= 1 &&
  typeof feedback.scriptX === 'number' &&
  Number.isFinite(feedback.scriptX) &&
  feedback.scriptX >= 0 &&
  feedback.scriptX <= 1 &&
  typeof feedback.scriptY === 'number' &&
  Number.isFinite(feedback.scriptY) &&
  feedback.scriptY >= 0 &&
  feedback.scriptY <= 1;

function ScriptFeedbackTimeline({
  feedbacks,
  pageCount,
  activeFeedbackId,
  scrollProgress,
  onFeedbackSelect,
  onScrollRequest,
}: {
  feedbacks: Feedback[];
  pageCount: number;
  activeFeedbackId: number | null;
  scrollProgress: number;
  onFeedbackSelect: (feedbackId: number) => void;
  onScrollRequest: (progress: number) => void;
}) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const anchoredFeedbacks = useMemo(
    () =>
      feedbacks
        .filter(hasScriptFeedbackAnchor)
        .sort(
          (left, right) =>
            left.scriptPage - right.scriptPage || left.scriptY - right.scriptY,
        ),
    [feedbacks],
  );
  const resolvedPageCount = Math.max(
    1,
    pageCount,
    ...anchoredFeedbacks.map((feedback) => feedback.scriptPage),
  );
  const normalizedScrollProgress = clamp(scrollProgress, 0, 1);
  const getProgressFromPointer = useCallback((clientY: number) => {
    const timeline = timelineRef.current;

    if (!timeline) {
      return null;
    }

    const rect = timeline.getBoundingClientRect();
    const trackTop = rect.top + 16;
    const trackHeight = Math.max(1, rect.height - 32);

    return clamp((clientY - trackTop) / trackHeight, 0, 1);
  }, []);

  const requestScrollFromPointer = useCallback(
    (clientY: number) => {
      const nextProgress = getProgressFromPointer(clientY);

      if (nextProgress === null) {
        return;
      }

      onScrollRequest(nextProgress);
    },
    [getProgressFromPointer, onScrollRequest],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    requestScrollFromPointer(event.clientY);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    requestScrollFromPointer(event.clientY);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <aside
      className="reaction-ui-font flex h-full min-h-0 items-center justify-center"
      aria-label="대본 피드백 위치"
    >
      <div
        ref={timelineRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className={[
          'relative h-full min-h-[220px] w-6 touch-none select-none rounded-full border border-white/18 bg-[#fff8ef]/10 px-2.5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_28px_rgba(0,0,0,0.14)] backdrop-blur-sm',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        ].join(' ')}
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalizedScrollProgress * 100)}
        tabIndex={0}
      >
        <span
          className="absolute bottom-4 left-1/2 top-4 w-[3px] -translate-x-1/2 rounded-full bg-[#fff8ef]/28"
          aria-hidden="true"
        />
        <span
          className="absolute left-1/2 z-10 h-7 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff8ef] shadow-[0_0_14px_rgba(255,248,239,0.42)]"
          style={{
            top: `calc(16px + ${normalizedScrollProgress * 100}% - ${
              normalizedScrollProgress * 32
            }px)`,
          }}
          aria-hidden="true"
        />

        {anchoredFeedbacks.map((feedback) => {
          const markerTop = clamp(
            ((feedback.scriptPage - 1 + feedback.scriptY) /
              resolvedPageCount) *
              100,
            4,
            96,
          );
          const markerColor = getFeedbackPriorityColor(feedback, '#6f625a');
          const isActive = activeFeedbackId === feedback.id;

          return (
            <button
              key={feedback.id}
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={() => onFeedbackSelect(feedback.id)}
              className={[
                'absolute left-1/2 z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                isActive ? 'scale-110 bg-white/24' : 'hover:scale-110',
              ].join(' ')}
              style={{ top: `${markerTop}%` }}
              aria-label={`${feedback.scriptPage}페이지 피드백으로 이동`}
              title={`${feedback.scriptPage}페이지 ${feedback.timestamp}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/90"
                style={{
                  backgroundColor: markerColor,
                  boxShadow: isActive
                    ? `0 0 12px ${markerColor}, 0 0 26px ${markerColor}a8`
                    : `0 0 10px ${markerColor}8c`,
                }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function ScriptFeedbackCollection({
  feedbacks,
  actors,
  activeFeedbackId,
  onFeedbackSelect,
}: {
  feedbacks: Feedback[];
  actors: Actor[];
  activeFeedbackId: number | null;
  onFeedbackSelect: (feedbackId: number) => void;
}) {
  const sortedFeedbacks = useMemo(
    () =>
      [...feedbacks].sort((left, right) => {
        const leftHasAnchor = hasScriptFeedbackAnchor(left);
        const rightHasAnchor = hasScriptFeedbackAnchor(right);

        if (leftHasAnchor && rightHasAnchor) {
          return (
            left.scriptPage - right.scriptPage ||
            left.scriptY - right.scriptY ||
            timestampToSeconds(left.timestamp) - timestampToSeconds(right.timestamp)
          );
        }

        if (leftHasAnchor !== rightHasAnchor) {
          return leftHasAnchor ? -1 : 1;
        }

        return timestampToSeconds(left.timestamp) - timestampToSeconds(right.timestamp);
      }),
    [feedbacks],
  );

  return (
    <aside className="reaction-ui-font flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#d3c3b7] bg-[#efe6de] p-1.5 text-[#431B1B] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
      <div className="reaction-hidden-scrollbar relative isolate min-h-0 flex-1 space-y-2 overflow-y-auto px-0.5 py-1">
        {sortedFeedbacks.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center rounded-[8px] bg-white/28 px-4 text-center text-[12px] font-bold text-[#431B1B]/45">
            표시할 피드백이 없습니다.
          </div>
        ) : (
          sortedFeedbacks.map((feedback) => {
            const canNavigate = hasScriptFeedbackAnchor(feedback);
            const isActive = activeFeedbackId === feedback.id;
            const bubbleColor = getFeedbackPriorityColor(feedback, '#6f625a');
            const bubbleTextColor = getFeedbackPriorityTextColor(
              feedback,
              '#fff8ef',
            );
            const actorNames =
              getFeedbackActorNames(feedback, actors) || '배우 미지정';

            return (
              <button
                key={feedback.id}
                type="button"
                onClick={() => {
                  if (canNavigate) {
                    onFeedbackSelect(feedback.id);
                  }
                }}
                disabled={!canNavigate}
                className={[
                  'group relative w-full min-w-0 rounded-[8px] border px-3 py-2.5 text-left transition focus:outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[#431B1B]/34',
                  canNavigate
                    ? 'hover:z-20 hover:-translate-y-0.5 hover:shadow-[0_14px_24px_rgba(67,27,27,0.16)]'
                    : 'cursor-not-allowed opacity-55',
                  isActive
                    ? 'z-10 border-[#431B1B]/58 shadow-[inset_0_0_0_2px_rgba(67,27,27,0.24),0_10px_22px_rgba(67,27,27,0.14)]'
                    : 'z-0 border-white/34',
                ].join(' ')}
                style={{
                  backgroundColor: bubbleColor,
                  color: bubbleTextColor,
                }}
                aria-label={
                  canNavigate
                    ? '피드백 대본 위치로 이동'
                    : '대본 위치가 없는 피드백'
                }
              >
                <span
                  className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 rounded-[2px]"
                  style={{ backgroundColor: bubbleColor }}
                  aria-hidden="true"
                />
                <span className="relative flex min-w-0 items-start gap-2">
                  <MessageCircle
                    size={15}
                    strokeWidth={2.6}
                    className="mt-0.5 shrink-0 opacity-80"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center justify-between gap-2 text-[10px] font-black opacity-75">
                      <span className="truncate">{actorNames}</span>
                      <span className="shrink-0">{feedback.timestamp}</span>
                    </span>
                    <span className="mt-1 block whitespace-pre-wrap break-words text-[12px] font-black leading-relaxed [overflow-wrap:anywhere]">
                      {feedback.content}
                    </span>
                    {!canNavigate && (
                      <span className="mt-1.5 block text-[10px] font-black opacity-58">
                        대본 위치 없음
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

const toVideoTimelineSeconds = (
  offsetSeconds: number,
  video: SessionVideoResponse | null,
) => Math.max(0, offsetSeconds - getVideoZeroOffsetSeconds(video));

const toFiniteSeconds = (value: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const normalizeRouteActors = (
  actors: ReviewRouteActor[] | undefined,
): Actor[] =>
  (actors ?? [])
    .map((actor, index) => {
      const actorId = toFiniteActorId(actor.id ?? actor.actor_id);

      if (actorId === null) {
        return null;
      }

      return {
        id: actorId,
        name:
          typeof actor.name === 'string' && actor.name.trim()
            ? actor.name
            : `배우 ${actorId}`,
        shortcut:
          typeof actor.shortcut === 'string' && actor.shortcut.trim()
            ? actor.shortcut
            : String(index + 1),
      };
    })
    .filter((actor): actor is Actor => actor !== null);

const applyActorShortcuts = (actors: Actor[]) =>
  actors
    .filter(
      (actor, index, sourceActors) =>
        sourceActors.findIndex((item) => item.id === actor.id) === index,
    )
    .map((actor, index) => ({
      ...actor,
      shortcut: String(index + 1),
    }));

export default function ReviewPage() {
  const location = useLocation();
  const routeState = location.state as ReviewRouteState | null;
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [sessionVideo, setSessionVideo] = useState<SessionVideoResponse | null>(
    null,
  );
  const [sessionVideoAppearanceInfo, setSessionVideoAppearanceInfo] =
    useState<SessionVideoAppearancesResponse | null>(null);
  const [projectActors, setProjectActors] = useState<Actor[]>([]);
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
  const [isScriptViewEnabled, setIsScriptViewEnabled] = useState(false);
  const [script, setScript] = useState<ProjectScript | null>(null);
  const [scriptStatus, setScriptStatus] =
    useState<ScriptReviewStatus>('idle');
  const [scriptErrorMessage, setScriptErrorMessage] = useState('');
  const [scriptRetryCount, setScriptRetryCount] = useState(0);
  const [scriptFeedbacks, setScriptFeedbacks] = useState<
    ScriptFeedbackWithTags[]
  >([]);
  const [scriptFeedbackScope, setScriptFeedbackScope] =
    useState<ScriptFeedbackScope>('session');
  const [scriptFeedbackStatus, setScriptFeedbackStatus] =
    useState<Exclude<ScriptReviewStatus, 'notFound'>>('idle');
  const [scriptFeedbackErrorMessage, setScriptFeedbackErrorMessage] =
    useState('');
  const [scriptFeedbackRetryCount, setScriptFeedbackRetryCount] = useState(0);
  const [scriptPageCount, setScriptPageCount] = useState(0);
  const [scriptScrollProgress, setScriptScrollProgress] = useState(0);
  const [selectedScriptFeedbackId, setSelectedScriptFeedbackId] = useState<
    number | null
  >(null);
  const [scriptFeedbackNavigationRequest, setScriptFeedbackNavigationRequest] =
    useState<{
      id: number;
      feedbackId: number;
    } | null>(null);
  const [scriptScrollProgressRequest, setScriptScrollProgressRequest] =
    useState<{
      id: number;
      progress: number;
    } | null>(null);
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const { projectTitle, sessionTitle } = useProjectBreadcrumb(
    numericProjectId,
    numericSessionId,
    {
      fallbackSessionTitle: routeState?.projectSessionTitle,
    },
  );
  const routeReviewActors = useMemo(
    () => normalizeRouteActors(routeState?.reviewActors),
    [routeState?.reviewActors],
  );
  const videoReviewActors = useMemo<Actor[]>(() => {
    const actors = sessionVideoAppearanceInfo?.actors.length
      ? sessionVideoAppearanceInfo.actors
      : (sessionVideo?.actors ?? []);

    return actors.map((actor, index) => ({
      id: actor.actor_id,
      name: actor.name ?? `배우 ${actor.actor_id}`,
      shortcut: String(index + 1),
    }));
  }, [sessionVideo, sessionVideoAppearanceInfo]);
  const reviewActors = useMemo<Actor[]>(() => {
    const projectActorNameById = new Map(
      projectActors.map((actor) => [actor.id, actor.name]),
    );
    const primaryActors =
      videoReviewActors.length > 0
        ? videoReviewActors
        : routeReviewActors.length > 0
          ? routeReviewActors
          : projectActors;
    const actorById = new Map<number, Actor>();

    primaryActors.forEach((actor) => {
      actorById.set(actor.id, {
        ...actor,
        name: projectActorNameById.get(actor.id) ?? actor.name,
      });
    });
    projectActors.forEach((actor) => {
      if (!actorById.has(actor.id)) {
        actorById.set(actor.id, actor);
      }
    });

    return applyActorShortcuts([...actorById.values()]);
  }, [projectActors, routeReviewActors, videoReviewActors]);
  const actorAppearances = useMemo<SessionVideoAppearance[]>(() => {
    if (sessionVideoAppearanceInfo) {
      const actorAppearances = getSessionVideoActorsAppearances(
        sessionVideoAppearanceInfo.actors,
      );

      if (actorAppearances.length > 0) {
        return actorAppearances;
      }

      const analysisAppearances = parseSessionVideoAppearances(
        sessionVideoAppearanceInfo.analysis_result,
      );

      if (analysisAppearances.length > 0) {
        return analysisAppearances;
      }
    }

    if (!sessionVideo) {
      return [];
    }

    const actorAppearances = getSessionVideoActorAppearances(sessionVideo);

    return actorAppearances.length > 0
      ? actorAppearances
      : parseSessionVideoAppearances(sessionVideo.analysis_result);
  }, [sessionVideo, sessionVideoAppearanceInfo]);
  const actorIdsWithTimeline = useMemo(
    () => [...new Set(actorAppearances.map((appearance) => appearance.actorId))],
    [actorAppearances],
  );
  const scriptReviewFeedbacks = useMemo(
    () => {
      const selectedTagDefinitions = feedbackTags.filter((tag) =>
        selectedFeedbackTags.includes(tag.id),
      );

      return scriptFeedbacks
        .filter((feedback) => {
          const matchesActor =
            selectedActorIds.length === 0 ||
            selectedActorIds.some((actorId) =>
              feedback.actor_ids.includes(actorId),
            );
          const matchesPriority =
            selectedPriorityTags.length === 0 ||
            selectedPriorityTags.some((priority) =>
              feedback.priority.includes(priority),
            );
          const matchesCategory =
            selectedTagDefinitions.length === 0 ||
            selectedTagDefinitions.some((tag) =>
              feedback.categories.some(
                (category) =>
                  category === tag.id || tag.values.includes(category),
              ),
            );

          return matchesActor && matchesPriority && matchesCategory;
        })
        .map((feedback) => {
          const isCurrentSession =
            String(feedback.session_id) === String(numericSessionId);
          const offsetSeconds = isCurrentSession
            ? toVideoTimelineSeconds(
                toFiniteSeconds(feedback.video_offset_seconds),
                sessionVideo,
              )
            : toFiniteSeconds(feedback.video_offset_seconds);
          const actorNames = feedback.actor_ids
            .map(
              (actorId) =>
                reviewActors.find((actor) => actor.id === actorId)?.name,
            )
            .filter((name): name is string => Boolean(name));

          return {
            id: feedback.feedback_id,
            createdByUserId: feedback.created_by_user_id,
            timestamp: secondsToTimestamp(offsetSeconds),
            actorIds: feedback.actor_ids,
            actorNames,
            content: feedback.content,
            isUrgent: feedback.content.includes('!!!'),
            priority: feedback.priority,
            categories: feedback.categories,
            scriptPage: feedback.script_page,
            scriptX: feedback.script_x,
            scriptY: feedback.script_y,
          };
        });
    },
    [
      numericSessionId,
      reviewActors,
      scriptFeedbacks,
      selectedActorIds,
      selectedFeedbackTags,
      selectedPriorityTags,
      sessionVideo,
    ],
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

    const loadSessionVideoAppearances = async () => {
      setSessionVideoAppearanceInfo(null);

      try {
        const appearances = await getSessionVideoAppearances(numericSessionId, {
          refresh: true,
        });

        if (!ignore) {
          setSessionVideoAppearanceInfo(appearances);
        }
      } catch (error) {
        if (!ignore) {
          setSessionVideoAppearanceInfo(null);
        }

        console.error('Failed to load session video appearances', error);
      }
    };

    void loadSessionVideo();
    void loadSessionVideoAppearances();

    return () => {
      ignore = true;
    };
  }, [numericSessionId]);

  useEffect(() => {
    if (Number.isNaN(numericProjectId)) {
      setProjectActors([]);
      return;
    }

    let ignore = false;

    const loadProjectActors = async () => {
      try {
        const nextActors = await listProjectActors(numericProjectId);

        if (!ignore) {
          setProjectActors(nextActors);
        }
      } catch (error) {
        console.error('Failed to load project actors for review', error);

        if (!ignore) {
          setProjectActors([]);
        }
      }
    };

    void loadProjectActors();

    return () => {
      ignore = true;
    };
  }, [numericProjectId]);

  useEffect(() => {
    if (Number.isNaN(numericProjectId)) {
      setScript(null);
      setScriptStatus('error');
      setScriptErrorMessage('프로젝트 정보를 확인하지 못했습니다.');
      return;
    }

    let ignore = false;

    const loadScript = async () => {
      setScriptStatus('loading');
      setScriptErrorMessage('');

      try {
        const nextScript = await getProjectScript(numericProjectId);

        if (ignore) {
          return;
        }

        setScript(nextScript);
        setScriptStatus('ready');
      } catch (error) {
        if (ignore) {
          return;
        }

        setScript(null);

        if (isScriptNotFoundError(error)) {
          setScriptStatus('notFound');
          setIsScriptViewEnabled(false);
          return;
        }

        setScriptStatus('error');
        setScriptErrorMessage(
          error instanceof Error
            ? error.message
            : '대본 정보를 불러오지 못했습니다.',
        );
      }
    };

    void loadScript();

    return () => {
      ignore = true;
    };
  }, [numericProjectId, scriptRetryCount]);

  useEffect(() => {
    if (
      !isScriptViewEnabled ||
      scriptStatus !== 'ready' ||
      Number.isNaN(numericProjectId) ||
      Number.isNaN(numericSessionId)
    ) {
      return;
    }

    let ignore = false;

    const loadScriptFeedbacks = async () => {
      setScriptFeedbackStatus('loading');
      setScriptFeedbackErrorMessage('');

      try {
        const nextFeedbacks =
          scriptFeedbackScope === 'session'
            ? await getFeedbacksV2(numericSessionId)
            : await getProjectScriptFeedbacks(numericProjectId);
        const taggedFeedbacks = await Promise.all(
          nextFeedbacks.map(async (feedback) => {
            try {
              const tags = await getFeedbackTags(
                feedback.session_id,
                feedback.feedback_id,
              );

              return {
                ...feedback,
                ...tags,
              };
            } catch {
              return getTaggedScriptFeedbackFallback(feedback);
            }
          }),
        );

        if (ignore) {
          return;
        }

        setScriptFeedbacks(taggedFeedbacks);
        setScriptFeedbackStatus('ready');
      } catch (error) {
        if (ignore) {
          return;
        }

        setScriptFeedbacks([]);
        setScriptFeedbackStatus('error');
        setScriptFeedbackErrorMessage(
          error instanceof Error
            ? error.message
            : '대본 피드백 위치를 불러오지 못했습니다.',
        );
      }
    };

    void loadScriptFeedbacks();

    return () => {
      ignore = true;
    };
  }, [
    isScriptViewEnabled,
    numericProjectId,
    numericSessionId,
    scriptFeedbackScope,
    scriptFeedbackRetryCount,
    scriptStatus,
  ]);

  useEffect(() => {
    if (!sessionId) return;

    let ignore = false;

    const loadFeedbacks = async () => {
      setIsLoadingFeedbacks(true);

      try {
        const fetchedFeedbacks = await filterFeedbacks(sessionId, {
          categories: selectedFeedbackTags,
          priority: selectedPriorityTags,
          actorIds: selectedActorIds,
        });

        if (ignore) return;

        setFeedbacks(
          fetchedFeedbacks.map((feedback) => ({
            id: feedback.feedback_id,
            createdByUserId: feedback.created_by_user_id,
            timestamp: secondsToTimestamp(
              toVideoTimelineSeconds(
                feedback.video_offset_seconds,
                sessionVideo,
              ),
            ),
            actorIds:
              feedback.actor_ids ??
              inferActorIds(feedback.content, reviewActors),
            actorNames: feedback.actor_names,
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
    sessionVideo,
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

  const requestScriptFeedbackNavigation = useCallback((feedbackId: number) => {
    setSelectedScriptFeedbackId(feedbackId);
    setScriptFeedbackNavigationRequest((current) => ({
      id: (current?.id ?? 0) + 1,
      feedbackId,
    }));
  }, []);

  const requestScriptScrollProgress = useCallback((progress: number) => {
    setSelectedScriptFeedbackId(null);
    setScriptScrollProgressRequest((current) => ({
      id: (current?.id ?? 0) + 1,
      progress,
    }));
  }, []);

  const highlightFeedback = useCallback((feedbackId: number | null) => {
    setHighlightedFeedbackId(feedbackId);
  }, []);

  const completedCount = useMemo(() => feedbacks.length, [feedbacks.length]);
  const renderScriptReviewContent = () => {
    if (scriptStatus === 'loading' || scriptStatus === 'idle') {
      return (
        <div className="flex h-full min-h-0 items-center justify-center">
          <LoadingSpinner label="대본을 불러오는 중입니다" />
        </div>
      );
    }

    if (scriptStatus === 'notFound') {
      return (
        <div className="reaction-ui-font flex h-full min-h-0 items-center justify-center px-4 text-center">
          <div className="rounded-[10px] border border-white/18 bg-white/10 px-8 py-7 text-[#eee7dc] shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            <p className="text-base font-black">등록된 대본이 없습니다.</p>
            <p className="mt-2 text-sm font-semibold text-[#eee7dc]/64">
              프로젝트 설정에서 대본 PDF를 업로드해 주세요.
            </p>
          </div>
        </div>
      );
    }

    if (scriptStatus === 'error' || !script) {
      return (
        <div className="reaction-ui-font flex h-full min-h-0 items-center justify-center px-4 text-center">
          <div className="rounded-[10px] border border-white/18 bg-white/10 px-8 py-7 text-[#eee7dc] shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            <p className="text-base font-black">대본 정보를 불러오지 못했습니다.</p>
            <p className="mt-2 text-sm font-semibold text-[#eee7dc]/64">
              {scriptErrorMessage}
            </p>
            <button
              type="button"
              onClick={() => setScriptRetryCount((count) => count + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/12 px-4 py-2 text-xs font-bold text-[#eee7dc] transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <RotateCcw size={13} strokeWidth={2.5} aria-hidden="true" />
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    const isCurrentSessionScope = scriptFeedbackScope === 'session';

    return (
      <div className="relative grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_30px_300px]">
        <div className="flex min-h-0 justify-center overflow-hidden lg:justify-end">
          <ScriptReviewPdfViewer
            script={script}
            feedbacks={scriptReviewFeedbacks}
            actors={reviewActors}
            feedbackTags={feedbackTags}
            feedbackNavigationRequest={scriptFeedbackNavigationRequest}
            scrollProgressRequest={scriptScrollProgressRequest}
            onPageCountChange={setScriptPageCount}
            onScrollProgressChange={setScriptScrollProgress}
            onSelectedFeedbackChange={setSelectedScriptFeedbackId}
          />
        </div>

        <div className="hidden min-h-0 overflow-hidden lg:flex">
          <ScriptFeedbackTimeline
            feedbacks={scriptReviewFeedbacks}
            pageCount={scriptPageCount}
            activeFeedbackId={selectedScriptFeedbackId}
            scrollProgress={scriptScrollProgress}
            onFeedbackSelect={requestScriptFeedbackNavigation}
            onScrollRequest={requestScriptScrollProgress}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="shrink-0">
            <ReviewFilterBar
              layout="vertical"
              scopeControl={
                <button
                  type="button"
                  onClick={() =>
                    setScriptFeedbackScope((scope) =>
                      scope === 'session' ? 'project' : 'session',
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-[8px] border border-[#431B1B]/14 bg-[#fff8ef]/62 px-3 py-2.5 text-left text-[#431B1B] shadow-[inset_0_1px_0_rgba(255,255,255,0.46)] transition hover:bg-[#fff8ef]/82 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/28"
                  aria-pressed={isCurrentSessionScope}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-black">
                      {isCurrentSessionScope
                        ? '현재 세션 피드백만 불러오기'
                        : '누적피드백 확인하기'}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-bold text-[#431B1B]/52">
                      {isCurrentSessionScope
                        ? 'OFF로 전환하면 프로젝트 전체 피드백을 봅니다'
                        : 'ON으로 전환하면 현재 세션만 봅니다'}
                    </span>
                  </span>
                  <span
                    className={[
                      'relative h-6 w-11 shrink-0 rounded-full p-0.5 transition',
                      isCurrentSessionScope ? 'bg-[#431B1B]' : 'bg-[#c9c1ba]',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    <span
                      className={[
                        'block h-5 w-5 rounded-full bg-[#fff8ef] shadow-[0_3px_8px_rgba(0,0,0,0.18)] transition',
                        isCurrentSessionScope
                          ? 'translate-x-5'
                          : 'translate-x-0',
                      ].join(' ')}
                    />
                  </span>
                </button>
              }
              feedbackTags={feedbackTags}
              priorityTags={priorityTags}
              actors={reviewActors}
              selectedFeedbackTags={selectedFeedbackTags}
              selectedPriorityTags={selectedPriorityTags}
              selectedActorIds={selectedActorIds}
              onFeedbackTagToggle={toggleFeedbackTag}
              onPriorityTagToggle={togglePriorityTag}
              onActorToggle={toggleActor}
            />
          </div>

          <ScriptFeedbackCollection
            feedbacks={scriptReviewFeedbacks}
            actors={reviewActors}
            activeFeedbackId={selectedScriptFeedbackId}
            onFeedbackSelect={requestScriptFeedbackNavigation}
          />
        </div>

        {(scriptFeedbackStatus === 'error' ||
          scriptFeedbackStatus === 'loading') && (
          <div className="reaction-ui-font pointer-events-none absolute bottom-7 left-1/2 z-20 -translate-x-1/2 px-4">
            <div
              className={[
                'pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-bold shadow-[0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-sm',
                scriptFeedbackStatus === 'error'
                  ? 'border-[#D15757]/35 bg-[#D15757]/16 text-[#ffd8d8]'
                  : 'border-[#431B1B]/22 bg-[#fff8ef]/78 text-[#431B1B]',
              ].join(' ')}
            >
              {scriptFeedbackStatus === 'loading' && (
                <span
                  className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#431B1B]/22 border-t-[#431B1B]"
                  aria-hidden="true"
                />
              )}
              <span>
                {scriptFeedbackStatus === 'error'
                  ? scriptFeedbackErrorMessage
                  : '대본 위 피드백 위치를 불러오는 중입니다'}
              </span>
              {scriptFeedbackStatus === 'error' && (
                <button
                  type="button"
                  onClick={() =>
                    setScriptFeedbackRetryCount((count) => count + 1)
                  }
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/24 bg-white/12 px-2.5 py-1 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <RotateCcw size={12} strokeWidth={2.5} aria-hidden="true" />
                  재시도
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  const feedbackPlaybackMarkers = useMemo(
    () =>
      feedbacks
        .map((feedback) => ({
          feedbackId: feedback.id,
          time: timestampToSeconds(feedback.timestamp),
        }))
        .filter((marker) => Number.isFinite(marker.time) && marker.time >= 0),
    [feedbacks],
  );
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
  const canShowScriptViewToggle =
    scriptStatus === 'ready' || scriptStatus === 'error';

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

          <div className="flex shrink-0 items-center gap-2">
            {canShowScriptViewToggle && (
              <button
                type="button"
                onClick={() => setIsScriptViewEnabled((enabled) => !enabled)}
                className={[
                  'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                  isScriptViewEnabled
                    ? 'border-white/85 bg-[var(--reaction-paper)] text-[var(--reaction-wine)] shadow-[0_0_18px_rgba(255,248,239,0.22)]'
                    : 'border-white/18 bg-white/8 text-[#eee7dc] hover:bg-white/14',
                ].join(' ')}
                aria-pressed={isScriptViewEnabled}
              >
                <BookOpen size={14} strokeWidth={2.5} aria-hidden="true" />
                <span>대본보기 {isScriptViewEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#eee7dc] transition hover:bg-white/12 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="설정"
            >
              <Settings size={17} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
        </div>

        {isScriptViewEnabled && canShowScriptViewToggle ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderScriptReviewContent()}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,0.82fr)] items-stretch gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.72fr)] lg:grid-rows-1">
            <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
              <ReviewVideoPanel
                videoUrl={sessionVideo?.s3_url ?? ''}
                appearances={actorAppearances}
                feedbackPlaybackMarkers={feedbackPlaybackMarkers}
                requiredFeedbackMarkers={requiredFeedbackMarkers}
                selectedActorIds={selectedActorIds}
                isVideoLoading={isLoadingVideo}
                videoMessage={videoMessage}
                actorOnlyPlaybackRequest={actorOnlyPlaybackRequest}
                actorTimelineNavigationRequest={actorTimelineNavigationRequest}
                highlightedFeedbackId={highlightedFeedbackId}
                onRequiredFeedbackMarkerClick={highlightFeedback}
                onPlaybackFeedbackChange={highlightFeedback}
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
        )}

        <p className="reaction-ui-font sr-only">
          {completedCount}개의 피드백을 표시합니다
        </p>
      </div>
    </main>
  );
}
