import { UploadCloud } from 'lucide-react';

export default function VideoUploadLoadingModal() {
  return (
    <div
      className="reaction-ui-font fixed inset-0 z-40 flex items-center justify-center bg-[#1b0708]/58 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-upload-loading-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/35 bg-[#efe6de]/94 px-6 py-7 text-center text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div
          className="reaction-video-upload-stage mx-auto"
          role="status"
          aria-live="polite"
        >
          <span className="reaction-video-upload-ring" aria-hidden="true" />
          <span
            className="reaction-video-upload-particle reaction-video-upload-particle-1"
            aria-hidden="true"
          />
          <span
            className="reaction-video-upload-particle reaction-video-upload-particle-2"
            aria-hidden="true"
          />
          <span
            className="reaction-video-upload-particle reaction-video-upload-particle-3"
            aria-hidden="true"
          />
          <UploadCloud
            size={54}
            strokeWidth={2.2}
            className="reaction-video-upload-icon"
            aria-hidden="true"
          />
        </div>

        <h2
          id="video-upload-loading-title"
          className="mt-5 text-lg font-extrabold text-[#2d1715]"
        >
          비디오 업로드 및 분석중입니다
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#806b61]">
          업로드가 완료되면 다음 단계로 이동합니다.
        </p>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#d8c9bd]">
          <span className="reaction-video-upload-progress block h-full rounded-full bg-[#431B1B]" />
        </div>
      </div>
    </div>
  );
}
