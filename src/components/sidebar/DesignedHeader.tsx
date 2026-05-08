import { Link } from 'react-router-dom';

export default function DesignedHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div className="h-24 bg-gradient-to-b from-[#130708]/80 via-[#2b0c10]/40 to-transparent backdrop-blur-[2px]" />

      <div className="pointer-events-auto absolute inset-x-0 top-0 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 text-[#eee7dc] sm:px-8">
        <Link
          to="/"
          className="font-serif text-xl leading-none tracking-normal text-[#f5efe8]"
          aria-label="Re:Action home"
        >
          Re:Action
        </Link>

        <Link
          to="/login"
          className="rounded-full border border-[#eee7dc]/70 px-5 py-1.5 text-xs font-medium text-[#eee7dc] transition duration-300 hover:border-white hover:bg-white/15 hover:text-white hover:shadow-[0_0_28px_rgba(238,231,220,0.22)]"
        >
          login
        </Link>
      </div>
    </header>
  );
}
