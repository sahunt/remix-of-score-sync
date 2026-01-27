import { useUsername } from '@/hooks/useUsername';
import { useSessionCharacter } from '@/hooks/useSessionCharacter';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { UserAvatar } from '@/components/home/UserAvatar';
import { SearchBar } from '@/components/home/SearchBar';
import { GoalCard } from '@/components/home/GoalCard';
import { cn } from '@/lib/utils';
import rainbowBg from '@/assets/rainbow-bg.png';

export default function Home() {
  const { username, loading: usernameLoading } = useUsername();
  const characterImage = useSessionCharacter();
  const { isVisible } = useScrollDirection({ threshold: 15 });

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search:', query);
  };

  return (
    <div className="relative min-h-screen">
      {/* Rainbow background - fixed */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${rainbowBg})` }}
      />
      
      {/* Character image - fixed, positioned top-right */}
      <img
        src={characterImage}
        alt="Character"
        className="fixed top-0 right-0 w-[240px] h-auto object-contain pointer-events-none z-[5]"
      />
      
      {/* Fixed fade overlay at bottom - reveals rainbow background, syncs with nav */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 h-[200px] pointer-events-none z-[15]",
          "transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-[120px]"
        )}
        style={{ 
          backgroundImage: `url(${rainbowBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)'
        }}
      />
      
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col min-h-screen px-[28px]">
        {/* Header section */}
        <header className="pt-[75px] pb-4">
          {/* Avatar and greeting */}
          <div className="flex items-start gap-2 mb-4">
            <UserAvatar size={40} className="mt-1" />
          </div>
          
          {/* Two-line greeting */}
          <div className="mb-6">
            <span className="text-foreground text-2xl">Hi </span>
            <span className="text-white text-2xl font-bold text-shadow-greeting">
              {usernameLoading ? '...' : username}
            </span>
          </div>

          {/* Search bar */}
          <SearchBar onSearch={handleSearch} />
        </header>

        {/* Goals section */}
        <section className="flex flex-col gap-[3px] mt-[3px]">
          <GoalCard
            title="PFC all 14's"
            type="pfc"
            current={123}
            total={321}
          />
          <GoalCard
            title="MFC 10 songs"
            type="mfc"
            current={2}
            total={10}
          />
          <GoalCard
            title="GFC 2 18's"
            type="gfc"
            current={1}
            total={2}
          />
        </section>
      </div>
    </div>
  );
}
