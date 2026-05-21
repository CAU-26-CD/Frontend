import { Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mergeActorInto, renameActor } from '../apis/actor';
import { getSessionVideo, type SessionVideoActor } from '../apis/session';
import LoadingSpinner from '../components/LoadingSpinner';
import DesignedHeader from '../components/sidebar/DesignedHeader';

const getActorDisplayName = (actor: SessionVideoActor) =>
  actor.name ?? `배우 ${actor.actor_id}`;

export default function ActorMappingPage() {
  const navigate = useNavigate();
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const [videoActors, setVideoActors] = useState<SessionVideoActor[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle = Number.isNaN(numericSessionId)
    ? 'Session'
    : `Session ${numericSessionId}`;
  const selectedActor =
    videoActors.find((actor) => actor.actor_id === selectedActorId) ??
    videoActors[0] ??
    null;
  const knownActors = videoActors.filter((actor) => !actor.is_new);
  const mappedCount = videoActors.filter((actor) => !actor.is_new).length;
  const sortedActors = useMemo(
    () =>
      [...videoActors].sort((a, b) => {
        const aMapped = a.is_new ? 1 : 0;
        const bMapped = b.is_new ? 1 : 0;

        return aMapped - bMapped || a.actor_id - b.actor_id;
      }),
    [videoActors],
  );

  useEffect(() => {
    if (Number.isNaN(numericSessionId)) {
      setIsLoading(false);
      return;
    }

    let ignore = false;

    const loadVideoActors = async () => {
      setIsLoading(true);

      try {
        const video = await getSessionVideo(numericSessionId);

        if (ignore) return;

        setVideoActors(video.actors);
        setSelectedActorId(video.actors[0]?.actor_id ?? null);
      } catch (error) {
        console.error('Failed to load video actors', error);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadVideoActors();

    return () => {
      ignore = true;
    };
  }, [numericSessionId]);

  useEffect(() => {
    setRenameValue(selectedActor?.name ?? '');
  }, [selectedActor]);

  const handleRename = async () => {
    if (!selectedActor || !renameValue.trim() || isSaving) return;

    setIsSaving(true);

    try {
      await renameActor(selectedActor.actor_id, {
        name: renameValue.trim(),
      });

      setVideoActors((current) =>
        current.map((actor) =>
          actor.actor_id === selectedActor.actor_id
            ? { ...actor, name: renameValue.trim(), is_new: false }
            : actor,
        ),
      );
    } catch (error) {
      console.error('Failed to rename actor', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMerge = async (targetActorId: number) => {
    if (!selectedActor || selectedActor.actor_id === targetActorId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await mergeActorInto(selectedActor.actor_id, {
        target_actor_id: targetActorId,
      });

      setVideoActors((current) =>
        current.filter((actor) => actor.actor_id !== selectedActor.actor_id),
      );
      setSelectedActorId(targetActorId);
    } catch (error) {
      console.error('Failed to merge actor', error);
    } finally {
      setIsSaving(false);
    }
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
              {videoActors.length}명의 배우를 인식했습니다. 태그를
              매칭해주세요.
            </h1>
          </div>

          {isLoading ? (
            <LoadingSpinner
              label="배우 인식 결과를 불러오는 중입니다"
              className="flex-1"
              size="lg"
            />
          ) : selectedActor ? (
            <>
              <div className="mt-6 flex flex-1 items-start justify-center">
                <article className="grid w-full max-w-[500px] grid-cols-[minmax(150px,0.92fr)_minmax(0,1fr)] gap-8 rounded-[6px] bg-[#efe6de] p-5 text-[#2d1715] shadow-[0_24px_54px_rgba(0,0,0,0.28)]">
                  <div className="relative aspect-[1.05/1] overflow-hidden rounded-[4px] bg-[#aa9d91]">
                    <img
                      src={selectedActor.thumbnail_url}
                      alt={`${getActorDisplayName(selectedActor)} 썸네일`}
                      className="h-full w-full object-cover"
                    />
                    {selectedActor.is_new && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-[#431B1B]/78 px-2.5 py-1 text-[10px] font-bold text-[#fff8ef]">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-3">
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      className="h-9 rounded-[8px] border border-[#b8aca3] bg-white/36 px-3 text-center text-sm font-semibold text-[#431B1B] outline-none transition focus:border-[#431B1B] focus:ring-2 focus:ring-[#431B1B]/15"
                      placeholder="배우 이름 입력"
                    />
                    <button
                      type="button"
                      onClick={handleRename}
                      disabled={!renameValue.trim() || isSaving}
                      className="h-9 rounded-[8px] bg-[#6f5752] text-sm font-bold text-[#fff8ef] transition hover:bg-[#5d4642] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? '저장 중' : '이 이름으로 매핑'}
                    </button>

                    {knownActors.length > 0 && selectedActor.is_new && (
                      <div className="mt-1 flex flex-col overflow-hidden rounded-[8px] border border-[#c8b7aa] bg-[#f5eee6]">
                        {knownActors.map((actor) => (
                          <button
                            key={actor.actor_id}
                            type="button"
                            onClick={() => handleMerge(actor.actor_id)}
                            disabled={isSaving}
                            className="flex h-9 items-center justify-center gap-1.5 px-3 text-sm font-semibold text-[#806b61] transition hover:bg-[#eadbd0] hover:text-[#431B1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:opacity-50"
                          >
                            {actor.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </div>

              <div className="mt-7 overflow-x-auto pb-2">
                <div className="flex min-w-max items-center gap-3 px-3">
                  {sortedActors.map((actor) => {
                    const isActive = actor.actor_id === selectedActor.actor_id;

                    return (
                      <button
                        key={actor.actor_id}
                        type="button"
                        onClick={() => setSelectedActorId(actor.actor_id)}
                        className={[
                          'grid h-[92px] w-[190px] shrink-0 grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-[6px] border bg-[#efe6de] p-2 text-left text-[#2d1715] shadow-[0_14px_32px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                          isActive
                            ? 'border-[#fff8ef] ring-2 ring-[#fff8ef]/55'
                            : actor.is_new
                              ? 'border-[#e8ddd2]/70'
                              : 'border-[#DF8181]/80',
                        ].join(' ')}
                      >
                        <div className="relative overflow-hidden rounded-[3px] bg-[#aa9d91]">
                          <img
                            src={actor.thumbnail_url}
                            alt={`${getActorDisplayName(actor)} 썸네일`}
                            className="h-full w-full object-cover opacity-80 grayscale"
                          />
                        </div>

                        <div className="flex min-w-0 flex-col justify-center">
                          <div className="h-5 rounded-[5px] border border-[#b8aca3] bg-white/34" />
                          <p className="mt-2 truncate text-[11px] font-bold text-[#806b61]">
                            {getActorDisplayName(actor)}
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold text-[#806b61]/62">
                            {actor.is_new ? '미매칭' : '매칭됨'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center">
                <p className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-[#eee7dc]/72 backdrop-blur-md">
                  {mappedCount}/{videoActors.length}명 매칭됨
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm font-semibold text-[#eee7dc]/60">
              인식된 배우가 없습니다
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
