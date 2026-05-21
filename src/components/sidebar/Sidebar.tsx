import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProjectSession } from '../../apis/session';
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

const sessionCategories = ['장면별 연습', '워크쓰루', '런쓰루', '텐투텐'];

export default function Sidebar() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isNamingSession, setIsNamingSession] = useState(false);
  const [sessionCreationError, setSessionCreationError] = useState<
    string | null
  >(null);
  const [sessionNameInput, setSessionNameInput] = useState('새 리허설 세션');
  const [selectedSessionCategory, setSelectedSessionCategory] =
    useState('장면별 연습');

  const handleItemClick = (label: string) => {
    if (label !== '추가' || isCreatingSession) return;

    setSessionNameInput('새 리허설 세션');
    setSelectedSessionCategory('장면별 연습');
    setIsNamingSession(true);
  };

  const cancelSessionCreation = () => {
    if (isCreatingSession) return;

    setIsNamingSession(false);
    setSessionCreationError(null);
    setSessionNameInput('새 리허설 세션');
    setSelectedSessionCategory('장면별 연습');
  };

  const createNamedSession = async () => {
    const nextSessionName = sessionNameInput.trim();

    if (!nextSessionName || isCreatingSession) return;

    setIsCreatingSession(true);
    setSessionCreationError(null);

    try {
      const nextProjectId = Number(projectId);

      if (Number.isNaN(nextProjectId)) {
        throw new Error('Cannot create session without a valid project id');
      }

      const nextProjectSession = await createProjectSession(nextProjectId, {
        title: nextSessionName,
        s_category: selectedSessionCategory,
      });

      setIsNamingSession(false);
      navigate(
        `/project/${nextProjectSession.project_id}/workspace/${nextProjectSession.session_id}/feedback`,
        {
          state: {
            openCameraSession: true,
            projectSessionTitle: nextProjectSession.title,
          },
        },
      );
    } catch (error) {
      console.error('Failed to create session', error);
      setSessionCreationError('세션을 생성하지 못했습니다.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <aside
      className="pointer-events-none fixed bottom-0 left-0 top-0 z-30 flex w-[258px] flex-col justify-end overflow-hidden bg-contain bg-left-bottom bg-no-repeat pb-[clamp(48px,9vh,96px)]"
      style={{ backgroundImage: `url(${sidebarLight})` }}
    >
      <nav className="pointer-events-auto self-start ml-[52px] flex flex-col items-center gap-4">
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
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/35 bg-[#efe6de]/90 p-6 text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="mb-5">
              <h2 className="text-lg font-bold">새 세션 만들기</h2>
              <p className="mt-1 text-sm font-semibold text-[#806b61]">
                리허설 세션 이름과 카테고리를 입력하세요.
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
              className="reaction-glass-field mt-2 h-12 w-full rounded-full px-5 text-sm font-semibold text-[#fff8ef] outline-none transition duration-300 placeholder:text-[#fff8ef]/58 hover:scale-[1.01] focus:scale-[1.01] focus:ring-2 focus:ring-white/35"
              placeholder="예: 5회차 런스루"
            />

            <div className="mt-4">
              <p className="block text-xs font-bold text-[#806b61]">
                카테고리
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {sessionCategories.map((category) => {
                  const isSelected = selectedSessionCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedSessionCategory(category)}
                      className={[
                        'h-9 rounded-full border px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/30',
                        isSelected
                          ? 'border-[#431B1B] bg-[#431B1B] text-[#fff8ef]'
                          : 'border-[#c8b7aa] bg-white/26 text-[#806b61] hover:border-[#431B1B] hover:text-[#431B1B]',
                      ].join(' ')}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

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
                className="reaction-glass-pill reaction-rehearsal-start-button relative h-10 overflow-hidden rounded-full px-5 text-sm font-bold text-[#fff8ef] transition duration-300 hover:scale-[1.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:scale-100 disabled:opacity-55"
              >
                <span className="relative z-10">
                  {isCreatingSession ? '생성 중' : '생성'}
                </span>
              </button>
            </div>
            {sessionCreationError && (
              <p className="mt-3 text-xs font-semibold text-[#A94444]">
                {sessionCreationError}
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
