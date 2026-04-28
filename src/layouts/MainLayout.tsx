import Header from '../components/Header';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <Header />

      <main className="px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
