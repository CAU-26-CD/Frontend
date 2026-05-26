import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProjectSessions, getRehearsalSessionStatus } from '../apis/session';
import CardSkeleton from '../components/CardSkeleton';
import FeedbackSessionCard from '../components/FeedbackSessionCard';
import Sidebar from '../components/sidebar/Sidebar';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import type { FeedbackSession } from '../types/feedback';

const sessionCategories = ['장면별 연습', '런쓰루', '워크쓰루', '텐투텐'] as const;

type SessionCategory = (typeof sessionCategories)[number];

const normalizeSessionCategory = (category: string) => category.trim();

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const numericProjectId = Number(projectId);
  const [feedbackSessions, setFeedbackSessions] = useState<FeedbackSession[]>(
    [],
  );
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<SessionCategory | null>(null);
  const projectTitle = Number.isNaN(numericProjectId)
    ? 'Project'
    : `Project ${numericProjectId}`;

  useEffect(() => {
    if (Number.isNaN(numericProjectId)) return;

    let ignore = false;

    const loadSessions = async (showLoading = false) => {
      if (showLoading && !ignore) {
        setIsLoadingSessions(true);
      }

      try {
        const sessions = await getProjectSessions(numericProjectId);
        const rehearsalStatuses = await Promise.all(
          sessions.map(async (session) => {
            if (!session.in_progress) {
              return [session.session_id, false] as const;
            }

            try {
              const status = await getRehearsalSessionStatus(
                session.session_id,
              );

              return [session.session_id, status.started] as const;
            } catch (error) {
              console.error('Failed to load rehearsal status', error);

              return [session.session_id, false] as const;
            }
          }),
        );
        const startedSessionIds = new Map(rehearsalStatuses);

        if (ignore) {
          return;
        }

        setFeedbackSessions(
          sessions.map((session) => ({
            id: session.session_id,
            projectId: session.project_id,
            title: session.title,
            category: normalizeSessionCategory(session.s_category),
            date: session.created_at,
            status: session.in_progress ? 'inProgress' : 'completed',
            isRehearsalStarted:
              session.in_progress &&
              (startedSessionIds.get(session.session_id) ?? false),
          })),
        );
      } catch (error) {
        console.error('Failed to load sessions', error);
      } finally {
        if (!ignore) {
          setIsLoadingSessions(false);
        }
      }
    };

    void loadSessions(true);

    const intervalId = window.setInterval(() => {
      void loadSessions();
    }, 5000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [numericProjectId]);

  const filteredSessions = selectedCategory
    ? feedbackSessions.filter(
        (session) =>
          session.category !== undefined &&
          normalizeSessionCategory(session.category) === selectedCategory,
      )
    : feedbackSessions;

  const inProgressSessions = filteredSessions.filter(
    (session) => session.status === 'inProgress',
  );

  const completedSessions = filteredSessions.filter(
    (session) => session.status !== 'inProgress',
  );

  const sessionCategoryCounts = useMemo(
    () =>
      sessionCategories.reduce<Record<SessionCategory, number>>(
        (counts, category) => {
          counts[category] = feedbackSessions.filter(
            (session) =>
              session.category !== undefined &&
              normalizeSessionCategory(session.category) === category,
          ).length;

          return counts;
        },
        {
          '장면별 연습': 0,
          런쓰루: 0,
          워크쓰루: 0,
          텐투텐: 0,
        },
      ),
    [feedbackSessions],
  );

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader align="left" />
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 min-h-screen w-full pl-12">
        <Sidebar />

        <div className="min-w-0 flex-1 px-3 pb-8 pt-28 sm:px-5 lg:px-8">
          <p className="reaction-ui-font px-2 text-s font-semibold text-[#bcb2aa] sm:px-4">
            My Projects / {projectTitle}
          </p>

          <div className="grid min-h-[calc(100vh-clamp(164px,22vh,212px))] grid-cols-1 gap-y-6 md:grid-cols-[minmax(104px,12vw)_minmax(0,1fr)]">
            <aside className="px-2 py-3 sm:px-4 md:py-5">
              <h2 className="mb-2 text-xs font-bold underline underline-offset-4">
                CATEGORY
              </h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#eee7dc] md:block md:space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    aria-pressed={selectedCategory === null}
                    className={[
                      'block w-max cursor-pointer rounded-[3px] px-1 py-0.5 text-left transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                      selectedCategory === null
                        ? 'bg-white/10 text-white underline underline-offset-4'
                        : '',
                    ].join(' ')}
                  >
                    ㄴ 전체 ({feedbackSessions.length})
                  </button>
                </li>
                {sessionCategories.map((category) => {
                  const isSelected = selectedCategory === category;

                  return (
                    <li key={category}>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        aria-pressed={isSelected}
                        className={[
                          'block w-max cursor-pointer rounded-[3px] px-1 py-0.5 text-left transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                          isSelected
                            ? 'bg-white/10 text-white underline underline-offset-4'
                            : '',
                        ].join(' ')}
                      >
                        ㄴ {category} ({sessionCategoryCounts[category]})
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div className="min-w-0">
              <section className="px-2 py-3 sm:px-4 md:px-6 md:py-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#b4b5b3]" />
                  <h2 className="text-sm font-semibold text-[#bdb6af]">
                    In Progress (
                    {isLoadingSessions ? '-' : inProgressSessions.length})
                  </h2>
                </div>

                {isLoadingSessions ? (
                  <CardSkeleton count={2} />
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,236px))] gap-x-5 gap-y-6">
                    {inProgressSessions.map((session) => (
                      <FeedbackSessionCard
                        key={session.id}
                        projectId={numericProjectId}
                        session={session}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="px-2 py-3 sm:px-4 md:px-6 md:py-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[#bdb6af]">
                    ALL ({isLoadingSessions ? '-' : completedSessions.length})
                  </h2>

                  <button className="flex h-7 items-center gap-2 rounded border border-white/25 px-3 text-xs text-[#d6cec6] transition hover:border-white/45 hover:text-white">
                    Latest
                    <ChevronDown size={13} />
                  </button>
                </div>

                {isLoadingSessions ? (
                  <CardSkeleton count={6} />
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,236px))] gap-x-5 gap-y-6">
                    {completedSessions.map((session) => (
                      <FeedbackSessionCard
                        key={session.id}
                        projectId={numericProjectId}
                        session={session}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
