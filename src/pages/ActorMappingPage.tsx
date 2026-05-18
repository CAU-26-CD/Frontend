import { Check, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import { actors } from '../data/actors';
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
  const [selectedFrameId, setSelectedFrameId] = useState(
    recognizedFaceFrames[0]?.id ?? 0,
  );
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle = Number.isNaN(numericSessionId)
    ? 'Session'
    : `Session ${numericSessionId}`;
  const mappedCount = useMemo(
    () => Object.keys(mappedActors).length,
    [mappedActors],
  );
  const selectedFrame =
    recognizedFaceFrames.find((frame) => frame.id === selectedFrameId) ??
    recognizedFaceFrames[0];
  const sortedFrames = useMemo(
    () =>
      [...recognizedFaceFrames].sort((a, b) => {
        const aMapped = mappedActors[a.id] ? 0 : 1;
        const bMapped = mappedActors[b.id] ? 0 : 1;

        return aMapped - bMapped || a.id - b.id;
      }),
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
      navigate(`/project/${numericProjectId}/workspace/${sessionId}/review`);
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
          </div>

          {selectedFrame && (
            <div className="mt-6 flex flex-1 items-start justify-center">
              <article className="grid w-full max-w-[470px] grid-cols-[minmax(150px,0.92fr)_minmax(0,1fr)] gap-8 rounded-[6px] bg-[#efe6de] p-5 text-[#2d1715] shadow-[0_24px_54px_rgba(0,0,0,0.28)]">
                <div className="relative aspect-[1.05/1] overflow-hidden rounded-[4px] bg-[#aa9d91]">
                  <img
                    src={selectedFrame.frameUrl}
                    alt={`${selectedFrame.timestamp} 인식 프레임`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 rounded-full bg-[#431B1B]/78 px-2.5 py-1 text-[10px] font-bold text-[#fff8ef]">
                    {selectedFrame.timestamp}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col justify-center">
                  <div className="mb-4 h-9 rounded-[8px] border border-[#b8aca3] bg-white/36" />
                  <div className="flex flex-col overflow-hidden rounded-[8px] border border-[#c8b7aa] bg-[#f5eee6]">
                    {actors.map((actor) => {
                      const isSelected =
                        mappedActors[selectedFrame.id] === actor.id;

                      return (
                        <button
                          key={actor.id}
                          type="button"
                          onClick={() =>
                            handleActorSelect(selectedFrame.id, actor.id)
                          }
                          className={[
                            'flex h-9 items-center justify-center gap-1.5 px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                            isSelected
                              ? 'bg-[#6f5752] text-[#fff8ef]'
                              : 'text-[#806b61] hover:bg-[#eadbd0] hover:text-[#431B1B]',
                          ].join(' ')}
                        >
                          {isSelected && (
                            <Check size={13} strokeWidth={3} aria-hidden />
                          )}
                          {actor.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            </div>
          )}

          <div className="mt-7 overflow-x-auto pb-2">
            <div className="flex min-w-max items-center gap-3 px-3">
              {sortedFrames.map((frame) => {
              const selectedActorId = mappedActors[frame.id];
                const selectedActor = actors.find(
                  (actor) => actor.id === selectedActorId,
                );
                const isActive = frame.id === selectedFrameId;

              return (
                  <button
                  key={frame.id}
                    type="button"
                    onClick={() => setSelectedFrameId(frame.id)}
                    className={[
                      'grid h-[92px] w-[190px] shrink-0 grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-[6px] border bg-[#efe6de] p-2 text-left text-[#2d1715] shadow-[0_14px_32px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                      isActive
                        ? 'border-[#fff8ef] ring-2 ring-[#fff8ef]/55'
                        : selectedActor
                          ? 'border-[#DF8181]/80'
                          : 'border-[#e8ddd2]/70',
                    ].join(' ')}
                >
                  <div className="relative overflow-hidden rounded-[3px] bg-[#aa9d91]">
                    <img
                      src={frame.frameUrl}
                      alt={`${frame.timestamp} 인식 프레임`}
                        className="h-full w-full object-cover opacity-80 grayscale"
                    />
                  </div>

                    <div className="flex min-w-0 flex-col justify-center">
                      <div className="h-5 rounded-[5px] border border-[#b8aca3] bg-white/34" />
                      <p className="mt-2 truncate text-[11px] font-bold text-[#806b61]">
                        {selectedActor?.name ?? '미매칭'}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-[#806b61]/62">
                        {frame.timestamp}
                      </p>
                  </div>
                  </button>
              );
            })}
            </div>
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
