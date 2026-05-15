import { Link } from 'react-router-dom';
import projectCardIcon from '../images/icon/ProjectCard.svg';
import type { Project } from '../types/project';

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/project/${project.id}/workspace`}
      className="group flex w-full max-w-[236px] flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#eee7dc]/70"
      aria-label={`${project.title} 워크스페이스로 이동`}
    >
      <article className="flex w-full flex-col items-center">
        <div className="reaction-project-card relative flex aspect-[236/114] w-full items-center justify-center overflow-hidden text-[#17100f] transition duration-300 group-hover:scale-[1.04]">
          <img
            src={projectCardIcon}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain"
          />
          <h3 className="relative z-10 max-w-[68%] text-center text-[15px] font-semibold leading-tight">
            {project.title}
          </h3>
        </div>

        <time className="mt-2 text-[10px] font-medium text-[#b4aca4]">
          {project.date}
        </time>
      </article>
    </Link>
  );
}
