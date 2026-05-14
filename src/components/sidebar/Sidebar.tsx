import sidebarAdd from '../../images/icon/sidebar_add.svg';
import sidebarHome from '../../images/icon/sidebar_home.svg';
import sidebarSearch from '../../images/icon/sidebar_search.svg';
import sidebarSetting from '../../images/icon/sidebar_setting.svg';

const sidebarItems = [
  { label: '검색', icon: sidebarSearch },
  { label: '추가', icon: sidebarAdd },
  { label: '설정', icon: sidebarSetting },
  { label: '홈', icon: sidebarHome },
];

export default function Sidebar() {
  return (
    <aside className="fixed bottom-0 left-0 top-0 z-30 flex w-[clamp(52px,5vw,72px)] flex-col items-center justify-end pb-[clamp(48px,9vh,96px)]">
      <nav className="flex flex-col items-center gap-[clamp(12px,1.8vh,18px)]">
        {sidebarItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex h-[clamp(36px,3.4vw,42px)] w-[clamp(36px,3.4vw,42px)] items-center justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
    </aside>
  );
}
