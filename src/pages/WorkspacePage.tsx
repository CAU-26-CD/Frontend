import { ChevronDown } from 'lucide-react';
import { projectDummy } from '../data/projectDummy';
import ProjectCardItem from '../components/ProjectCard';
import Sidebar from '../components/sidebar/Sidebar';
import DesignedHeader from '../components/sidebar/DesignedHeader';

export default function WorkspacePage() {
  const inProgressProjects = projectDummy.filter(
    (project) => project.status === 'inProgress',
  );

  const completedProjects = projectDummy.filter(
    (project) => project.status !== 'inProgress',
  );

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader align="left" />
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 min-h-screen w-full pl-[clamp(52px,5vw,72px)]">
        <Sidebar />

        <div className="min-w-0 flex-1 px-3 pb-8 pt-[clamp(132px,18vh,174px)] sm:px-5 lg:px-8">
          <div className="grid min-h-[calc(100vh-clamp(164px,22vh,212px))] grid-cols-1 gap-y-6 md:grid-cols-[minmax(104px,12vw)_minmax(0,1fr)]">
            <aside className="px-2 py-3 sm:px-4 md:py-5">
              <h2 className="mb-2 text-xs font-bold underline underline-offset-4">
                CATEGORY
              </h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#eee7dc] md:block md:space-y-1">
                <li>ㄴ 런스루</li>
                <li>ㄴ 워크스루</li>
              </ul>
            </aside>

            <div className="min-w-0">
              <section className="px-2 py-3 sm:px-4 md:px-6 md:py-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#b4b5b3]" />
                  <h2 className="text-sm font-semibold text-[#bdb6af]">
                    In Progress ({inProgressProjects.length})
                  </h2>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,236px))] gap-x-5 gap-y-6">
                  {inProgressProjects.map((project) => (
                    <ProjectCardItem key={project.id} project={project} />
                  ))}
                </div>
              </section>

              <section className="px-2 py-3 sm:px-4 md:px-6 md:py-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[#bdb6af]">
                    ALL ({completedProjects.length})
                  </h2>

                  <button className="flex h-7 items-center gap-2 rounded border border-white/25 px-3 text-xs text-[#d6cec6] transition hover:border-white/45 hover:text-white">
                    Latest
                    <ChevronDown size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,236px))] gap-x-5 gap-y-6">
                  {completedProjects.map((project) => (
                    <ProjectCardItem key={project.id} project={project} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
