import type { Project } from '../types/project';
import projectCardIcon from '../images/icon/ProjectCard.svg';

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="flex w-[236px] flex-col items-center">
      <div className="relative flex h-[114px] w-[236px] items-center justify-center text-[#17100f]">
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
  );
}
