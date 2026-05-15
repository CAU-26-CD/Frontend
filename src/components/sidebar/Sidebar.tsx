import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCameraSession } from '../../apis/session';
import type { CreateCameraSessionResponse } from '../../apis/session';
import CameraSessionModal from '../modals/CameraSessionModal';
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
  const [isNamingSession, setIsNamingSession] = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState('새 리허설 세션');
  const [sessionName, setSessionName] = useState('');
  const [cameraSession, setCameraSession] =
    useState<CreateCameraSessionResponse | null>(null);

  const handleItemClick = (label: string) => {
    if (label !== '추가' || isCreatingSession) return;

    setSessionNameInput('새 리허설 세션');
    setIsNamingSession(true);
  };

  const cancelSessionCreation = () => {
    if (isCreatingSession) return;

    setIsNamingSession(false);
    setSessionNameInput('새 리허설 세션');
  };

  const createNamedSession = async () => {
    const nextSessionName = sessionNameInput.trim();

    if (!nextSessionName || isCreatingSession) return;

    setIsCreatingSession(true);
    setSessionName(nextSessionName);

    try {
      const session = await createCameraSession();

      setCameraSession(session);
      setIsNamingSession(false);
    } catch (error) {
      console.error('Failed to create camera session', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const closeCameraSessionModal = () => {
    setCameraSession(null);
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
            onClick={() => handleItemClick(item.label)}
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
      {isNamingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/35 bg-[#efe6de]/90 p-6 text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="mb-5">
              <h2 className="text-lg font-bold">새 세션 만들기</h2>
              <p className="mt-1 text-sm font-semibold text-[#806b61]">
                리허설 세션 이름을 입력하세요.
              </p>
            </div>

            <label className="block text-xs font-bold text-[#806b61]">
              세션 이름
            </label>
            <input
              value={sessionNameInput}
              onChange={(event) => setSessionNameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void createNamedSession();
                }

                if (event.key === 'Escape') {
                  cancelSessionCreation();
                }
              }}
              autoFocus
              className="mt-2 h-11 w-full rounded-xl border border-[#c8b7aa] bg-[#fff8ef]/78 px-3 text-sm font-semibold text-[#2d1715] outline-none transition focus:border-[#431B1B] focus:ring-2 focus:ring-[#431B1B]/15"
              placeholder="예: 5회차 런스루"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelSessionCreation}
                disabled={isCreatingSession}
                className="h-10 rounded-xl border border-[#c8b7aa] px-4 text-sm font-bold text-[#806b61] transition hover:border-[#431B1B] hover:text-[#431B1B] disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  void createNamedSession();
                }}
                disabled={!sessionNameInput.trim() || isCreatingSession}
                className="h-10 rounded-xl bg-[#431B1B] px-5 text-sm font-bold text-[#fff8ef] transition hover:bg-[#2f1212] disabled:bg-[#b9a89c] disabled:text-[#efe6de]"
              >
                {isCreatingSession ? '생성 중' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
      {cameraSession && (
        <CameraSessionModal
          session={cameraSession}
          sessionName={sessionName}
          onClose={closeCameraSessionModal}
          onStart={startRehearsal}
        />
      )}
    </aside>
  );
}
