import { useMemo, useState } from 'react';
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
};

export default function ReviewVideoPanel({
  videoUrl,
  actors,
  appearances,
  selectedActorIds,
  isVideoLoading,
  videoMessage,
}: ReviewVideoPanelProps) {
  const [videoDuration, setVideoDuration] = useState(0);
  const actorNamesById = useMemo(
    () => new Map(actors.map((actor) => [actor.id, actor.name])),
    [actors],
  );
  const visibleAppearances = useMemo(
    () =>
      selectedActorIds.length === 0
        ? appearances
        : appearances.filter((appearance) =>
            selectedActorIds.includes(appearance.actorId),
          ),
    [appearances, selectedActorIds],
  );
  const timelineDuration = Math.max(
    videoDuration,
    ...appearances.map((appearance) => appearance.endSeconds),
    1,
  );
  const getActorTimelineColor = (actorId: number) => {
    const actorIndex = actors.findIndex((actor) => actor.id === actorId);

    return actorTimelineColors[
      Math.max(actorIndex, 0) % actorTimelineColors.length
    ];
  };

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
              src={videoUrl}
              controls
              preload="metadata"
              onLoadedMetadata={(event) => {
                setVideoDuration(event.currentTarget.duration);
              }}
              className="h-full w-full bg-[#17100f] object-contain"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="absolute inset-0 bg-[#17100f]" />
          )}

          {visibleAppearances.length > 0 && (
            <div className="pointer-events-none absolute inset-x-[4.5%] bottom-[8%] rounded-[8px] border border-white/15 bg-[#17100f]/68 px-3 py-2 backdrop-blur-sm">
              <div className="relative h-[38px]">
                <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#eee7dc]/52" />
                {visibleAppearances.map((appearance) => {
                  const left =
                    (appearance.startSeconds / timelineDuration) * 100;
                  const width =
                    ((appearance.endSeconds - appearance.startSeconds) /
                      timelineDuration) *
                    100;
                  const color = getActorTimelineColor(appearance.actorId);

                  return (
                    <span
                      key={`${appearance.actorId}-${appearance.startSeconds}-${appearance.endSeconds}`}
                      className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-white/45"
                      style={{
                        left: `${Math.max(0, left)}%`,
                        width: `${Math.max(1.5, width)}%`,
                        backgroundColor: color,
                      }}
                      aria-label={`${actorNamesById.get(appearance.actorId) ?? `배우 ${appearance.actorId}`} 등장 구간`}
                    />
                  );
                })}
              </div>

              <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                {actors
                  .filter((actor) =>
                    visibleAppearances.some(
                      (appearance) => appearance.actorId === actor.id,
                    ),
                  )
                  .map((actor) => (
                    <span
                      key={actor.id}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-[#fff8ef]/82"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: getActorTimelineColor(actor.id),
                        }}
                      />
                      {actor.name}
                    </span>
                  ))}
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
