import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[120px]">
        <Outlet />
      </main>
      {/* Bottom fade for nav visibility - reveals background */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-[180px] pointer-events-none z-40"
        style={{
          background: 'linear-gradient(0deg, transparent 0%, hsl(230 18% 15%) 70%)'
        }}
      />
      <BottomNav />
    </div>
  );
}
