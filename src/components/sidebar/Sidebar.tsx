import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCameraSession,
  getCameraSessionStatus,
} from '../../apis/session';
import type {
  CameraSessionStatusResponse,
  CreateCameraSessionResponse,
} from '../../apis/session';
import sidebarAdd from '../../images/icon/sidebar_add.svg';
import sidebarHome from '../../images/icon/sidebar_home.svg';
import sidebarLight from '../../images/icon/sidebar-light.png';
import sidebarSearch from '../../images/icon/sidebar_search.svg';
import sidebarSetting from '../../images/icon/sidebar_setting.svg';

const sidebarItems = [
  { label: '검색', icon: sidebarSearch },
  { label: '추가', icon: sidebarAdd },
  { label: '설정', icon: sidebarSetting },
  { label: '홈', icon: sidebarHome },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [cameraSession, setCameraSession] =
    useState<CreateCameraSessionResponse | null>(null);
  const [cameraStatus, setCameraStatus] =
    useState<CameraSessionStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isConnected =
    cameraStatus?.status === 'connected' ||
    cameraStatus?.status === 'done' ||
    Boolean(cameraStatus?.connected_at);
  const isDone = cameraStatus?.status === 'done' || Boolean(cameraStatus?.video_url);

  useEffect(() => {
    if (!cameraSession) return;

    const loadStatus = async () => {
      try {
        const nextStatus = await getCameraSessionStatus(
          cameraSession.session_id,
        );

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
  }, [cameraSession]);

  const handleItemClick = async (label: string) => {
    if (label !== '추가' || isCreatingSession) return;

    const nextSessionName =
      window.prompt('세션 이름을 입력하세요', '새 리허설 세션')?.trim() ??
      '새 리허설 세션';

    setIsCreatingSession(true);
    setSessionName(nextSessionName);
    setCameraStatus(null);
    setStatusError(null);

    try {
      const session = await createCameraSession();

      setCameraSession(session);
    } catch (error) {
      console.error('Failed to create camera session', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const closeCameraSessionModal = () => {
    setCameraSession(null);
    setCameraStatus(null);
    setStatusError(null);
  };

  const startRehearsal = () => {
    if (!cameraSession) return;

    const nextProjectId = projectId ?? '1';

    navigate(
      `/project/${nextProjectId}/workspace/${cameraSession.session_id}/feedback`,
    );
  };

  return (
    <aside
      className="fixed bottom-0 left-0 top-0 z-30 flex w-[258px] flex-col justify-end overflow-hidden bg-contain bg-left-bottom bg-no-repeat pb-[clamp(48px,9vh,96px)]"
      style={{ backgroundImage: `url(${sidebarLight})` }}
    >
      <nav className="self-start ml-[52px] flex flex-col items-center gap-4">
        {sidebarItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              void handleItemClick(item.label);
            }}
            disabled={item.label === '추가' && isCreatingSession}
            className="flex left-10 h-[clamp(36px,3.4vw,42px)] w-[clamp(36px,3.4vw,42px)] items-center justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={item.label}
          >
            <img
              src={item.icon}
              alt=""
              className="h-full w-full object-contain"
              aria-hidden="true"
            />
          </button>
        ))}
      </nav>
      {cameraSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm">
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
                onClick={closeCameraSessionModal}
                className="rounded-full border border-[#c8b7aa] px-3 py-1 text-xs font-bold transition hover:border-[#431B1B] hover:text-[#431B1B]"
              >
                닫기
              </button>
            </div>

            <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl border border-[#d3c3b7] bg-white p-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=208x208&data=${encodeURIComponent(
                  cameraSession.camera_url,
                )}`}
                alt="카메라 연결 QR"
                className="h-full w-full object-contain"
              />
            </div>

            <a
              href={cameraSession.camera_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block break-all text-center text-xs font-semibold text-[#806b61] underline underline-offset-2"
            >
              QR 대상 URL: {' '}
              {cameraSession.camera_url}
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
                  <p className="font-bold text-[#431B1B]">
                    연결 완료되었습니다!
                  </p>
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
              onClick={startRehearsal}
              disabled={!isConnected}
              className="mt-5 h-11 w-full rounded-xl bg-[#431B1B] text-sm font-bold text-[#fff8ef] transition hover:bg-[#2f1212] disabled:bg-[#b9a89c] disabled:text-[#efe6de]"
            >
              리허설 시작
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
