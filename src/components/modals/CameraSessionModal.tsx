import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, Radio, UploadCloud, Video } from 'lucide-react';
import { getCameraSessionStatus } from '../../apis/session';
import type {
  CameraSessionStatusResponse,
  CreateCameraSessionResponse,
} from '../../apis/session';

type CameraSessionModalProps = {
  session: CreateCameraSessionResponse;
  sessionName: string;
  onStart: () => void;
  onStatusChange?: (status: CameraSessionStatusResponse) => void;
  variant?: 'overlay' | 'panel';
  isOwner?: boolean;
};

const VIDEO_UPLOAD_STATUSES = new Set(['stop', 'stopped', 'uploading']);

export default function CameraSessionModal({
  session,
  sessionName,
  onStart,
  onStatusChange,
  variant = 'overlay',
  isOwner = true,
}: CameraSessionModalProps) {
  const [cameraStatus, setCameraStatus] =
    useState<CameraSessionStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const normalizedStatus = cameraStatus?.status?.toLowerCase() ?? '';

  const isConnected = normalizedStatus === 'connected';
  const isRecording = normalizedStatus === 'recording';
  const isDone =
    normalizedStatus === 'done' || Boolean(cameraStatus?.video_url);
  const canStartRehearsal = isOwner && (isConnected || isRecording);
  const isPanel = variant === 'panel';
  const isVideoUploadInProgress =
    VIDEO_UPLOAD_STATUSES.has(normalizedStatus) && !isDone;
  const isWaitingForConnection =
    !isConnected && !isRecording && !isVideoUploadInProgress && !isDone;
  const nonOwnerStatus = isDone
    ? {
        title: '영상 업로드 완료',
        description: '세션 소유자가 배우 태그를 매칭하면 리뷰로 이동합니다.',
        badge: '완료',
        progress: 100,
        icon: CheckCircle2,
      }
    : isVideoUploadInProgress
      ? {
          title: '비디오 업로드 중',
          description: '업로드가 끝나면 세션 소유자의 태그 매칭을 기다립니다.',
          badge: '업로드 중',
          progress: 84,
          icon: UploadCloud,
        }
      : isRecording
        ? {
            title: '리허설 녹화 중',
            description: '녹화가 끝나면 영상 업로드 상태로 전환됩니다.',
            badge: '녹화 중',
            progress: 66,
            icon: Video,
          }
        : isConnected
          ? {
              title: '카메라 연결 완료',
              description: '세션 소유자가 리허설을 시작하면 참여할 수 있습니다.',
              badge: '시작 대기',
              progress: 36,
              icon: Radio,
            }
          : {
              title: '카메라 연결 대기',
              description: '세션 소유자가 휴대폰 카메라를 연결하고 있습니다.',
              badge: '대기 중',
              progress: 14,
              icon: Camera,
            };
  const NonOwnerStatusIcon = nonOwnerStatus.icon;
  const nonOwnerSteps = [
    {
      label: '연결',
      isActive: isWaitingForConnection,
      isComplete:
        isConnected || isRecording || isVideoUploadInProgress || isDone,
    },
    {
      label: '녹화',
      isActive: isConnected || isRecording,
      isComplete: isVideoUploadInProgress || isDone,
    },
    {
      label: '리뷰 대기',
      isActive: isVideoUploadInProgress || isDone,
      isComplete: isDone,
    },
  ];

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const nextStatus = await getCameraSessionStatus(session.session_id);

        setCameraStatus(nextStatus);
        onStatusChange?.(nextStatus);
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
  }, [onStatusChange, session.session_id]);

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
        <div
          className={
            isPanel
              ? 'mb-3 flex shrink-0 items-start justify-between gap-3'
              : 'mb-5 flex items-start justify-between gap-4'
          }
        >
          <div>
            <h2
              className={isPanel ? 'text-base font-bold' : 'text-lg font-bold'}
            >
              {isOwner ? '카메라 연결' : '세션 준비 중'}
            </h2>
            <p
              className={
                isPanel
                  ? 'mt-1 line-clamp-1 text-xs font-semibold text-[#806b61]'
                  : 'mt-1 text-sm font-semibold text-[#806b61]'
              }
            >
              {sessionName}
            </p>
          </div>
        </div>

        {isOwner ? (
          <>
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
              {!isConnected && !isRecording && !isDone && (
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

              {isRecording && (
                <div>
                  <p className="font-bold text-[#431B1B]">
                    리허설을 녹화하고 있습니다.
                  </p>
                  <p className="mt-1 text-[#806b61]">
                    종료 후 업로드가 완료되면 다음 단계로 이동합니다.
                  </p>
                </div>
              )}

              {isDone && (
                <div>
                  <p className="font-bold text-[#431B1B]">
                    영상 업로드가 완료되었습니다.
                  </p>
                  <p className="mt-1 text-[#806b61]">
                    태그 매칭 화면으로 이동할 수 있습니다.
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
                canStartRehearsal
                  ? 'reaction-rehearsal-start-button-ready'
                  : '',
                isPanel ? 'mt-3 h-10 text-xs' : 'mt-5 h-12 text-sm',
              ].join(' ')}
            >
              <span className="relative z-10">리허설 시작</span>
            </button>
          </>
        ) : (
          <div
            className={
              isPanel
                ? 'flex min-h-0 flex-1 flex-col rounded-xl border border-white/45 bg-[#fff8ef]/38 p-4 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl'
                : 'rounded-xl border border-white/45 bg-[#fff8ef]/38 p-5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl'
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#431B1B] text-[#fff8ef] shadow-[0_10px_22px_rgba(67,27,27,0.28)]">
                  {!isDone && (
                    <span
                      className="absolute inset-0 rounded-full bg-[#431B1B]/25 animate-ping"
                      aria-hidden="true"
                    />
                  )}
                  <NonOwnerStatusIcon
                    size={22}
                    strokeWidth={2.4}
                    className="relative z-10"
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[#2d1715]">
                    {nonOwnerStatus.title}
                  </p>
                  <p className="mt-1 leading-relaxed text-[#806b61]">
                    {nonOwnerStatus.description}
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-[#431B1B]/18 bg-white/48 px-2.5 py-1 text-[10px] font-extrabold text-[#431B1B]">
                {nonOwnerStatus.badge}
              </span>
            </div>

            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#d8c9bd]">
                <div
                  className="h-full rounded-full bg-[#431B1B] transition-[width] duration-500"
                  style={{ width: `${nonOwnerStatus.progress}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {nonOwnerSteps.map((step) => (
                  <div
                    key={step.label}
                    className={[
                      'rounded-lg border px-2 py-2 text-center text-[10px] font-extrabold transition',
                      step.isComplete
                        ? 'border-[#431B1B]/20 bg-[#431B1B] text-[#fff8ef]'
                        : step.isActive
                          ? 'border-[#431B1B]/24 bg-white/62 text-[#431B1B]'
                          : 'border-[#c8b7aa]/70 bg-white/24 text-[#806b61]/66',
                    ].join(' ')}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-5">
              {statusError ? (
                <p className="rounded-lg border border-[#A94444]/20 bg-[#A94444]/10 px-3 py-2 text-xs font-semibold text-[#A94444]">
                  {statusError}
                </p>
              ) : (
                <p className="rounded-lg border border-white/40 bg-white/28 px-3 py-2 text-xs font-semibold text-[#806b61]">
                  상태가 바뀌면 자동으로 다음 화면으로 이동합니다.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
