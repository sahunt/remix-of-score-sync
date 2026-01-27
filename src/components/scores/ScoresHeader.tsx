import { useUsername } from '@/hooks/useUsername';
import { UserAvatar } from '@/components/home/UserAvatar';
import { LastUploadBadge } from '@/components/LastUploadBadge';
import rainbowBg from '@/assets/rainbow-bg.png';

export function ScoresHeader() {
  const { username, loading } = useUsername();

  return (
    <header
      className="relative px-[28px] pt-[33px] pb-[60px]"
      style={{
        backgroundImage: `url(${rainbowBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Center content - last sync and username */}
      <div className="flex items-center justify-center gap-6">
        <LastUploadBadge variant="header" className="text-foreground" />
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white text-shadow-greeting">
            {loading ? '...' : username}
          </span>
          <UserAvatar size={28} />
        </div>
      </div>
    </header>
  );
}
