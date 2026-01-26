import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[120px]">
        <Outlet />
      </main>
      {/* Bottom fade with backdrop blur for nav visibility - reveals background */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-[180px] pointer-events-none z-40"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(180deg, transparent 0%, black 50%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 50%)'
        }}
      />
      <BottomNav />
    </div>
  );
}
