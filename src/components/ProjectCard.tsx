import { Link } from 'react-router-dom';
import projectCardIcon from '../images/icon/ProjectCard.svg';
import type { Project } from '../types/project';

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const projectPath =
    project.status === 'inProgress'
      ? `/projects/${project.id}/feedback`
      : `/projects/${project.id}/report`;
  const statusLabel =
    project.status === 'inProgress' ? '피드백 작성으로 이동' : '리포트 준비 중';

  return (
    <Link
      to={projectPath}
      className="group flex w-[236px] flex-col items-center rounded-lg outline-none transition duration-500 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#eee7dc]/70"
      aria-label={`${project.title} ${statusLabel}`}
    >
      <article className="flex w-full flex-col items-center">
        <div className="reaction-project-card relative flex h-[114px] w-[236px] items-center justify-center overflow-hidden text-[#17100f] transition duration-500 group-hover:scale-[1.03] group-hover:drop-shadow-[0_18px_24px_rgba(0,0,0,0.36)]">
          <img
            src={projectCardIcon}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain transition duration-500 group-hover:brightness-110"
          />
          <span className="absolute inset-x-5 inset-y-3 translate-y-full rounded-[28px] bg-[#eee7dc]/20 transition duration-500 group-hover:translate-y-0" />
          <span className="absolute inset-x-4 inset-y-2 rounded-[30px] opacity-0 shadow-[0_0_42px_rgba(238,231,220,0.34)] transition duration-500 group-hover:opacity-100" />
          <h3 className="relative z-10 max-w-[68%] text-center text-[15px] font-semibold leading-tight transition duration-500 group-hover:text-[#4b201b]">
            {project.title}
          </h3>
        </div>

        <time className="mt-2 text-[10px] font-medium text-[#b4aca4] transition duration-500 group-hover:text-[#eee7dc]">
          {project.date}
        </time>
      </article>
    </Link>
  );
}
