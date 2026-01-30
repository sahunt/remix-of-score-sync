import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { ScoresProvider } from '@/contexts/ScoresContext';

export function AppLayout() {
  return (
    <ScoresProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 pb-[120px]">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </ScoresProvider>
  );
}
