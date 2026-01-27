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
      {/* Right-aligned content - username and sync below */}
      <div className="flex flex-col items-end gap-1">
        {/* Username row */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white text-shadow-greeting">
            {loading ? '...' : username}
          </span>
          <UserAvatar size={28} />
        </div>
        {/* Sync badge below */}
        <LastUploadBadge variant="header" />
      </div>
    </header>
  );
}
