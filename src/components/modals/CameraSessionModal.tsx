import { useEffect, useState } from 'react';
import { getCameraSessionStatus } from '../../apis/session';
import type {
  CameraSessionStatusResponse,
  CreateCameraSessionResponse,
} from '../../apis/session';

type CameraSessionModalProps = {
  session: CreateCameraSessionResponse;
  sessionName: string;
  onStart: () => void;
  variant?: 'overlay' | 'panel';
};

export default function CameraSessionModal({
  session,
  sessionName,
  onStart,
  variant = 'overlay',
}: CameraSessionModalProps) {
  const [cameraStatus, setCameraStatus] =
    useState<CameraSessionStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const normalizedStatus = cameraStatus?.status?.toLowerCase() ?? '';

  const isConnected =
    normalizedStatus === 'connected' ||
    normalizedStatus === 'done' ||
    Boolean(cameraStatus?.connected_at);
  const isDone =
    normalizedStatus === 'done' || Boolean(cameraStatus?.video_url);
  const canStartRehearsal = isConnected;
  const isPanel = variant === 'panel';

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
    <div
        className={
          isPanel
            ? 'reaction-ui-font flex h-full w-full items-stretch justify-end'
            : 'reaction-ui-font fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm'
        }
    >
      <div
        className={
          isPanel
            ? 'flex h-full w-80 max-w-full flex-col overflow-hidden rounded-2xl border border-white/35 bg-[#efe6de]/88 p-4 text-[#2d1715] shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl'
            : 'w-full max-w-md rounded-2xl border border-white/35 bg-[#efe6de]/88 p-6 text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl'
        }
      >
        <div className={isPanel ? 'mb-3 flex shrink-0 items-start justify-between gap-3' : 'mb-5 flex items-start justify-between gap-4'}>
          <div>
            <h2 className={isPanel ? 'text-base font-bold' : 'text-lg font-bold'}>
              카메라 연결
            </h2>
            <p className={isPanel ? 'mt-1 line-clamp-1 text-xs font-semibold text-[#806b61]' : 'mt-1 text-sm font-semibold text-[#806b61]'}>
              {sessionName}
            </p>
          </div>
        </div>

        <div
          className={
            isPanel
              ? 'mx-auto flex aspect-square w-[min(100%,190px)] shrink-0 items-center justify-center rounded-xl border border-[#d3c3b7] bg-white p-2.5'
              : 'mx-auto flex h-56 w-56 max-w-full items-center justify-center rounded-xl border border-[#d3c3b7] bg-white p-3'
          }
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=208x208&data=${encodeURIComponent(
              session.camera_url,
            )}`}
            alt="카메라 연결 QR"
            className="h-full w-full object-contain"
          />
        </div>

        {!isPanel && (
          <a
            href={session.camera_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all text-center text-xs font-semibold text-[#806b61] underline underline-offset-2"
          >
            QR 대상 URL: {session.camera_url}
          </a>
        )}

        <div
          className={
            isPanel
              ? 'mt-3 min-h-0 flex-1 rounded-xl border border-white/45 bg-white/28 p-3 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl'
              : 'mt-5 rounded-xl border border-white/45 bg-white/28 p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl'
          }
        >
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
              <p className="font-bold text-[#431B1B]">
                휴대폰 연결이 확인되었습니다.
              </p>
              <p className="mt-1 text-[#806b61]">
                리허설 시작 버튼을 누르면 피드백 입력을 시작합니다.
              </p>
            </div>
          )}

          {isDone && (
            <div>
              <p className="font-bold text-[#431B1B]">
                영상 업로드가 완료되었습니다.
              </p>
              <p className="mt-1 text-[#806b61]">
                리허설 시작 버튼을 누르면 피드백 입력을 시작합니다.
              </p>
            </div>
          )}

          {statusError && (
            <p className="mt-3 text-xs font-semibold text-[#A94444]">
              {statusError}
            </p>
          )}

          {cameraStatus && (
            <p className="mt-3 text-xs font-semibold text-[#806b61]">
              현재 상태: {cameraStatus.status}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!canStartRehearsal}
          className={[
            'reaction-glass-pill reaction-rehearsal-start-button relative w-full shrink-0 overflow-hidden rounded-full px-5 font-bold text-[#fff8ef] transition duration-300 hover:scale-[1.015] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:scale-100 disabled:opacity-55',
            isPanel ? 'mt-3 h-10 text-xs' : 'mt-5 h-12 text-sm',
          ].join(' ')}
        >
          <span className="relative z-10">리허설 시작</span>
        </button>
      </div>
    </div>
  );
}
