// src/components/Header.tsx

import { Menu, Bell, User } from 'lucide-react';

const Header = () => {
  return (
    <header className="w-full h-16 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 hover:bg-gray-100 md:hidden">
            <Menu size={22} />
          </button>

          <h1 className="text-xl font-bold text-gray-900">MyProject</h1>
        </div>

        {/* Center */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-black"
          >
            Home
          </a>
          <a
            href="/projects"
            className="text-sm font-medium text-gray-700 hover:text-black"
          >
            Projects
          </a>
          <a
            href="/members"
            className="text-sm font-medium text-gray-700 hover:text-black"
          >
            Members
          </a>
          <a
            href="/about"
            className="text-sm font-medium text-gray-700 hover:text-black"
          >
            About
          </a>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button className="rounded-full p-2 hover:bg-gray-100">
            <Bell size={20} />
          </button>

          <button className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 hover:bg-gray-50">
            <User size={18} />
            <span className="hidden text-sm font-medium text-gray-700 sm:block">
              Profile
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

/*사용 [아래에]
import Header from "./components/Header";

function App() {
  return (
    <>
      <Header />
      <main className="p-6">
        Content
      </main>
    </>
  );
}

export default App;
 */
