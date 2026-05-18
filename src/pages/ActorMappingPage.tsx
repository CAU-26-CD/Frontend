import { Check, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import { actors } from '../data/actors';
import { feedbackSessionDummy } from '../data/feedbackSessionDummy';
import { projectDummy } from '../data/projectDummy';
import fallbackFrameImage from '../images/reaction-bg.png';

type RecognizedFaceFrame = {
  id: number;
  frameUrl: string;
  timestamp: string;
};

const recognizedFaceFrames: RecognizedFaceFrame[] = Array.from(
  { length: 8 },
  (_, index) => ({
    id: index + 1,
    frameUrl: fallbackFrameImage,
    timestamp: `00:${String((index + 1) * 7).padStart(2, '0')}`,
  }),
);

export default function ActorMappingPage() {
  const navigate = useNavigate();
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const [mappedActors, setMappedActors] = useState<Record<number, number>>({});
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const selectedProject = projectDummy.find(
    (project) => project.id === numericProjectId,
  );
  const selectedSession = feedbackSessionDummy.find(
    (session) =>
      session.projectId === numericProjectId && session.id === numericSessionId,
  );
  const mappedCount = useMemo(
    () => Object.keys(mappedActors).length,
    [mappedActors],
  );

  const handleActorSelect = (frameId: number, actorId: number) => {
    setMappedActors((current) => ({
      ...current,
      [frameId]: actorId,
    }));
  };

  const handleComplete = () => {
    if (!Number.isNaN(numericProjectId)) {
      navigate(`/project/${numericProjectId}/workspace`);
    }
  };

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader align="left" />
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-6 pb-10 pt-24 lg:px-12">
        <div className="reaction-ui-font flex shrink-0 items-center justify-between gap-4 text-sm font-semibold text-[#eee7dc]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">
              My Projects / {selectedProject?.title ?? 'Unknown Project'} /{' '}
              {selectedSession?.title ?? 'Unknown Session'}
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
            onClick={handleComplete}
            className="reaction-glass-pill h-8 rounded-full px-4 text-xs font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            매칭 완료
          </button>
        </div>

        <section className="reaction-ui-font flex flex-1 flex-col pt-10">
          <div className="text-center">
            <h1 className="text-[clamp(1.25rem,2vw,1.7rem)] font-semibold text-[#f6eee4]">
              {recognizedFaceFrames.length}명의 배우를 인식했습니다. 태그를
              매칭해주세요.
            </h1>
            <p className="mt-2 text-xs font-semibold text-[#eee7dc]/48">
              인식된 프레임을 확인하고 오른쪽에서 배우 태그를 선택하세요
            </p>
          </div>

          <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recognizedFaceFrames.map((frame) => {
              const selectedActorId = mappedActors[frame.id];

              return (
                <article
                  key={frame.id}
                  className="grid min-h-[132px] grid-cols-[minmax(94px,0.78fr)_minmax(0,1fr)] gap-3 overflow-hidden rounded-[6px] border border-[#e8ddd2]/70 bg-[#efe6de] p-2.5 text-[#2d1715] shadow-[0_14px_32px_rgba(0,0,0,0.2)]"
                >
                  <div className="relative overflow-hidden rounded-[3px] bg-[#aa9d91]">
                    <img
                      src={frame.frameUrl}
                      alt={`${frame.timestamp} 인식 프레임`}
                      className="h-full w-full object-cover opacity-70 grayscale"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#431B1B]/78 px-2 py-0.5 text-[10px] font-bold text-[#fff8ef]">
                      {frame.timestamp}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-2">
                    <p className="truncate text-[11px] font-bold text-[#806b61]">
                      Face #{frame.id}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {actors.map((actor) => {
                        const isSelected = selectedActorId === actor.id;

                        return (
                          <button
                            key={actor.id}
                            type="button"
                            onClick={() => handleActorSelect(frame.id, actor.id)}
                            className={[
                              'inline-flex h-7 min-w-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                              isSelected
                                ? 'border-[#431B1B] bg-[#431B1B] text-[#fff8ef]'
                                : 'border-[#c8b7aa] bg-white/42 text-[#806b61] hover:border-[#431B1B] hover:text-[#431B1B]',
                            ].join(' ')}
                          >
                            {isSelected && (
                              <Check size={12} strokeWidth={3} aria-hidden />
                            )}
                            <span className="truncate">{actor.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <p className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-[#eee7dc]/72 backdrop-blur-md">
              {mappedCount}/{recognizedFaceFrames.length}명 매칭됨
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
