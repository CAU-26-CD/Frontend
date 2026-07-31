import { UploadCloud } from 'lucide-react';

export default function VideoUploadRequestModal() {
  return (
    <div
      className="reaction-ui-font fixed inset-0 z-[20000] flex items-center justify-center bg-[#1b0708]/58 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-upload-request-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/35 bg-[#efe6de]/94 px-6 py-7 text-center text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#431B1B] text-[#fff8ef] shadow-[0_18px_36px_rgba(67,27,27,0.24)]">
          <UploadCloud size={38} strokeWidth={2.2} aria-hidden="true" />
        </div>

        <h2
          id="video-upload-request-title"
          className="mt-5 text-lg font-extrabold text-[#2d1715]"
        >
          리허설이 종료되었습니다!
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#806b61]">
          영상을 업로드해주세요.
        </p>
      </div>
    </div>
  );
}
