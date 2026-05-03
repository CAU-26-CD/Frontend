import { ChevronDown, Plus, Search, Settings } from 'lucide-react';
import { projectDummy } from '../data/projectDummy';
import ProjectCardItem from '../components/ProjectCard';

export default function ProjectPage() {
  const inProgressProjects = projectDummy.filter(
    (project) => project.status === 'inProgress',
  );

  const allProjects = projectDummy;

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <div className="reaction-top-light absolute right-20 top-[-96px] z-0" />

      <div className="relative z-10 flex min-h-screen w-full">
        <aside className="flex w-16 shrink-0 flex-col items-center border-r border-white/15 pt-28">
          <nav className="flex flex-col items-center gap-4">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/35 text-xs font-semibold text-white">
              홈
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee7dc] text-[#2d1715] transition hover:bg-white">
              <Plus size={22} strokeWidth={2.5} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee7dc] text-[#2d1715] transition hover:bg-white">
              <Search size={18} strokeWidth={2.5} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee7dc] text-[#2d1715] transition hover:bg-white">
              <Settings size={18} strokeWidth={2.5} />
            </button>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 px-6 py-8">
          <header className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-[40px] leading-none">Re:Action</h1>
              <p className="mt-4 text-sm text-[#bcb2aa]">
                My Projects &gt; 실비아, 샬단
              </p>
            </div>

            <div className="flex items-center gap-8 pt-2 text-sm">
              <p>
                Hi, <span className="font-bold">JIWON</span>
              </p>
              <button className="underline underline-offset-2 transition hover:text-white">
                logout
              </button>
            </div>
          </header>

          <div className="mt-5 grid min-h-[calc(100vh-9.5rem)] grid-cols-[136px_minmax(0,1fr)] border-t border-white/15">
            <aside className="border-r border-white/15 px-5 py-5">
              <h2 className="mb-2 text-xs font-bold underline underline-offset-4">
                CATEGORY
              </h2>
              <ul className="space-y-1 text-sm font-semibold text-[#eee7dc]">
                <li>ㄴ 런스루</li>
                <li>ㄴ 워크스루</li>
              </ul>
            </aside>

            <div className="min-w-0">
              <section className="border-b border-white/15 px-6 py-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#b4b5b3]" />
                  <h2 className="text-sm font-semibold text-[#bdb6af]">
                    In Progress ({inProgressProjects.length})
                  </h2>
                </div>

                <div className="flex flex-wrap gap-4">
                  {inProgressProjects.map((project) => (
                    <ProjectCardItem key={project.id} project={project} />
                  ))}
                </div>
              </section>

              <section className="px-6 py-5">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#bdb6af]">
                    ALL ({allProjects.length})
                  </h2>

                  <button className="flex h-7 items-center gap-2 rounded border border-white/25 px-3 text-xs text-[#d6cec6] transition hover:border-white/45 hover:text-white">
                    Latest
                    <ChevronDown size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,236px)] gap-x-5 gap-y-6">
                  {allProjects.map((project) => (
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
