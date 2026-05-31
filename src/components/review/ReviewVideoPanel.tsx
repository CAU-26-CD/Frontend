import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionVideoAppearance } from '../../apis/session';
import LoadingSpinner from '../LoadingSpinner';
import movePanelBg from '../../images/icon/move-pannel-bg.svg';

const getMetadataVideoDuration = (video: HTMLVideoElement) => {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration;
  }

  return 0;
};

type ReviewVideoPanelProps = {
  videoUrl: string;
  appearances: SessionVideoAppearance[];
  feedbackPlaybackMarkers: {
    feedbackId: number;
    time: number;
  }[];
  requiredFeedbackMarkers: {
    feedbackId: number;
    time: number;
  }[];
  selectedActorIds: number[];
  isVideoLoading: boolean;
  videoMessage: string;
  actorOnlyPlaybackRequest: number;
  actorTimelineNavigationRequest: {
    id: number;
    direction: 'previous' | 'next';
  };
  highlightedFeedbackId?: number | null;
  onRequiredFeedbackMarkerClick: (feedbackId: number) => void;
  onPlaybackFeedbackChange: (feedbackId: number | null) => void;
};

export default function ReviewVideoPanel({
  videoUrl,
  appearances,
  feedbackPlaybackMarkers,
  requiredFeedbackMarkers,
  selectedActorIds,
  isVideoLoading,
  videoMessage,
  actorOnlyPlaybackRequest,
  actorTimelineNavigationRequest,
  highlightedFeedbackId = null,
  onRequiredFeedbackMarkerClick,
  onPlaybackFeedbackChange,
}: ReviewVideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isDurationProbeActiveRef = useRef(false);
  const lastPlaybackHighlightedFeedbackIdRef = useRef<number | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const normalizedAppearances = useMemo(
    () =>
      appearances
        .map((appearance) => {
          const rawStartSeconds = Number(appearance.startSeconds);
          const rawEndSeconds = Number(appearance.endSeconds);

          if (
            !Number.isFinite(rawStartSeconds) ||
            !Number.isFinite(rawEndSeconds)
          ) {
            return null;
          }

          const startSeconds = Math.max(0, rawStartSeconds);
          const endSeconds = Math.max(startSeconds + 1, rawEndSeconds);

          return {
            ...appearance,
            startSeconds,
            endSeconds,
          };
        })
        .filter((appearance): appearance is SessionVideoAppearance =>
          Boolean(appearance),
        ),
    [appearances],
  );
  const normalizedRequiredFeedbackMarkers = useMemo(
    () =>
      requiredFeedbackMarkers
        .map((marker) => ({
          feedbackId: marker.feedbackId,
          time: Math.floor(Number(marker.time)),
        }))
        .filter((marker) => Number.isFinite(marker.time) && marker.time >= 0)
        .sort((a, b) => a.time - b.time || a.feedbackId - b.feedbackId),
    [requiredFeedbackMarkers],
  );
  const normalizedFeedbackPlaybackMarkers = useMemo(
    () =>
      feedbackPlaybackMarkers
        .map((marker) => ({
          feedbackId: marker.feedbackId,
          time: Math.floor(Number(marker.time)),
        }))
        .filter((marker) => Number.isFinite(marker.time) && marker.time >= 0)
        .sort((a, b) => a.time - b.time || a.feedbackId - b.feedbackId),
    [feedbackPlaybackMarkers],
  );
  const playbackFeedbackIdBySecond = useMemo(() => {
    const feedbackIdBySecond = new Map<number, number>();

    normalizedFeedbackPlaybackMarkers.forEach((marker) => {
      if (!feedbackIdBySecond.has(marker.time)) {
        feedbackIdBySecond.set(marker.time, marker.feedbackId);
      }
    });

    return feedbackIdBySecond;
  }, [normalizedFeedbackPlaybackMarkers]);
  const selectedActorAppearances = useMemo(
    () =>
      selectedActorIds.length === 0
        ? []
        : normalizedAppearances
            .filter((appearance) =>
              selectedActorIds.includes(appearance.actorId),
            )
            .sort((a, b) => a.startSeconds - b.startSeconds),
    [normalizedAppearances, selectedActorIds],
  );
  const safeVideoDuration = Number.isFinite(videoDuration)
    ? Math.max(0, videoDuration)
    : 0;
  const hasVideoDuration = safeVideoDuration > 0;
  const videoFrameClassName =
    'relative h-full w-full overflow-hidden bg-[#17100f]';
  const videoClassName = 'h-full w-full bg-[#17100f] object-contain';
  const fallbackTimelineDuration = Math.max(
    ...normalizedAppearances.map((appearance) =>
      Math.ceil(appearance.endSeconds),
    ),
    ...normalizedRequiredFeedbackMarkers.map((marker) => marker.time + 1),
    1,
  );
  const timelineDuration = hasVideoDuration
    ? safeVideoDuration
    : fallbackTimelineDuration;
  const currentTimelineSecond = Math.min(
    timelineDuration,
    Math.floor(currentTime),
  );
  const currentTimelineProgress = Math.min(
    100,
    Math.max(0, (currentTime / timelineDuration) * 100),
  );
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) {
      return '00:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };
  const syncVideoDuration = (video: HTMLVideoElement) => {
    const nextDuration = getMetadataVideoDuration(video);

    if (nextDuration > 0) {
      setVideoDuration(nextDuration);
    }
  };
  const probeVideoDuration = (video: HTMLVideoElement) => {
    if (
      isDurationProbeActiveRef.current ||
      getMetadataVideoDuration(video) > 0 ||
      video.readyState < HTMLMediaElement.HAVE_METADATA ||
      video.duration !== Infinity
    ) {
      return;
    }

    const previousTime = Number.isFinite(video.currentTime)
      ? video.currentTime
      : 0;
    const wasPaused = video.paused;

    isDurationProbeActiveRef.current = true;

    const finishProbe = () => {
      syncVideoDuration(video);

      const nextDuration = getMetadataVideoDuration(video);
      const restoredTime =
        nextDuration > 0 ? Math.min(previousTime, nextDuration) : previousTime;

      if (Number.isFinite(restoredTime)) {
        video.currentTime = restoredTime;
        setCurrentTime(restoredTime);
      }

      if (!wasPaused) {
        void video.play();
      }

      isDurationProbeActiveRef.current = false;
      video.removeEventListener('durationchange', finishProbe);
      video.removeEventListener('timeupdate', finishProbe);
    };

    video.addEventListener('durationchange', finishProbe);
    video.addEventListener('timeupdate', finishProbe);
    video.currentTime = Number.MAX_SAFE_INTEGER;

    window.setTimeout(() => {
      if (isDurationProbeActiveRef.current) {
        finishProbe();
      }
    }, 500);
  };
  const seekToClientX = (clientX: number) => {
    const timeline = timelineRef.current;
    const video = videoRef.current;

    if (!timeline || !video || !Number.isFinite(timelineDuration)) {
      return;
    }

    const rect = timeline.getBoundingClientRect();

    if (!Number.isFinite(rect.width) || rect.width <= 0) {
      return;
    }

    const progress = Math.min(
      1,
      Math.max(0, (clientX - rect.left) / rect.width),
    );
    const nextTime = progress * timelineDuration;
    const finiteVideoDuration = getMetadataVideoDuration(video);
    const clampedNextTime =
      finiteVideoDuration > 0
        ? Math.min(nextTime, finiteVideoDuration)
        : nextTime;

    if (!Number.isFinite(clampedNextTime)) {
      return;
    }

    video.currentTime = clampedNextTime;
    setCurrentTime(clampedNextTime);
  };
  const findNextSelectedAppearance = useCallback(
    (time: number) =>
      selectedActorAppearances.find(
        (appearance) => Math.floor(appearance.startSeconds) > time + 0.1,
      ) ?? selectedActorAppearances[0],
    [selectedActorAppearances],
  );
  const findPreviousSelectedAppearance = useCallback(
    (time: number) =>
      [...selectedActorAppearances]
        .reverse()
        .find(
          (appearance) => Math.floor(appearance.startSeconds) < time - 0.1,
        ) ?? selectedActorAppearances[selectedActorAppearances.length - 1],
    [selectedActorAppearances],
  );
  const seekSelectedActorTimeline = useCallback(
    (direction: 'previous' | 'next') => {
      const video = videoRef.current;

      if (!video || selectedActorAppearances.length === 0) {
        return;
      }

      const targetAppearance =
        direction === 'previous'
          ? findPreviousSelectedAppearance(video.currentTime)
          : findNextSelectedAppearance(video.currentTime);

      if (!targetAppearance) {
        return;
      }

      const nextTime = Math.floor(targetAppearance.startSeconds);

      video.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [
      findNextSelectedAppearance,
      findPreviousSelectedAppearance,
      selectedActorAppearances.length,
    ],
  );
  const playSelectedActorTimeline = useCallback(() => {
    const video = videoRef.current;

    if (!video || selectedActorAppearances.length === 0) {
      return;
    }

    const nextAppearance = findNextSelectedAppearance(video.currentTime - 0.1);

    if (!nextAppearance) {
      return;
    }

    video.currentTime = Math.floor(nextAppearance.startSeconds);
    void video.play();
  }, [findNextSelectedAppearance, selectedActorAppearances.length]);
  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };
  const playFeedbackMarker = (feedbackId: number, time: number) => {
    const video = videoRef.current;

    onRequiredFeedbackMarkerClick(feedbackId);

    if (!video) {
      setCurrentTime(time);
      return;
    }

    video.currentTime = time;
    setCurrentTime(time);
    void video.play();
  };

  useEffect(() => {
    isDurationProbeActiveRef.current = false;
    lastPlaybackHighlightedFeedbackIdRef.current = null;

    queueMicrotask(() => {
      setVideoDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
    });
  }, [videoUrl]);

  useEffect(() => {
    if (actorOnlyPlaybackRequest === 0) {
      return;
    }

    queueMicrotask(playSelectedActorTimeline);
  }, [actorOnlyPlaybackRequest, playSelectedActorTimeline]);

  useEffect(() => {
    if (actorTimelineNavigationRequest.id === 0) {
      return;
    }

    queueMicrotask(() => {
      seekSelectedActorTimeline(actorTimelineNavigationRequest.direction);
    });
  }, [actorTimelineNavigationRequest, seekSelectedActorTimeline]);

  useEffect(() => {
    const nextHighlightedFeedbackId =
      playbackFeedbackIdBySecond.get(currentTimelineSecond) ?? null;

    if (nextHighlightedFeedbackId === null) {
      return;
    }

    if (
      lastPlaybackHighlightedFeedbackIdRef.current === nextHighlightedFeedbackId
    ) {
      return;
    }

    lastPlaybackHighlightedFeedbackIdRef.current = nextHighlightedFeedbackId;
    onPlaybackFeedbackChange(nextHighlightedFeedbackId);
  }, [
    currentTimelineSecond,
    onPlaybackFeedbackChange,
    playbackFeedbackIdBySecond,
  ]);

  return (
    <section className="relative h-full min-h-[360px] w-full overflow-hidden">
      <div className="relative z-10 grid h-full min-h-0 w-full overflow-hidden p-[clamp(18px,2.2vw,28px)]">
        <img
          src={movePanelBg}
          alt=""
          className="pointer-events-none absolute inset-0 z-0 block h-full w-full max-w-none object-fill"
          aria-hidden="true"
        />

        <div className="relative z-10 flex min-h-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#7c7d7a]">
          <div className={videoFrameClassName}>
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                preload="auto"
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;

                  syncVideoDuration(video);
                  probeVideoDuration(video);
                }}
                onDurationChange={(event) => {
                  const video = event.currentTarget;

                  syncVideoDuration(video);
                  probeVideoDuration(video);
                }}
                onLoadedData={(event) => {
                  const video = event.currentTarget;

                  syncVideoDuration(video);
                  probeVideoDuration(video);
                }}
                onCanPlay={(event) => {
                  const video = event.currentTarget;

                  syncVideoDuration(video);
                  probeVideoDuration(video);
                }}
                onProgress={(event) => {
                  syncVideoDuration(event.currentTarget);
                }}
                onTimeUpdate={(event) => {
                  const video = event.currentTarget;
                  const nextCurrentTime = video.currentTime;

                  syncVideoDuration(video);

                  if (!isDurationProbeActiveRef.current) {
                    setCurrentTime(nextCurrentTime);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                }}
                className={videoClassName}
              >
                <track kind="captions" />
              </video>
            ) : (
              <div className="absolute inset-0 bg-[#17100f]" />
            )}
          </div>

          {videoUrl && (
            <div className="absolute inset-x-[4.5%] bottom-[4%] rounded-[8px] border border-white/15 bg-[#17100f]/72 px-3 py-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe6de] text-[#431B1B] transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/65"
                  aria-label={isPlaying ? '일시정지' : '재생'}
                >
                  {isPlaying ? (
                    <Pause size={15} fill="#431B1B" strokeWidth={2.6} />
                  ) : (
                    <Play size={15} fill="#431B1B" strokeWidth={2.6} />
                  )}
                </button>

                <div className="min-w-[76px] text-[11px] font-bold text-[#fff8ef]/86">
                  {formatTime(currentTimelineSecond)} /{' '}
                  {hasVideoDuration ? formatTime(timelineDuration) : '--:--'}
                </div>

                <div
                  ref={timelineRef}
                  role="slider"
                  tabIndex={0}
                  aria-label="영상 재생 위치"
                  aria-valuemin={0}
                  aria-valuemax={Math.floor(timelineDuration)}
                  aria-valuenow={currentTimelineSecond}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    seekToClientX(event.clientX);
                  }}
                  onPointerMove={(event) => {
                    if (event.buttons === 1) {
                      seekToClientX(event.clientX);
                    }
                  }}
                  onKeyDown={(event) => {
                    const video = videoRef.current;

                    if (!video) {
                      return;
                    }

                    if (event.key === 'ArrowLeft') {
                      video.currentTime = Math.max(0, video.currentTime - 5);
                    }

                    if (event.key === 'ArrowRight') {
                      video.currentTime = Math.min(
                        timelineDuration,
                        video.currentTime + 5,
                      );
                    }
                  }}
                  className="relative h-[26px] min-w-0 flex-1 cursor-pointer rounded-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-[6px] -translate-y-1/2 overflow-hidden rounded-full bg-[#eee7dc]/26" />
                  {normalizedRequiredFeedbackMarkers.map((marker) => {
                    if (marker.time > timelineDuration) {
                      return null;
                    }

                    const left = (marker.time / timelineDuration) * 100;
                    const isHighlighted =
                      marker.feedbackId === highlightedFeedbackId;

                    return (
                      <button
                        key={`required-feedback-${marker.feedbackId}`}
                        type="button"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          playFeedbackMarker(marker.feedbackId, marker.time);
                        }}
                        className={[
                          'absolute top-1/2 z-[9] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[#d93535] shadow-[0_2px_8px_rgba(217,53,53,0.52)] transition hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fff8ef]',
                          isHighlighted
                            ? 'scale-125 border-[#431B1B] ring-2 ring-[#fff8ef]'
                            : 'border-[#fff8ef]',
                        ].join(' ')}
                        style={{ left: `${left}%` }}
                        title={`필수 피드백 ${formatTime(marker.time)}`}
                        aria-label={`필수 피드백 ${formatTime(marker.time)}로 이동`}
                        aria-pressed={isHighlighted}
                      />
                    );
                  })}
                  <span
                    className="pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#431B1B] bg-[#fff8ef] shadow-[0_4px_12px_rgba(0,0,0,0.32)]"
                    style={{
                      left: `${currentTimelineProgress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {isVideoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#17100f]/42">
              <LoadingSpinner label="영상 정보를 불러오는 중입니다" size="sm" />
            </div>
          )}

          {!isVideoLoading && !videoUrl && videoMessage && (
            <div className="absolute inset-x-0 top-[36%] text-center text-xs font-bold text-[#fff8ef]/78">
              {videoMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
