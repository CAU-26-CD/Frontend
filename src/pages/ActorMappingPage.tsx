import { Trash2, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { deleteActor, listProjectActors, mergeActorInto } from '../apis/actor';
import {
  classifySessionFeedbacks,
  waitForPendingFeedbackCreates,
} from '../apis/feedback';
import {
  completeProjectSession,
  getProjectSessions,
  getSessionVideoMatching,
  type SessionVideoActor,
} from '../apis/session';
import LoadingSpinner from '../components/LoadingSpinner';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import type { Actor } from '../types/feedback';
import { getStoredUserId } from '../utils/authStorage';
import {
  getSessionOwnerId,
  getStoredSessionOwnerId,
  saveSessionOwnerId,
} from '../utils/sessionOwner';

const getActorDisplayName = (actor: SessionVideoActor) =>
  actor.name ?? `배우 ${actor.actor_id}`;
const ANALYSIS_POLL_INTERVAL_MS = 2000;
const pendingAnalysisStatuses = new Set(['pending', 'uploading', 'processing']);
const compareSessionVideoActors = (
  a: SessionVideoActor,
  b: SessionVideoActor,
) => {
  const aMapped = a.is_new ? 1 : 0;
  const bMapped = b.is_new ? 1 : 0;

  return aMapped - bMapped || a.actor_id - b.actor_id;
};

type ActorMappingRouteState = {
  projectSessionTitle?: string;
  sessionOwnerId?: number;
  allowActorMapping?: boolean;
};

export default function ActorMappingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as ActorMappingRouteState | null;
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const numericProjectId = Number(projectId);
  const numericSessionId = Number(sessionId);
  const [videoActors, setVideoActors] = useState<SessionVideoActor[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [deletingActorId, setDeletingActorId] = useState<number | null>(null);
  const [isClassifyingFeedbacks, setIsClassifyingFeedbacks] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [videoActorsError, setVideoActorsError] = useState<string | null>(null);
  const [actorActionError, setActorActionError] = useState<string | null>(null);
  const [projectActors, setProjectActors] = useState<Actor[]>([]);
  const [projectActorsError, setProjectActorsError] = useState<string | null>(
    null,
  );
  const [feedbackClassifyError, setFeedbackClassifyError] = useState<
    string | null
  >(null);
  const currentUserId = getStoredUserId();
  const [sessionOwnerId, setSessionOwnerId] = useState<number | null>(() => {
    if (routeState?.sessionOwnerId) {
      return routeState.sessionOwnerId;
    }

    return Number.isNaN(numericSessionId)
      ? null
      : getStoredSessionOwnerId(numericSessionId);
  });
  const [isCheckingSessionOwner, setIsCheckingSessionOwner] = useState(true);
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;
  const sessionTitle =
    routeState?.projectSessionTitle ??
    (Number.isNaN(numericSessionId)
      ? 'Session'
      : `Session ${numericSessionId}`);
  const isSessionOwner =
    currentUserId !== null && sessionOwnerId === currentUserId;
  const selectedActor =
    videoActors.find((actor) => actor.actor_id === selectedActorId) ??
    videoActors[0] ??
    null;
  const mappedCount = videoActors.filter((actor) => !actor.is_new).length;
  const sortedActors = useMemo(
    () => [...videoActors].sort(compareSessionVideoActors),
    [videoActors],
  );
  const isWaitingForAnalysis =
    isLoading || pendingAnalysisStatuses.has(analysisStatus);
  const hasAnalysisFailed = analysisStatus === 'failed';

  useEffect(() => {
    if (Number.isNaN(numericProjectId) || Number.isNaN(numericSessionId)) {
      setIsCheckingSessionOwner(false);
      return;
    }

    let ignore = false;

    const loadSessionOwner = async () => {
      setIsCheckingSessionOwner(true);

      try {
        const sessions = await getProjectSessions(numericProjectId);
        const matchedSession = sessions.find(
          (session) => session.session_id === numericSessionId,
        );
        const nextOwnerId =
          getSessionOwnerId(matchedSession) ??
          routeState?.sessionOwnerId ??
          getStoredSessionOwnerId(numericSessionId);

        if (ignore) return;

        if (nextOwnerId !== null) {
          setSessionOwnerId(nextOwnerId);
          saveSessionOwnerId(numericSessionId, nextOwnerId);
        }

        if (
          matchedSession?.in_progress === false &&
          !routeState?.allowActorMapping
        ) {
          navigate(
            `/project/${numericProjectId}/workspace/${numericSessionId}/review`,
            {
              replace: true,
            },
          );
        }
      } catch (error) {
        console.error('Failed to load session owner', error);
      } finally {
        if (!ignore) {
          setIsCheckingSessionOwner(false);
        }
      }
    };

    void loadSessionOwner();

    return () => {
      ignore = true;
    };
  }, [
    navigate,
    numericProjectId,
    numericSessionId,
    routeState?.allowActorMapping,
    routeState?.sessionOwnerId,
  ]);

  useEffect(() => {
    if (isCheckingSessionOwner || sessionOwnerId === null || isSessionOwner) {
      return;
    }

    navigate(
      `/project/${numericProjectId}/workspace/${numericSessionId}/actors/waiting`,
      {
        replace: true,
        state: {
          projectSessionTitle: sessionTitle,
        },
      },
    );
  }, [
    isCheckingSessionOwner,
    isSessionOwner,
    navigate,
    numericProjectId,
    numericSessionId,
    sessionOwnerId,
    sessionTitle,
  ]);

  useEffect(() => {
    if (Number.isNaN(numericProjectId) || !isSessionOwner) {
      setProjectActors([]);
      return;
    }

    let ignore = false;

    const loadProjectActors = async () => {
      setProjectActorsError(null);

      try {
        const nextActors = await listProjectActors(numericProjectId);

        if (!ignore) {
          setProjectActors(nextActors);
        }
      } catch (error) {
        console.error('Failed to load project actors', error);

        if (!ignore) {
          setProjectActors([]);
          setProjectActorsError('프로젝트 배우 목록을 불러오지 못했습니다.');
        }
      }
    };

    void loadProjectActors();

    return () => {
      ignore = true;
    };
  }, [isSessionOwner, numericProjectId]);

  useEffect(() => {
    if (
      Number.isNaN(numericSessionId) ||
      !isSessionOwner ||
      currentUserId === null
    ) {
      setIsLoading(false);
      return;
    }

    let ignore = false;
    let pollTimeoutId: number | undefined;

    const scheduleNextPoll = () => {
      if (pollTimeoutId !== undefined) {
        window.clearTimeout(pollTimeoutId);
      }

      pollTimeoutId = window.setTimeout(
        () => void loadVideoActors(),
        ANALYSIS_POLL_INTERVAL_MS,
      );
    };

    const loadVideoActors = async () => {
      setIsLoading(true);

      try {
        const video = await getSessionVideoMatching(
          numericSessionId,
          currentUserId,
        );

        if (ignore) return;

        const nextAnalysisStatus = video.analysis_status.toLowerCase();

        setAnalysisStatus(nextAnalysisStatus);
        setVideoActors(video.actors);
        setSelectedActorId(
          (currentSelectedActorId) =>
            currentSelectedActorId ?? video.actors[0]?.actor_id ?? null,
        );
        setVideoActorsError(null);

        if (pendingAnalysisStatuses.has(nextAnalysisStatus)) {
          scheduleNextPoll();
        }
      } catch (error) {
        console.error('Failed to load video actors', error);
        setVideoActorsError('배우 인식 결과를 불러오지 못했습니다.');

        scheduleNextPoll();
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadVideoActors();

    return () => {
      ignore = true;
      if (pollTimeoutId !== undefined) {
        window.clearTimeout(pollTimeoutId);
      }
    };
  }, [currentUserId, isSessionOwner, numericSessionId]);

  useEffect(() => {
    if (Number.isNaN(numericSessionId) || !isSessionOwner) {
      return;
    }

    let ignore = false;

    const classifyFeedbacks = async () => {
      setIsClassifyingFeedbacks(true);
      setFeedbackClassifyError(null);

      try {
        await waitForPendingFeedbackCreates(numericSessionId);
        await classifySessionFeedbacks(numericSessionId);

        if (!ignore) {
          setFeedbackClassifyError(null);
        }
      } catch (error) {
        console.error('Failed to classify session feedbacks', error);

        if (!ignore) {
          setFeedbackClassifyError('피드백 태그 분석 요청에 실패했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsClassifyingFeedbacks(false);
        }
      }
    };

    void classifyFeedbacks();

    return () => {
      ignore = true;
    };
  }, [isSessionOwner, numericSessionId]);

  const handleMapToProjectActor = async (targetActorId: number) => {
    if (!selectedActor || isSaving || deletingActorId !== null) {
      return;
    }

    const targetActor = projectActors.find(
      (actor) => actor.id === targetActorId,
    );

    if (!targetActor) {
      return;
    }

    setIsSaving(true);
    setActorActionError(null);

    try {
      if (selectedActor.actor_id !== targetActorId) {
        await mergeActorInto(selectedActor.actor_id, {
          target_actor_id: targetActorId,
        });
      }

      setVideoActors((current) =>
        current.some(
          (actor) =>
            actor.actor_id === targetActor.id &&
            actor.actor_id !== selectedActor.actor_id,
        )
          ? current.filter((actor) => actor.actor_id !== selectedActor.actor_id)
          : current.map((actor) =>
              actor.actor_id === selectedActor.actor_id
                ? {
                    ...actor,
                    actor_id: targetActor.id,
                    name: targetActor.name,
                    is_new: false,
                  }
                : actor,
            ),
      );
      setSelectedActorId(targetActorId);
    } catch (error) {
      console.error('Failed to map actor', error);
      setActorActionError('배우 매칭에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSelectedActor = async () => {
    if (!selectedActor || isSaving || deletingActorId !== null) {
      return;
    }

    if (!selectedActor.is_new) {
      setActorActionError('이미 매칭된 배우는 이 화면에서 삭제할 수 없습니다.');
      return;
    }

    const actorToDelete = selectedActor;
    const shouldDelete = window.confirm(
      `${getActorDisplayName(actorToDelete)} 인식 결과를 삭제할까요?`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingActorId(actorToDelete.actor_id);
    setActorActionError(null);

    try {
      await deleteActor(actorToDelete.actor_id);

      const remainingActors = videoActors.filter(
        (actor) => actor.actor_id !== actorToDelete.actor_id,
      );
      const remainingSortedActors = [...remainingActors].sort(
        compareSessionVideoActors,
      );
      const currentIndex = sortedActors.findIndex(
        (actor) => actor.actor_id === actorToDelete.actor_id,
      );
      const nextActorId =
        remainingSortedActors[
          Math.min(Math.max(currentIndex, 0), remainingSortedActors.length - 1)
        ]?.actor_id ?? null;

      setVideoActors(remainingActors);
      setSelectedActorId(nextActorId);
    } catch (error) {
      console.error('Failed to delete actor', error);
      setActorActionError('배우 인식 결과를 삭제하지 못했습니다.');
    } finally {
      setDeletingActorId(null);
    }
  };

  const handleComplete = async () => {
    if (
      Number.isNaN(numericProjectId) ||
      Number.isNaN(numericSessionId) ||
      isCompleting
    ) {
      return;
    }

    setIsCompleting(true);
    setActorActionError(null);

    try {
      await completeProjectSession(numericProjectId, numericSessionId);
      navigate(
        `/project/${numericProjectId}/workspace/${numericSessionId}/review`,
      );
    } catch (error) {
      console.error('Failed to complete session matching', error);
      setActorActionError('매칭 완료 상태를 저장하지 못했습니다.');
    } finally {
      setIsCompleting(false);
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
            onClick={() => {
              void handleComplete();
            }}
            disabled={
              isCheckingSessionOwner ||
              !isSessionOwner ||
              isWaitingForAnalysis ||
              isClassifyingFeedbacks ||
              isCompleting ||
              deletingActorId !== null ||
              Boolean(videoActorsError)
            }
            className="reaction-glass-pill h-8 rounded-full px-4 text-xs font-bold text-[#fff8ef] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100"
          >
            {isCompleting
              ? '완료 중...'
              : isClassifyingFeedbacks
                ? '태그 분석중...'
                : '매칭 완료'}
          </button>
        </div>

        {(feedbackClassifyError || projectActorsError || actorActionError) && (
          <p className="reaction-ui-font mt-4 text-right text-xs font-semibold text-[#ffb4a8]">
            {actorActionError ?? feedbackClassifyError ?? projectActorsError}
          </p>
        )}

        <section className="reaction-ui-font flex flex-1 flex-col pt-10">
          {!isWaitingForAnalysis && (
            <div className="text-center">
              <h1 className="text-[clamp(1.25rem,2vw,1.7rem)] font-semibold text-[#f6eee4]">
                {videoActors.length}명의 배우를 인식했습니다. 태그를
                매칭해주세요.
              </h1>
            </div>
          )}

          {isCheckingSessionOwner ? (
            <LoadingSpinner
              label="세션 권한을 확인하는 중입니다"
              className="flex-1"
              size="lg"
            />
          ) : !isSessionOwner ? (
            <LoadingSpinner
              label="세션의 소유자가 배우 태그를 매칭중입니다."
              className="flex-1"
              size="lg"
            />
          ) : isWaitingForAnalysis ? (
            <LoadingSpinner
              label="배우 인식 결과를 분석하는 중입니다"
              className="flex-1"
              size="lg"
            />
          ) : hasAnalysisFailed ? (
            <div className="flex flex-1 items-center justify-center text-sm font-semibold text-[#eee7dc]/60">
              영상 분석에 실패했습니다
            </div>
          ) : videoActorsError && !selectedActor ? (
            <div className="flex flex-1 items-center justify-center text-sm font-semibold text-[#eee7dc]/60">
              {videoActorsError}
            </div>
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
                    <div className="rounded-[8px] border border-[#b8aca3] bg-white/36 px-3 py-2 text-center text-sm font-semibold text-[#431B1B]">
                      {selectedActor.is_new
                        ? '매칭할 배우를 선택해 주세요'
                        : `${getActorDisplayName(selectedActor)} 매칭됨`}
                    </div>

                    <button
                      type="button"
                      onClick={handleDeleteSelectedActor}
                      disabled={
                        isSaving ||
                        deletingActorId !== null ||
                        !selectedActor.is_new
                      }
                      className="flex min-h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#b75050]/45 bg-[#f5eee6] px-3 text-xs font-bold text-[#9b2f2f] transition hover:border-[#b75050]/70 hover:bg-[#f0dbd5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b75050]/30 disabled:cursor-not-allowed disabled:border-[#c8b7aa] disabled:text-[#806b61]/45 disabled:hover:bg-[#f5eee6]"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      {deletingActorId === selectedActor.actor_id
                        ? '삭제 중...'
                        : selectedActor.is_new
                          ? '인식 결과 삭제'
                          : '매칭된 배우 삭제 불가'}
                    </button>

                    {projectActors.length > 0 ? (
                      <div className="flex max-h-48 flex-col overflow-y-auto rounded-[8px] border border-[#c8b7aa] bg-[#f5eee6]">
                        {projectActors.map((actor) => {
                          const isMappedToSelected =
                            selectedActor.actor_id === actor.id &&
                            !selectedActor.is_new;

                          return (
                            <button
                              key={actor.id}
                              type="button"
                              onClick={() => handleMapToProjectActor(actor.id)}
                              disabled={
                                isSaving ||
                                deletingActorId !== null ||
                                isMappedToSelected
                              }
                              className={[
                                'flex min-h-9 items-center justify-center gap-1.5 px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30 disabled:cursor-not-allowed',
                                isMappedToSelected
                                  ? 'bg-[#6f5752] text-[#fff8ef]'
                                  : 'text-[#806b61] hover:bg-[#eadbd0] hover:text-[#431B1B] disabled:opacity-50',
                              ].join(' ')}
                            >
                              {isMappedToSelected ? '선택됨 · ' : ''}
                              {actor.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[8px] border border-[#c8b7aa] bg-[#f5eee6] px-3 py-4 text-center text-xs font-semibold text-[#806b61]">
                        프로젝트에 등록된 배우가 없습니다.
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
                        onClick={() => {
                          setSelectedActorId(actor.actor_id);
                          setActorActionError(null);
                        }}
                        disabled={deletingActorId !== null}
                        className={[
                          'grid h-[92px] w-[190px] shrink-0 grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-[6px] border bg-[#efe6de] p-2 text-left text-[#2d1715] shadow-[0_14px_32px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
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
