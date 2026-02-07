import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { ScoresProvider } from '@/contexts/ScoresContext';
import { EdiOverlay } from '@/components/edi/EdiOverlay';

export function AppLayout() {
  return (
    <ScoresProvider>
      <div className="flex min-h-screen flex-col bg-background w-full max-w-[720px] mx-auto">
        <main className="flex-1 pb-[120px]">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <EdiOverlay />
    </ScoresProvider>
  );
}
