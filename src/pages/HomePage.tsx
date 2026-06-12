import { Link } from 'react-router-dom';
import logoIcon from '../images/icon/logoIcon.png';
import mainLight from '../images/icon/main_light.png';

const homeValues = [
  '꼼꼼하게\n구상하고',
  '정확하게\n작성하고',
  '빠르게\n발전하는',
];

export default function HomePage() {
  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <div className="reaction-home-vignette absolute inset-0 z-0" />

      <nav className="relative z-10 mx-auto grid h-[82px] w-full max-w-[850px] grid-cols-4 items-center px-7 text-center text-[13px] font-semibold text-[#f4eee6] sm:h-[88px] sm:px-10">
        <button
          type="button"
          disabled
          className="cursor-default bg-transparent p-0 font-[inherit] text-inherit"
        >
          About
        </button>
        <button
          type="button"
          disabled
          className="cursor-default bg-transparent p-0 font-[inherit] text-inherit"
        >
          Contact
        </button>
        <button
          type="button"
          disabled
          className="cursor-default bg-transparent p-0 font-[inherit] text-inherit"
        >
          Sign up
        </button>
        <Link
          to="/login"
          className="justify-self-center rounded-full border border-[#fff8ef]/80 bg-[#fff8ef] px-5 py-2 text-[#431B1B] shadow-[0_0_18px_rgba(255,248,239,0.32)] transition hover:bg-white"
        >
          Login
        </Link>
      </nav>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-82px)] w-full max-w-[850px] flex-col items-center px-7 pb-12 pt-16 text-center sm:min-h-[calc(100vh-88px)] sm:px-10 sm:pt-20">
        <div className="flex w-full flex-1 flex-col items-center">
          <h1 className="reaction-logo-font text-[62px] leading-none text-[#f8efe4] sm:text-[86px] md:text-[102px]">
            · Re:Action ·
          </h1>

          <p className="reaction-subtitle mt-7 text-s font-semibold text-[#efe8df]">
            당신의 모습을 기록하고, 분석하세요
          </p>

          <div className="reaction-home-logo mt-12 h-24 w-28">
            <span className="reaction-loading-spinner-glow" aria-hidden="true" />
            <span className="reaction-loading-particle reaction-loading-particle-1" />
            <span className="reaction-loading-particle reaction-loading-particle-2" />
            <span className="reaction-loading-particle reaction-loading-particle-3" />
            <img
              src={logoIcon}
              alt=""
              className="reaction-home-logo-image relative z-10 h-full w-full object-contain"
              aria-hidden="true"
            />
          </div>

          <div className="reaction-value-grid mt-24 grid w-full grid-cols-1 gap-8 s:mt-28 sm:grid-cols-3 sm:gap-8 md:mt-32">
            {homeValues.map((value) => (
              <div
                key={value}
                className="reaction-value relative flex min-h-[150px] items-start justify-center overflow-visible px-4 "
              >
                <img
                  src={mainLight}
                  alt=""
                  className="reaction-value-light pointer-events-none absolute left-1/2 bottom-0 z-0  w-[351px] max-w-none object-fill"
                  aria-hidden="true"
                />
                <p className="reaction-value-text relative z-10 whitespace-pre-line text-center text-lg font-semibold -translate-y-6 text-[#f1ebe2]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
