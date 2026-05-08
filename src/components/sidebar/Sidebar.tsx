import { Plus, Search, Settings } from 'lucide-react';

export default function Sidebar() {
  return (
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
  );
}
