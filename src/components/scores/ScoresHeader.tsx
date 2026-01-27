import { useNavigate } from 'react-router-dom';
import { useUsername } from '@/hooks/useUsername';
import { UserAvatar } from '@/components/home/UserAvatar';
import { LastUploadBadge } from '@/components/LastUploadBadge';
import { Icon } from '@/components/ui/Icon';
import rainbowBg from '@/assets/rainbow-bg.png';

export function ScoresHeader() {
  const navigate = useNavigate();
  const { username, loading } = useUsername();

  return (
    <header
      className="relative px-[28px] pt-[50px] pb-6"
      style={{
        backgroundImage: `url(${rainbowBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute left-[28px] top-[50px] flex h-10 w-10 items-center justify-center text-white"
        aria-label="Go back"
      >
        <Icon name="arrow_back" size={24} />
      </button>

      {/* Center content - last sync and username */}
      <div className="flex flex-col items-center gap-1">
        <LastUploadBadge className="text-white/90 [&_*]:text-white/90" />
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white text-shadow-greeting">
            {loading ? '...' : username}
          </span>
          <UserAvatar size={24} />
        </div>
      </div>
    </header>
  );
}
