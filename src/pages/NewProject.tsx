import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProjectActor } from '../apis/actor';
import { createProject, joinProject } from '../apis/project';
import CreateActorModal from '../components/modals/CreateActorModal';
import DesignedHeader from '../components/sidebar/DesignedHeader';
import { saveProjectActor } from '../data/actors';
import createProjectCard from '../images/icon/create-project-card.svg';
import loginCard from '../images/icon/loginCard.svg';
import type { ProjectResponse } from '../apis/project';
import type { CreateProjectForm, JoinProjectForm } from '../types/project';

const initialJoinForm: JoinProjectForm = {
  code: '',
};

const initialCreateForm: CreateProjectForm = {
  name: '',
  description: '',
  joinCode: '',
};

export default function NewProject() {
  const navigate = useNavigate();
  const [joinForm, setJoinForm] = useState<JoinProjectForm>(initialJoinForm);
  const [createForm, setCreateForm] =
    useState<CreateProjectForm>(initialCreateForm);
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createdProject, setCreatedProject] = useState<ProjectResponse | null>(
    null,
  );
  const [isCreatingActor, setIsCreatingActor] = useState(false);
  const [actorCreateError, setActorCreateError] = useState<string | null>(null);

  const handleJoinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!joinForm.code.trim() || isJoiningProject) {
      return;
    }

    setIsJoiningProject(true);

    try {
      const project = await joinProject({
        join_code: joinForm.code.trim().toUpperCase(),
      });

      navigate(`/project/${project.project_id}/workspace`);
    } catch (error) {
      console.error('Failed to join project', error);
    } finally {
      setIsJoiningProject(false);
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !createForm.name.trim() ||
      !createForm.description.trim() ||
      !createForm.joinCode.trim() ||
      isCreatingProject
    ) {
      return;
    }

    setIsCreatingProject(true);

    try {
      const project = await createProject({
        title: createForm.name.trim(),
        description: createForm.description.trim(),
        join_code: createForm.joinCode.trim().toUpperCase(),
      });

      setCreatedProject(project);
      setActorCreateError(null);
    } catch (error) {
      console.error('Failed to create project', error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleActorSubmit = async (names: string[]) => {
    if (!createdProject || isCreatingActor) {
      return;
    }

    setIsCreatingActor(true);

    try {
      const createdActors = await Promise.all(
        names.map((name) =>
          createProjectActor(createdProject.project_id, {
            name,
          }),
        ),
      );

      createdActors.forEach((actor, index) => {
        saveProjectActor(createdProject.project_id, {
          id: actor.actor_id,
          name: actor.name,
          shortcut: String(index + 1),
        });
      });

      navigate(`/project/${createdProject.project_id}/workspace`);
    } catch (error) {
      console.error('Failed to create actor', error);
      setActorCreateError('배우를 등록하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setIsCreatingActor(false);
    }
  };

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-12 px-8 pb-16 pt-[118px] md:flex-row md:gap-24">
        <form
          onSubmit={handleJoinSubmit}
          noValidate
          className="reaction-login-card relative flex h-[303px] w-full max-w-[362px] flex-col px-[34px] pb-[30px] pt-[55px] text-center text-[#17100f]"
        >
          <img
            src={loginCard}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            aria-hidden="true"
          />

          <h1 className="reaction-logo-font relative z-10 text-[31px] leading-[0.98] text-[#1d1513]">
            ENTER
            <span className="mt-2 block">JOIN CODE</span>
          </h1>

          <div className="relative z-10 mt-auto space-y-[10px]">
            <label className="sr-only" htmlFor="join-code">
              Join code
            </label>
            <input
              id="join-code"
              value={joinForm.code}
              onChange={(event) =>
                setJoinForm({ code: event.target.value.toUpperCase() })
              }
              className="reaction-login-input h-[40px] w-full rounded-full border border-white/85 bg-transparent px-5 text-center text-[11px] font-semibold text-[#2d1715] outline-none transition"
              placeholder="코드를 입력해 주세요"
              maxLength={4}
            />
            <button
              type="submit"
              disabled={isJoiningProject}
              className="reaction-ui-font h-[40px] w-full rounded-full border border-white/85 bg-[#6f5752] text-[11px] font-semibold text-[#f6eee4] transition hover:border-white hover:bg-[#5d4642] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/35"
            >
              {isJoiningProject ? 'JOINING...' : 'JOIN'}
            </button>
          </div>
        </form>

        <form
          onSubmit={handleCreateSubmit}
          noValidate
          className="reaction-login-card relative flex h-[547px] w-full max-w-[380px] flex-col px-[45px] pb-[64px] pt-[76px] text-[#17100f]"
        >
          <img
            src={createProjectCard}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            aria-hidden="true"
          />

          <h2 className="reaction-logo-font relative z-10 text-center text-[37px] leading-[0.88] text-[#1d1513]">
            CREATE
            <span className="mt-2 block text-[31px]">NEW Project</span>
          </h2>

          <div className="relative z-10 mt-[92px] space-y-[10px]">
            <label className="sr-only" htmlFor="project-name">
              Name
            </label>
            <input
              id="project-name"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((form) => ({
                  ...form,
                  name: event.target.value,
                }))
              }
              className="reaction-login-input h-[40px] w-full rounded-full border border-white/85 bg-transparent px-5 text-center text-[11px] font-semibold text-[#2d1715] outline-none transition"
              placeholder="이름 (영/한 15자 내외)"
              maxLength={15}
            />

            <label className="sr-only" htmlFor="project-description">
              Description
            </label>
            <input
              id="project-description"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((form) => ({
                  ...form,
                  description: event.target.value,
                }))
              }
              className="reaction-login-input h-[40px] w-full rounded-full border border-white/85 bg-transparent px-5 text-center text-[11px] font-semibold text-[#2d1715] outline-none transition"
              placeholder="소속 및 설명 (20자 내외)"
              maxLength={20}
            />

            <label className="sr-only" htmlFor="project-join-code">
              Join code
            </label>
            <input
              id="project-join-code"
              value={createForm.joinCode}
              onChange={(event) =>
                setCreateForm((form) => ({
                  ...form,
                  joinCode: event.target.value.toUpperCase(),
                }))
              }
              className="reaction-login-input h-[40px] w-full rounded-full border border-white/85 bg-transparent px-5 text-center text-[11px] font-semibold text-[#2d1715] outline-none transition"
              placeholder="JOIN CODE 생성"
              maxLength={4}
            />
          </div>

          <button
            type="submit"
            disabled={isCreatingProject}
            className="reaction-ui-font relative z-10 mt-auto h-[40px] w-full rounded-full border border-white/85 bg-[#6f5752] text-[11px] font-semibold text-[#f6eee4] transition hover:border-white hover:bg-[#5d4642] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/35"
          >
            {isCreatingProject ? 'CREATING...' : 'CREATE'}
          </button>
        </form>
      </section>

      {createdProject && (
        <CreateActorModal
          projectName={createdProject.title}
          isSubmitting={isCreatingActor}
          errorMessage={actorCreateError}
          onSubmit={handleActorSubmit}
        />
      )}
    </main>
  );
}
