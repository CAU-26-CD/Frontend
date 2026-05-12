import logoIcon from '../../images/icon/logoIcon.png';
import headerGradient from '../../images/icon/header-gradient.png';

interface DesignedHeaderProps {
  userName?: string;
  onLogout?: () => void;
}

export default function DesignedHeader({
  userName = 'JIWON',
  onLogout,
}: DesignedHeaderProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[832px] justify-center overflow-hidden">
      <img
        src={headerGradient}
        alt=""
        className="pointer-events-none absolute left-1/2 h-[245px] w-[814px] max-w-none -translate-x-1/2"
        style={{
          maskImage:
            'linear-gradient(to bottom, black 0%, black 22%, transparent 60%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 22%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="pointer-events-auto relative mt-4 z-10 flex h-[74px] items-center justify-center gap-10 text-[#fffff]">
        <span className="mt-[1px] h-[5px] w-[5px] rounded-full bg-[#efe6de]" />

        <img
          src={logoIcon}
          alt="Re:Action"
          className="h-[64px] w-[55px] object-contain"
        />

        <p className="reaction-ui-font text-[40px] font-medium leading-none">
          Hi,{' '}
          <span className="font-extrabold tracking-[0.01em]">{userName}</span>
          {' !'}
        </p>

        <button
          type="button"
          onClick={onLogout}
          className="reaction-ui-font text-[22px] font-bold text-[#ffffff] transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Logout
        </button>

        <span className="mt-[1px] h-[5px] w-[5px] rounded-full bg-[#ffffff]" />
      </div>
    </header>
  );
}
