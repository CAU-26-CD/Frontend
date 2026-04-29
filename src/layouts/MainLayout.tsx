import Header from '../components/Header';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100">
      <Header />

      <main className="min-h-0 flex-1 overflow-hidden px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
