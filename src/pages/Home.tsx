import { useAuth } from '@/hooks/useAuth';
import { useUsername } from '@/hooks/useUsername';
import { UserAvatar } from '@/components/home/UserAvatar';
import { CharacterEmoji } from '@/components/home/CharacterEmoji';
import { SearchBar } from '@/components/home/SearchBar';
import { GoalCard } from '@/components/home/GoalCard';
import rainbowBg from '@/assets/rainbow-bg.png';

export default function Home() {
  const { } = useAuth();
  const { username, loading: usernameLoading } = useUsername();

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search:', query);
  };

  return (
    <div className="relative min-h-screen">
      {/* Rainbow background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${rainbowBg})` }}
      />
      
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header section */}
        <header className="px-4 pt-6 pb-4">
          {/* Top bar with avatar and greeting */}
          <div className="flex items-center gap-3 mb-6">
            <UserAvatar size={44} />
            <span className="text-foreground font-medium text-lg text-shadow-greeting">
              Hi{usernameLoading ? '...' : username}
            </span>
          </div>

          {/* Search bar */}
          <SearchBar onSearch={handleSearch} />
        </header>

        {/* Character section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <CharacterEmoji size={180} className="drop-shadow-2xl" />
        </div>

        {/* Goals section */}
        <section className="px-4 pb-24">
          <div className="space-y-3">
            <GoalCard
              title="Paranoia"
              difficulty="ESP"
              level={18}
              type="pfc"
              current={12}
              total={33}
            />
            <GoalCard
              title="MAX 300"
              difficulty="CSP"
              level={17}
              type="mfc"
              current={8}
              total={25}
            />
            <GoalCard
              title="Pluto Relinquish"
              difficulty="ESP"
              level={16}
              type="gfc"
              current={21}
              total={30}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
