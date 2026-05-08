import { Link } from 'react-router-dom';
import DesignedHeader from '../components/sidebar/DesignedHeader';

const homeValues = [
  '누구보다 빠르게\n구상하고',
  '누구보다\n빠르게 작성하고',
  '누구보다\n빠르게 발전하는',
];

export default function HomePage() {
  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <DesignedHeader />

      <div className="reaction-home-vignette absolute inset-0 z-0" />
      <div className="reaction-top-light absolute left-1/2 top-[-118px] z-0 -translate-x-1/2" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 pb-10 pt-28 text-center sm:px-8 sm:pt-32">
        <div className="flex flex-1 flex-col items-center">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.38em] text-[#b98f85]/55">
            create. record. refine.
          </p>

          <h1 className="font-serif text-[64px] leading-none text-[#f5efe8] sm:text-[82px] md:text-[104px]">
            Re:Action
          </h1>

          <p className="mt-7 text-sm font-medium text-[#ded4ca] sm:text-base">
            당신의 모습을 기록하고, 분석하세요
          </p>

          <div className="reaction-mark mt-9" aria-hidden="true" />

          <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-10 md:mt-24">
            {homeValues.map((value) => (
              <div
                key={value}
                className="reaction-spotlight relative min-h-40 overflow-hidden rounded-t-full px-7 pb-8 pt-24 text-left"
              >
                <p className="relative z-10 whitespace-pre-line text-sm font-semibold leading-5 text-[#eee7dc]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/projects"
          className="reaction-start-button group relative mb-2 inline-flex h-12 items-center justify-center overflow-hidden rounded-full border border-[#eee7dc]/65 px-10 text-sm font-semibold text-[#f5efe8] transition duration-500 hover:-translate-y-1 hover:border-white hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#eee7dc]/70"
        >
          <span className="absolute inset-0 translate-y-full rounded-full bg-[#eee7dc]/15 transition duration-500 group-hover:translate-y-0" />
          <span className="absolute inset-0 rounded-full opacity-0 shadow-[0_0_42px_rgba(238,231,220,0.32)] transition duration-500 group-hover:opacity-100" />
          <span className="relative z-10">시작하러가기</span>
        </Link>
      </section>
    </main>
  );
}
