import { useAuth } from '@/hooks/useAuth';
import { useUsername } from '@/hooks/useUsername';
import { UserAvatar } from '@/components/home/UserAvatar';
import { CharacterEmoji } from '@/components/home/CharacterEmoji';
import { SearchBar } from '@/components/home/SearchBar';
import { GoalCard } from '@/components/home/GoalCard';
import rainbowBg from '@/assets/rainbow-bg.png';
export default function Home() {
  const {
    signOut
  } = useAuth();
  const {
    username,
    loading: usernameLoading
  } = useUsername();
  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search:', query);
  };
  return <div className="relative min-h-screen">
      {/* Rainbow background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(${rainbowBg})`
    }} />
      
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header section */}
        <header className="px-4 pt-6 pb-4">
          {/* Top bar with avatar and greeting */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <UserAvatar size={48} />
              <div className="bg-card/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50">
                <span className="text-foreground font-medium pt-[75px]">
                  Hi {usernameLoading ? '...' : username}
                </span>
              </div>
            </div>
            <button onClick={signOut} className="p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card transition-colors" aria-label="Sign out">
              <span className="material-symbols-rounded text-foreground text-xl">logout</span>
            </button>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Goals</h2>
            <button className="text-sm text-primary font-medium hover:underline">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Placeholder goal cards */}
            <GoalCard title="Get AAA on Paranoia" subtitle="ESP Lv.18" progress={75} iconName="stars" variant="accent" />
            <GoalCard title="Clear 10 songs today" subtitle="7/10 completed" progress={70} iconName="check_circle" />
            <GoalCard title="Improve MAX combo" subtitle="Current best: 342" iconName="trending_up" />
          </div>
        </section>
      </div>
    </div>;
}