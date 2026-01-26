import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[120px]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
