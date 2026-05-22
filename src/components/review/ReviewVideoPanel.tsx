import { Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionVideoAppearance } from '../../apis/session';
import type { Actor } from '../../types/feedback';
import LoadingSpinner from '../LoadingSpinner';
import movePanelBg from '../../images/icon/move-pannel-bg.svg';

const actorTimelineColors = [
  '#f6b3bb',
  '#f6e2a8',
  '#9bc7e8',
  '#c6d8a8',
  '#d7c4f2',
  '#efe6de',
];

type ReviewVideoPanelProps = {
  videoUrl: string;
  actors: Actor[];
  appearances: SessionVideoAppearance[];
  selectedActorIds: number[];
  isVideoLoading: boolean;
  videoMessage: string;
  actorOnlyPlaybackRequest: number;
};

export default function ReviewVideoPanel({
  videoUrl,
  actors,
  appearances,
  selectedActorIds,
  isVideoLoading,
  videoMessage,
  actorOnlyPlaybackRequest,
}: ReviewVideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isActorOnlyPlayback, setIsActorOnlyPlayback] = useState(false);
  const actorNamesById = useMemo(
    () => new Map(actors.map((actor) => [actor.id, actor.name])),
    [actors],
  );
  const normalizedAppearances = useMemo(
    () =>
      appearances.map((appearance) => {
        const startSeconds = Math.max(0, appearance.startSeconds);
        const endSeconds = Math.max(
          startSeconds + 1,
          appearance.endSeconds,
        );

        return {
          ...appearance,
          startSeconds,
          endSeconds,
        };
      }),
    [appearances],
  );
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
  const timelineDuration = Math.max(
    Math.ceil(videoDuration),
    ...normalizedAppearances.map((appearance) =>
      Math.ceil(appearance.endSeconds),
    ),
    1,
  );
  const currentTimelineSecond = Math.min(
    timelineDuration,
    Math.floor(currentTime),
  );
  const currentTimelineProgress = Math.min(
    100,
    Math.max(0, (currentTime / timelineDuration) * 100),
  );
  const getActorTimelineColor = (actorId: number) => {
    const actorIndex = actors.findIndex((actor) => actor.id === actorId);

    return actorTimelineColors[
      Math.max(actorIndex, 0) % actorTimelineColors.length
    ];
  };
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) {
      return '00:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };
  const seekToClientX = (clientX: number) => {
    if (!timelineRef.current || !videoRef.current) {
      return;
    }

    const rect = timelineRef.current.getBoundingClientRect();
    const progress = Math.min(
      1,
      Math.max(0, (clientX - rect.left) / rect.width),
    );
    const nextTime = progress * timelineDuration;

    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };
  const findCurrentSelectedAppearanceIndex = (time: number) =>
    selectedActorAppearances.findIndex(
      (appearance) =>
        time >= Math.floor(appearance.startSeconds) &&
        time <= Math.ceil(appearance.endSeconds),
    );
  const findNextSelectedAppearance = (time: number) =>
    selectedActorAppearances.find(
      (appearance) => Math.floor(appearance.startSeconds) > time,
    ) ?? selectedActorAppearances[0];
  const playSelectedActorTimeline = () => {
    const video = videoRef.current;

    if (!video || selectedActorAppearances.length === 0) {
      return;
    }

    const nextAppearance = findNextSelectedAppearance(video.currentTime - 0.1);

    if (!nextAppearance) {
      return;
    }

    setIsActorOnlyPlayback(true);
    video.currentTime = Math.floor(nextAppearance.startSeconds);
    void video.play();
  };
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

  useEffect(() => {
    if (actorOnlyPlaybackRequest === 0) {
      return;
    }

    playSelectedActorTimeline();
  }, [actorOnlyPlaybackRequest]);

  return (
    <section className="relative h-full min-h-[360px] w-full overflow-hidden">
      <div className="relative z-10 grid h-full min-h-0 w-full overflow-hidden p-[clamp(18px,2.2vw,28px)]">
        <img
          src={movePanelBg}
          alt=""
          className="pointer-events-none absolute inset-0 z-0 block h-full w-full max-w-none object-fill"
          aria-hidden="true"
        />

        <div className="relative z-10 min-h-0 overflow-hidden rounded-[10px] bg-[#7c7d7a]">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              preload="metadata"
              onLoadedMetadata={(event) => {
                setVideoDuration(event.currentTarget.duration);
              }}
              onTimeUpdate={(event) => {
                const nextCurrentTime = event.currentTarget.currentTime;

                setCurrentTime(nextCurrentTime);

                if (
                  !isActorOnlyPlayback ||
                  selectedActorAppearances.length === 0
                ) {
                  return;
                }

                const currentAppearanceIndex =
                  findCurrentSelectedAppearanceIndex(nextCurrentTime);
                const currentAppearance =
                  selectedActorAppearances[currentAppearanceIndex];

                if (
                  currentAppearance &&
                  nextCurrentTime < Math.ceil(currentAppearance.endSeconds)
                ) {
                  return;
                }

                const nextAppearance =
                  selectedActorAppearances[currentAppearanceIndex + 1];

                if (nextAppearance) {
                  event.currentTarget.currentTime = Math.floor(
                    nextAppearance.startSeconds,
                  );
                  return;
                }

                event.currentTarget.pause();
                setIsActorOnlyPlayback(false);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setIsActorOnlyPlayback(false);
              }}
              className="h-full w-full bg-[#17100f] object-contain"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="absolute inset-0 bg-[#17100f]" />
          )}

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
                  {formatTime(timelineDuration)}
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
                  <div className="absolute left-0 right-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#eee7dc]/26" />
                  <div
                    className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#efe6de]/70"
                    style={{
                      width: `${currentTimelineProgress}%`,
                    }}
                  />
                  {normalizedAppearances.map((appearance) => {
                    const left =
                      (appearance.startSeconds / timelineDuration) * 100;
                    const width =
                      ((appearance.endSeconds - appearance.startSeconds) /
                        timelineDuration) *
                      100;
                    const color = getActorTimelineColor(appearance.actorId);
                    const isSelected =
                      selectedActorIds.length === 0 ||
                      selectedActorIds.includes(appearance.actorId);

                    return (
                      <span
                        key={`${appearance.actorId}-${appearance.startSeconds}-${appearance.endSeconds}`}
                        className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full border border-white/55 shadow-[0_0_0_1px_rgba(0,0,0,0.14)]"
                        style={{
                          left: `${Math.max(0, left)}%`,
                          width: `${Math.max(3.6, width)}%`,
                          backgroundColor: color,
                          opacity: isSelected ? 1 : 0.46,
                        }}
                        title={`${actorNamesById.get(appearance.actorId) ?? `배우 ${appearance.actorId}`} ${formatTime(appearance.startSeconds)}-${formatTime(appearance.endSeconds)}`}
                        aria-label={`${actorNamesById.get(appearance.actorId) ?? `배우 ${appearance.actorId}`} 등장 구간`}
                      />
                    );
                  })}
                  <span
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#431B1B] bg-[#fff8ef] shadow-[0_4px_12px_rgba(0,0,0,0.32)]"
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
