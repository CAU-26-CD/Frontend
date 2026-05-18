import logoIcon from '../images/icon/logoIcon.png';

type LoadingSpinnerProps = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClassNames = {
  sm: 'h-14 w-14',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
};

export default function LoadingSpinner({
  label = '불러오는 중입니다',
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`reaction-ui-font flex flex-col items-center justify-center gap-3 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={`reaction-loading-spinner relative ${sizeClassNames[size]}`}>
        <span className="reaction-loading-spinner-glow" aria-hidden="true" />
        <span className="reaction-loading-particle reaction-loading-particle-1" />
        <span className="reaction-loading-particle reaction-loading-particle-2" />
        <span className="reaction-loading-particle reaction-loading-particle-3" />
        <img
          src={logoIcon}
          alt=""
          className="reaction-loading-spinner-logo relative z-10 h-full w-full object-contain"
          aria-hidden="true"
        />
      </div>
      <span className="text-xs font-bold text-[#fff8ef]/76">{label}</span>
    </div>
  );
}
