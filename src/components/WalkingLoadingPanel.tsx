type WalkingLoadingPanelProps = {
  title: string;
  description?: string;
  className?: string;
};

export default function WalkingLoadingPanel({
  title,
  description,
  className = '',
}: WalkingLoadingPanelProps) {
  return (
    <div
      className={`reaction-ui-font reaction-walking-loading-panel w-[min(360px,calc(100vw-48px))] rounded-2xl border border-white/35 bg-[#efe6de]/92 px-6 py-7 text-center text-[#2d1715] shadow-[0_24px_64px_rgba(0,0,0,0.34)] backdrop-blur-xl ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="reaction-walking-stage mx-auto" aria-hidden="true">
        <span className="reaction-walking-track" />
        <span className="reaction-walking-step reaction-walking-step-1" />
        <span className="reaction-walking-step reaction-walking-step-2" />
        <span className="reaction-walking-step reaction-walking-step-3" />
        <span className="reaction-walking-step reaction-walking-step-4" />
        <span className="reaction-walking-person">
          <span className="reaction-walking-head" />
          <span className="reaction-walking-body" />
          <span className="reaction-walking-leg reaction-walking-leg-left" />
          <span className="reaction-walking-leg reaction-walking-leg-right" />
        </span>
      </div>

      <h2 className="mt-5 text-base font-extrabold text-[#2d1715]">{title}</h2>
      {description && (
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#806b61]">
          {description}
        </p>
      )}
    </div>
  );
}
