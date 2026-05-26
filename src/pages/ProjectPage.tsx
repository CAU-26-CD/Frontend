import { ChevronDown, Heart, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getLikedProjects,
  getMyProjects,
  toggleProjectLike,
} from '../apis/project';
import CardSkeleton from '../components/CardSkeleton';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import addSign from '../images/icon/add_sign.svg';
import projectCardImage from '../images/icon/ProjectCard.svg';
import searchGradient from '../images/icon/search_gradient.svg';
import type { Project } from '../types/project';
import { getStoredUserId } from '../utils/authStorage';

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

export default function ProjectPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [pendingLikeProjectIds, setPendingLikeProjectIds] = useState<
    number[]
  >([]);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoadingProjects(true);

      try {
        const storedUserId = getStoredUserId();

        if (storedUserId === null) {
          navigate('/login');
          return;
        }

        setUserId(storedUserId);

        const [myProjects, likedProjects] = await Promise.all([
          getMyProjects(storedUserId),
          getLikedProjects(storedUserId),
        ]);
        const likedProjectIds = new Set(
          likedProjects.map((project) => project.project_id),
        );

        setProjects(
          myProjects.map((project) => ({
            id: project.project_id,
            title: project.title,
            date: project.created_at,
            description: project.description,
            liked: likedProjectIds.has(project.project_id),
          })),
        );
      } catch (error) {
        console.error('Failed to load projects', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    void loadProjects();
  }, [navigate]);

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

          <Link
            to="/project/new"
            className="flex h-[39px] w-[39px] items-center justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="프로젝트 추가"
          >
            <img src={addSign} alt="" className="h-full w-full" />
          </Link>
        </div>

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <Heart size={14} fill="#ffffff" strokeWidth={2.5} />
            <h2 className="reaction-ui-font text-[15px] font-bold">
              Liked ({likedProjects.length})
            </h2>
          </div>

          <div className="min-h-[150px]">
            {isLoadingProjects ? (
              <CardSkeleton count={2} />
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
                All ({allProjects.length})
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
            <CardSkeleton count={8} />
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
    </main>
  );
}
