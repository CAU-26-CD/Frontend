import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCameraSessionStatus } from '../../apis/session';
import type {
  CameraSessionStatusResponse,
  CreateCameraSessionResponse,
} from '../../apis/session';

type CameraSessionModalProps = {
  session: CreateCameraSessionResponse;
  sessionName: string;
  onClose: () => void;
  onStart: () => void;
};

export default function CameraSessionModal({
  session,
  sessionName,
  onClose,
  onStart,
}: CameraSessionModalProps) {
  const [cameraStatus, setCameraStatus] =
    useState<CameraSessionStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isConnected =
    cameraStatus?.status === 'connected' ||
    cameraStatus?.status === 'done' ||
    Boolean(cameraStatus?.connected_at);
  const isDone =
    cameraStatus?.status === 'done' || Boolean(cameraStatus?.video_url);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const nextStatus = await getCameraSessionStatus(session.session_id);

        setCameraStatus(nextStatus);
        setStatusError(null);
      } catch (error) {
        console.error('Failed to get camera session status', error);
        setStatusError('연결 상태를 확인하지 못했습니다');
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session.session_id]);

  return (
    <div className="reaction-ui-font fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/35 bg-[#efe6de]/88 p-6 text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">카메라 연결</h2>
            <p className="mt-1 text-sm font-semibold text-[#806b61]">
              {sessionName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/18 text-[#806b61] shadow-[inset_0_1px_0_rgba(255,255,255,0.64)] backdrop-blur-lg transition hover:border-white/55 hover:bg-white/30 hover:text-[#431B1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/25"
            aria-label="닫기"
          >
            <X size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl border border-[#d3c3b7] bg-white p-3">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=208x208&data=${encodeURIComponent(
              session.camera_url,
            )}`}
            alt="카메라 연결 QR"
            className="h-full w-full object-contain"
          />
        </div>

        <a
          href={session.camera_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block break-all text-center text-xs font-semibold text-[#806b61] underline underline-offset-2"
        >
          QR 대상 URL: {session.camera_url}
        </a>

        <div className="mt-5 rounded-xl border border-white/45 bg-white/28 p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl">
          {!isConnected && (
            <div>
              <p className="font-bold">연결할 준비가 완료되었습니다.</p>
              <p className="mt-1 text-[#806b61]">
                휴대폰으로 QR을 스캔하면 연결 상태를 확인합니다.
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#d8c9bd]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-[#431B1B]" />
              </div>
            </div>
          )}

          {isConnected && !isDone && (
            <div>
              <p className="font-bold text-[#431B1B]">연결 완료되었습니다!</p>
              <p className="mt-1 text-[#806b61]">
                휴대폰에서 촬영을 진행해주세요.
              </p>
            </div>
          )}

          {isDone && (
            <div>
              <p className="font-bold text-[#431B1B]">
                업로드가 완료되었습니다.
              </p>
              <p className="mt-1 text-[#806b61]">
                리허설 피드백 작성을 시작할 수 있습니다.
              </p>
            </div>
          )}

          {statusError && (
            <p className="mt-3 text-xs font-semibold text-[#A94444]">
              {statusError}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!isConnected}
          className="reaction-glass-pill reaction-rehearsal-start-button relative mt-5 h-12 w-full overflow-hidden rounded-full px-5 text-sm font-bold text-[#fff8ef] transition duration-300 hover:scale-[1.015] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:scale-100 disabled:opacity-55"
        >
          <span className="relative z-10">리허설 시작</span>
        </button>
      </div>
    </div>
  );
}
