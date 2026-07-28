import { isAxiosError } from 'axios';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProjectActor } from '../../apis/actor';
import { createProject, joinProject } from '../../apis/project';
import type { ProjectResponse } from '../../apis/project';
import { saveProjectActor } from '../../data/actors';
import createProjectCard from '../../images/icon/create-project-card.svg';
import loginCard from '../../images/icon/loginCard.svg';
import type { CreateProjectForm, JoinProjectForm } from '../../types/project';
import { getStoredUserId } from '../../utils/authStorage';
import CreateActorModal from '../modals/CreateActorModal';

const initialJoinForm: JoinProjectForm = {
  code: '',
};

const initialCreateForm: CreateProjectForm = {
  name: '',
  description: '',
  joinCode: '',
};

const getCreateProjectErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (
      error.response?.status === 400 &&
      typeof detail === 'string' &&
      detail.includes('이미 사용 중인 코드')
    ) {
      return '이미 존재하는 JOIN CODE입니다.';
    }
  }

  return '프로젝트 생성에 실패했습니다.';
};

type EnterCodeProjectFormProps = {
  onJoined?: () => void;
};

export function EnterCodeProjectForm({ onJoined }: EnterCodeProjectFormProps) {
  const [joinForm, setJoinForm] = useState<JoinProjectForm>(initialJoinForm);
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState('');

  const handleJoinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!joinForm.code.trim() || isJoiningProject) {
      return;
    }

    const userId = getStoredUserId();

    if (userId === null) {
      setJoinErrorMessage('로그인 후 다시 시도해 주세요.');
      return;
    }

    setIsJoiningProject(true);
    setJoinErrorMessage('');

    try {
      await joinProject({
        join_code: joinForm.code.trim().toUpperCase(),
        user_id: userId,
      });

      onJoined?.();
    } catch (error) {
      console.error('Failed to join project', error);
      setJoinErrorMessage('프로젝트 입장에 실패했습니다.');
    } finally {
      setIsJoiningProject(false);
    }
  };

  return (
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
          autoFocus
          className="reaction-login-input h-[40px] w-full rounded-full border border-white/85 bg-transparent px-5 text-center text-[11px] font-semibold text-[#2d1715] outline-none transition"
          placeholder="코드를 입력해 주세요"
          maxLength={4}
        />
        <button
          type="submit"
          disabled={isJoiningProject}
          className="reaction-ui-font h-[40px] w-full rounded-full border border-white/85 bg-[#6f5752] text-[11px] font-semibold text-[#f6eee4] transition hover:border-white hover:bg-[#5d4642] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/35 disabled:cursor-wait disabled:opacity-60"
        >
          {isJoiningProject ? 'JOINING...' : 'JOIN'}
        </button>
        <p className="reaction-ui-font min-h-[13px] text-[10px] font-semibold text-[#7a1d24]">
          {joinErrorMessage}
        </p>
      </div>
    </form>
  );
}

export function CreateNewProjectForm() {
  const navigate = useNavigate();
  const [createForm, setCreateForm] =
    useState<CreateProjectForm>(initialCreateForm);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectErrorMessage, setCreateProjectErrorMessage] =
    useState('');
  const [createdProject, setCreatedProject] = useState<ProjectResponse | null>(
    null,
  );
  const [isCreatingActor, setIsCreatingActor] = useState(false);
  const [actorCreateError, setActorCreateError] = useState<string | null>(null);

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

    const userId = getStoredUserId();

    if (userId === null) {
      setCreateProjectErrorMessage('로그인 후 다시 시도해 주세요.');
      return;
    }

    setIsCreatingProject(true);
    setCreateProjectErrorMessage('');

    try {
      const project = await createProject(userId, {
        title: createForm.name.trim(),
        description: createForm.description.trim(),
        join_code: createForm.joinCode.trim().toUpperCase(),
      });

      setCreatedProject(project);
      setActorCreateError(null);
    } catch (error) {
      console.error('Failed to create project', error);
      setCreateProjectErrorMessage(getCreateProjectErrorMessage(error));
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
    <>
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
            autoFocus
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
          className="reaction-ui-font relative z-10 mt-auto h-[40px] w-full rounded-full border border-white/85 bg-[#6f5752] text-[11px] font-semibold text-[#f6eee4] transition hover:border-white hover:bg-[#5d4642] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/35 disabled:cursor-wait disabled:opacity-60"
        >
          {isCreatingProject ? 'CREATING...' : 'CREATE'}
        </button>
        <p className="reaction-ui-font relative z-10 mt-2 min-h-[13px] text-center text-[10px] font-semibold text-[#7a1d24]">
          {createProjectErrorMessage}
        </p>
      </form>

      {createdProject && (
        <CreateActorModal
          projectName={createdProject.title}
          isSubmitting={isCreatingActor}
          errorMessage={actorCreateError}
          onSubmit={handleActorSubmit}
        />
      )}
    </>
  );
}
