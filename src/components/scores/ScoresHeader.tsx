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
      className="relative px-[28px] pt-[33px] pb-[19px]"
      style={{
        backgroundImage: `url(${rainbowBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Row with back button, sync badge, and username/avatar */}
      <div className="flex items-center justify-between">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center text-foreground -ml-2"
          aria-label="Go back"
        >
          <Icon name="arrow_back" size={28} />
        </button>

        {/* Center content - last sync and username */}
        <div className="flex items-center gap-4">
          <LastUploadBadge className="text-foreground [&_*]:text-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white text-shadow-greeting">
              {loading ? '...' : username}
            </span>
            <UserAvatar size={28} />
          </div>
        </div>

        {/* Spacer to balance the layout */}
        <div className="w-10" />
      </div>
    </header>
  );
}
