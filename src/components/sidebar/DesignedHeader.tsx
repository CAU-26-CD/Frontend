import logoIcon from '../../images/icon/logoIcon.png';
import headerGradient from '../../images/icon/header-gradient.png';

interface DesignedHeaderProps {
  userName?: string;
  onLogout?: () => void;
  align?: 'center' | 'left';
  className?: string;
}

export default function DesignedHeader({
  userName = 'JIWON',
  onLogout,
  align = 'center',
  className = '',
}: DesignedHeaderProps) {
  const headerAlignClass =
    align === 'left' ? 'justify-start pl-[76px]' : 'justify-center';
  const gradientAlignClass =
    align === 'left' ? 'left-[-170px]' : 'left-1/2 -translate-x-1/2';

  return (
    <header
      className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[145px] ${headerAlignClass} overflow-hidden ${className}`}
    >
      <img
        src={headerGradient}
        alt=""
        className={`pointer-events-none absolute h-[245px] w-[814px] max-w-none ${gradientAlignClass}`}
        style={{
          maskImage:
            'linear-gradient(to bottom, black 0%, black 22%, transparent 60%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 22%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="pointer-events-auto relative z-10 mt-[22px] flex h-[74px] items-center justify-center gap-7 text-[#ffffff]">
        <span className="mt-[1px] h-[5px] w-[5px] rounded-full bg-[#efe6de]" />

        <img
          src={logoIcon}
          alt="Re:Action"
          className="h-[54px] w-[48px] object-contain"
        />

        <p className="reaction-ui-font text-[34px] font-medium leading-none">
          Hi,{' '}
          <span className="font-extrabold tracking-[0.01em]">{userName}</span>
          {' !'}
        </p>

        <button
          type="button"
          onClick={onLogout}
          className="reaction-ui-font text-[16px] font-bold text-[#ffffff] transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Logout
        </button>

        <span className="mt-[1px] h-[5px] w-[5px] rounded-full bg-[#ffffff]" />
      </div>
    </header>
  );
}
