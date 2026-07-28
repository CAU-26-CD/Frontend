import { ChevronDown, Heart, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getLikedProjects,
  getMyProjects,
  toggleProjectLike,
} from '../apis/project';
import CardSkeleton from '../components/CardSkeleton';
import {
  CreateNewProjectForm,
  EnterCodeProjectForm,
} from '../components/project/ProjectEntryForms';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import addSign from '../images/icon/add_sign.svg';
import projectCardImage from '../images/icon/ProjectCard.svg';
import searchGradient from '../images/icon/search_gradient.svg';
import type { Project } from '../types/project';
import { getStoredUserId } from '../utils/authStorage';

type ProjectSkeletonCounts = {
  all: number;
  liked: number;
};

type ProjectActionModal = 'join' | 'create';

const EMPTY_PROJECT_SKELETON_COUNTS: ProjectSkeletonCounts = {
  all: 0,
  liked: 0,
};

const getProjectSkeletonCountsStorageKey = (userId: number) =>
  `reaction-project-skeleton-counts:${userId}`;

const normalizeProjectSkeletonCount = (value: unknown) => {
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

const readProjectSkeletonCounts = (
  userId: number | null,
): ProjectSkeletonCounts => {
  if (userId === null) {
    return EMPTY_PROJECT_SKELETON_COUNTS;
  }

  try {
    const cachedCounts = localStorage.getItem(
      getProjectSkeletonCountsStorageKey(userId),
    );

    if (!cachedCounts) {
      return EMPTY_PROJECT_SKELETON_COUNTS;
    }

    const parsedCounts = JSON.parse(
      cachedCounts,
    ) as Partial<ProjectSkeletonCounts>;

    return {
      all: normalizeProjectSkeletonCount(parsedCounts.all),
      liked: normalizeProjectSkeletonCount(parsedCounts.liked),
    };
  } catch {
    return EMPTY_PROJECT_SKELETON_COUNTS;
  }
};

const getProjectSkeletonCounts = (
  projects: Project[],
): ProjectSkeletonCounts => ({
  all: projects.length,
  liked: projects.filter((project) => project.liked).length,
});

const saveProjectSkeletonCounts = (
  userId: number,
  counts: ProjectSkeletonCounts,
) => {
  localStorage.setItem(
    getProjectSkeletonCountsStorageKey(userId),
    JSON.stringify(counts),
  );
};

function ProjectTile({
  project,
  onToggleLiked,
  isLikePending,
}: {
  project: Project;
  onToggleLiked: (projectId: number) => void;
  isLikePending: boolean;
}) {
  return (
    <article className="group w-full max-w-[236px]">
      <div className="relative">
        <Link
          to={`/project/${project.id}/workspace`}
          className="relative flex aspect-[236/114] w-full items-center justify-center overflow-hidden text-[#17100f] outline-none transition duration-300 group-hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={`${project.title} 프로젝트로 이동`}
        >
          <img
            src={projectCardImage}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            aria-hidden="true"
          />
          <h3 className="relative z-10 max-w-[68%] text-center text-[15px] font-semibold leading-tight">
            {project.title}
          </h3>
        </Link>

        <button
          type="button"
          onClick={() => onToggleLiked(project.id)}
          disabled={isLikePending}
          className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-[#1b0708]/35 text-white opacity-0 transition hover:bg-[#1b0708]/55 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-60 group-hover:opacity-100"
          aria-label={project.liked ? '좋아요 해제' : '좋아요 설정'}
        >
          <Heart
            size={14}
            fill={project.liked ? '#ffffff' : 'none'}
            strokeWidth={2.4}
          />
        </button>
      </div>

      <p className="mt-2 truncate text-center text-[10px] font-medium text-[#b4aca4]">
        {project.description ?? project.date}
      </p>
    </article>
  );
}

function ProjectActionDialog({
  mode,
  onClose,
  onJoined,
}: {
  mode: ProjectActionModal;
  onClose: () => void;
  onJoined: () => void;
}) {
  return (
    <div
      className="reaction-ui-font fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="relative flex w-full justify-center"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="fixed right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-[#efe6de]/20 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="모달 닫기"
        >
          <X size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>

        {mode === 'join' ? (
          <EnterCodeProjectForm onJoined={onJoined} />
        ) : (
          <CreateNewProjectForm />
        )}
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [skeletonCounts, setSkeletonCounts] =
    useState<ProjectSkeletonCounts>(() =>
      readProjectSkeletonCounts(getStoredUserId()),
    );
  const [pendingLikeProjectIds, setPendingLikeProjectIds] = useState<
    number[]
  >([]);
  const [activeProjectAction, setActiveProjectAction] =
    useState<ProjectActionModal | null>(null);

  const loadProjects = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoadingProjects(true);
      }

      try {
        const storedUserId = getStoredUserId();

        if (storedUserId === null) {
          navigate('/login');
          return;
        }

        setUserId(storedUserId);
        setSkeletonCounts(readProjectSkeletonCounts(storedUserId));

        const [myProjects, likedProjects] = await Promise.all([
          getMyProjects(storedUserId),
          getLikedProjects(storedUserId),
        ]);
        const likedProjectIds = new Set(
          likedProjects.map((project) => project.project_id),
        );

        const nextProjects = myProjects.map((project) => ({
          id: project.project_id,
          title: project.title,
          date: project.created_at,
          description: project.description,
          liked: likedProjectIds.has(project.project_id),
        }));
        const nextSkeletonCounts = getProjectSkeletonCounts(nextProjects);

        setProjects(nextProjects);
        setSkeletonCounts(nextSkeletonCounts);
        saveProjectSkeletonCounts(storedUserId, nextSkeletonCounts);
      } catch (error) {
        console.error('Failed to load projects', error);
      } finally {
        if (showLoading) {
          setIsLoadingProjects(false);
        }
      }
    },
    [navigate],
  );

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    if (!keyword) {
      return projects;
    }

    return projects.filter((project) => {
      const searchableText = `${project.title} ${project.description ?? ''}`;
      return searchableText.toLowerCase().includes(keyword);
    });
  }, [projects, searchValue]);

  const likedProjects = filteredProjects.filter((project) => project.liked);
  const allProjects = filteredProjects;
  const displayedLikedCount = isLoadingProjects
    ? skeletonCounts.liked
    : likedProjects.length;
  const displayedAllCount = isLoadingProjects
    ? skeletonCounts.all
    : allProjects.length;

  useEffect(() => {
    if (userId === null || isLoadingProjects) {
      return;
    }

    const nextSkeletonCounts = getProjectSkeletonCounts(projects);

    setSkeletonCounts((currentCounts) =>
      currentCounts.all === nextSkeletonCounts.all &&
      currentCounts.liked === nextSkeletonCounts.liked
        ? currentCounts
        : nextSkeletonCounts,
    );
    saveProjectSkeletonCounts(userId, nextSkeletonCounts);
  }, [isLoadingProjects, projects, userId]);

  const handleToggleLiked = async (projectId: number) => {
    if (userId === null || pendingLikeProjectIds.includes(projectId)) {
      return;
    }

    const previousProjects = projects;

    setPendingLikeProjectIds((current) => [...current, projectId]);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId
          ? { ...project, liked: !project.liked }
          : project,
      ),
    );

    try {
      const response = await toggleProjectLike(projectId, userId);

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === projectId
            ? { ...project, liked: response.liked }
            : project,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle project like', error);
      setProjects(previousProjects);
    } finally {
      setPendingLikeProjectIds((current) =>
        current.filter((pendingProjectId) => pendingProjectId !== projectId),
      );
    }
  };

  const handleJoinedProject = () => {
    setActiveProjectAction(null);
    void loadProjects(false);
  };

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader align="left" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-10 pb-20 pt-[154px]">
        <div className="absolute right-[86px] top-12 flex items-center gap-5">
          <label className="relative block h-[31px] w-[160px] sm:w-[220px]">
            <span className="sr-only">프로젝트 검색</span>
            <img
              src={searchGradient}
              alt=""
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            />
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#17100f]"
            />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="reaction-ui-font relative z-10 h-full w-full bg-transparent pl-10 pr-4 text-[12px] font-semibold text-[#17100f] outline-none placeholder:text-[#17100f]/60"
              placeholder="Search"
            />
          </label>

          <div className="group relative">
            <button
              type="button"
              className="flex h-[39px] w-[39px] items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="프로젝트 추가 메뉴"
            >
              <img
                src={addSign}
                alt=""
                className="h-full w-full transition duration-300 group-hover:rotate-90 group-focus-within:rotate-90"
              />
            </button>

            <div className="pointer-events-none absolute right-0 top-full z-30 w-[176px] translate-y-1 pt-2 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="overflow-hidden rounded-[8px] border border-white/35 bg-[#efe6de]/92 py-1.5 text-[#2d1715] shadow-[0_16px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setActiveProjectAction('join')}
                  className="reaction-ui-font block h-10 w-full px-4 text-left text-[12px] font-bold transition hover:bg-[#6f5752]/14 focus:bg-[#6f5752]/14 focus:outline-none"
                >
                  프로젝트에 참가하기
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProjectAction('create')}
                  className="reaction-ui-font block h-10 w-full px-4 text-left text-[12px] font-bold transition hover:bg-[#6f5752]/14 focus:bg-[#6f5752]/14 focus:outline-none"
                >
                  새 프로젝트 생성
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <Heart size={14} fill="#ffffff" strokeWidth={2.5} />
            <h2 className="reaction-ui-font text-[15px] font-bold">
              Liked ({displayedLikedCount})
            </h2>
          </div>

          <div className="min-h-[150px]">
            {isLoadingProjects ? (
              <CardSkeleton count={skeletonCounts.liked} />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,236px))] gap-x-5 gap-y-6">
                {likedProjects.map((project) => (
                  <ProjectTile
                    key={project.id}
                    project={project}
                    onToggleLiked={handleToggleLiked}
                    isLikePending={pendingLikeProjectIds.includes(project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-[8px] w-[8px] rounded-full bg-white" />
              <h2 className="reaction-ui-font text-[15px] font-bold">
                All ({displayedAllCount})
              </h2>
            </div>

            <button
              type="button"
              className="reaction-ui-font flex h-[28px] items-center gap-2 rounded-full border border-white/70 px-4 text-[12px] font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Latest
              <ChevronDown size={15} fill="#ffffff" />
            </button>
          </div>

          {isLoadingProjects ? (
            <CardSkeleton count={skeletonCounts.all} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,236px))] gap-x-5 gap-y-6">
              {allProjects.map((project) => (
                <ProjectTile
                  key={project.id}
                  project={project}
                  onToggleLiked={handleToggleLiked}
                  isLikePending={pendingLikeProjectIds.includes(project.id)}
                />
              ))}
            </div>
          )}

          {!isLoadingProjects && allProjects.length === 0 && (
            <p className="reaction-ui-font mt-8 text-sm font-semibold text-[#eee7dc]/55">
              표시할 프로젝트가 없습니다.
            </p>
          )}
        </section>
      </div>

      {activeProjectAction && (
        <ProjectActionDialog
          mode={activeProjectAction}
          onClose={() => setActiveProjectAction(null)}
          onJoined={handleJoinedProject}
        />
      )}
    </main>
  );
}
