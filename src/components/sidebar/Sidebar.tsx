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
    </aside>
  );
}
