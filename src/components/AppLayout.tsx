import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[120px]">
        <Outlet />
      </main>
      {/* Bottom fade gradient for nav visibility */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-[180px] pointer-events-none z-40"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.85) 70%)'
        }}
      />
      <BottomNav />
    </div>
  );
}
