import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CreateProjectForm, JoinProjectForm } from '../types/project';

const initialJoinForm: JoinProjectForm = {
  code: '',
};

const initialCreateForm: CreateProjectForm = {
  name: '',
  description: '',
  memo: '',
};

export default function NewProject() {
  const [joinForm, setJoinForm] = useState<JoinProjectForm>(initialJoinForm);
  const [createForm, setCreateForm] =
    useState<CreateProjectForm>(initialCreateForm);

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('join project:', joinForm);
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('create project:', createForm);
  };

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <div className="reaction-top-light absolute right-14 top-[-72px] z-0" />

      <header className="relative z-10 flex h-20 items-center justify-end gap-8 px-8 text-sm md:px-12">
        <p>
          Hi, <span className="font-bold">JIWON</span>
        </p>
        <button className="underline underline-offset-2 transition hover:text-white">
          logout
        </button>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col items-center justify-center gap-12 px-8 pb-16 md:flex-row md:gap-20">
        <form
          onSubmit={handleJoinSubmit}
          className="reaction-panel-ticket reaction-panel-shadow flex h-[430px] w-full max-w-[300px] flex-col px-9 py-8 text-center text-[#17100f]"
        >
          <p className="text-lg">already created</p>

          <h1 className="mt-16 font-serif text-[34px] leading-[1.05]">
            ENTER
            <span className="block">JOIN CODE</span>
          </h1>

          <div className="mt-auto flex items-center gap-4 pb-1">
            <label className="sr-only" htmlFor="join-code">
              Join code
            </label>
            <input
              id="join-code"
              value={joinForm.code}
              onChange={(event) =>
                setJoinForm({ code: event.target.value.toUpperCase() })
              }
              className="h-10 min-w-0 flex-1 border-0 border-b-2 border-[#17100f] bg-transparent text-center font-serif text-2xl tracking-[0.45em] outline-none"
              maxLength={4}
              required
            />
            <button
              type="submit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#b9bab6] text-[#5b5d5c] transition hover:bg-[#d2d2cf] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30"
              aria-label="Enter join code"
            >
              <ArrowRight size={20} strokeWidth={2.4} />
            </button>
          </div>
        </form>

        <form
          onSubmit={handleCreateSubmit}
          className="reaction-panel-ticket reaction-panel-shadow flex h-[430px] w-full max-w-[300px] flex-col px-9 py-7 text-[#17100f]"
        >
          <h2 className="text-center font-serif text-[31px] leading-[0.98]">
            CREATE
            <span className="block text-[26px]">NEW Project</span>
          </h2>

          <div className="mt-10 space-y-3">
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
              className="reaction-input h-10 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition"
              placeholder="NAME (영/한 15자 내외)"
              maxLength={15}
              required
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
              className="reaction-input h-10 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition"
              placeholder="소속 및 설명 (20자 내외)"
              maxLength={20}
              required
            />

            <label className="sr-only" htmlFor="project-memo">
              Memo
            </label>
            <input
              id="project-memo"
              value={createForm.memo}
              onChange={(event) =>
                setCreateForm((form) => ({
                  ...form,
                  memo: event.target.value,
                }))
              }
              className="reaction-input h-10 w-full rounded-xl border px-4 text-sm outline-none transition"
              maxLength={30}
            />
          </div>

          <button
            type="submit"
            className="mt-auto pb-1 text-center font-serif text-[31px] font-semibold transition hover:text-[#6f1c25] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30"
          >
            CREATE
          </button>
        </form>
      </section>
    </main>
  );
}
