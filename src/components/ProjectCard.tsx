import type { Project } from '../types/project';

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-[144px] w-[294px] items-center justify-center rounded-[22px] bg-[#d9d9d9]">
        <span className="text-[25px] font-medium text-black">
          {project.title}
        </span>
      </div>

      <span className="mt-3 text-[20px] text-[#777]">{project.date}</span>
    </div>
  );
}
