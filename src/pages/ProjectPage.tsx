import { projectDummy } from '../data/projectDummy';
import ProjectCardItem from '../components/ProjectCard';

export default function ProjectPage() {
  const inProgressProjects = projectDummy.filter(
    (project) => project.status === 'inProgress',
  );

  const allProjects = projectDummy;

  return (
    <main className="min-h-screen bg-[#e9e9e9] px-10 py-8 text-[#666]">
      <section className="border-b border-[#999] pb-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="h-6 w-6 rounded-full bg-[#9d9d9d]" />
          <h2 className="text-[26px] font-bold">
            In Progress ({inProgressProjects.length})
          </h2>
        </div>

        <div className="flex flex-wrap gap-4">
          {inProgressProjects.map((project) => (
            <ProjectCardItem key={project.id} project={project} />
          ))}
        </div>
      </section>

      <section className="pt-6">
        <div className="mb-9 flex items-center justify-between">
          <h2 className="text-[26px] font-bold">ALL ({allProjects.length})</h2>

          <button className="flex h-[45px] w-[135px] items-center justify-center rounded-md border border-[#777] text-[18px] text-[#777]">
            Latest
            <span className="ml-3 text-[#cfcfcf]">▼</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-x-3 gap-y-4">
          {allProjects.map((project) => (
            <ProjectCardItem key={project.id} project={project} />
          ))}
        </div>
      </section>
    </main>
  );
}
