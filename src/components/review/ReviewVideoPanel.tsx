import { useEffect, useState } from 'react';
import axios from 'axios';
import { getSessionVideo } from '../../apis/session';
import LoadingSpinner from '../LoadingSpinner';
import movePanelBg from '../../images/icon/move-pannel-bg.svg';

type TimelineMarker = {
  id: number;
  left: number;
  color: string;
};

const timelineMarkers: TimelineMarker[] = [
  { id: 1, left: 24, color: '#efe6de' },
  { id: 2, left: 25.5, color: '#f6e2a8' },
  { id: 3, left: 33, color: '#f6b3bb' },
  { id: 4, left: 38, color: '#9bc7e8' },
  { id: 5, left: 47, color: '#f6e2a8' },
  { id: 6, left: 72, color: '#431B1B' },
];

type ReviewVideoPanelProps = {
  sessionId: number;
};

export default function ReviewVideoPanel({ sessionId }: ReviewVideoPanelProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoMessage, setVideoMessage] = useState('');

  useEffect(() => {
    if (Number.isNaN(sessionId)) {
      return;
    }

    let ignore = false;

    const loadVideoUrl = async () => {
      setIsVideoLoading(true);

      try {
        const nextVideoUrl = await getSessionVideo(sessionId);

        if (!ignore) {
          setVideoUrl(nextVideoUrl);
          setVideoMessage('');
        }
      } catch (error) {
        if (!ignore) {
          setVideoUrl('');
          setVideoMessage('영상이 아직 없습니다');
        }

        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
          console.error('Failed to load session video', error);
        }
      } finally {
        if (!ignore) {
          setIsVideoLoading(false);
        }
      }
    };

    void loadVideoUrl();

    return () => {
      ignore = true;
    };
  }, [sessionId]);

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
              className="h-full w-full bg-[#17100f] object-contain"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="absolute inset-x-[4.5%] bottom-[10%] h-[44px]">
              <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#eee7dc]" />
              <div className="absolute left-0 top-1/2 h-[3px] w-[74%] -translate-y-1/2 bg-[#431B1B]" />

              {timelineMarkers.map((marker) => (
                <span
                  key={marker.id}
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45"
                  style={{
                    left: `${marker.left}%`,
                    backgroundColor: marker.color,
                  }}
                />
              ))}

              <button
                type="button"
                className="absolute left-1/2 top-[calc(50%+18px)] h-0 w-0 -translate-x-1/2 border-y-[11px] border-l-[18px] border-y-transparent border-l-[#431B1B] transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="영상 재생"
              />
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
