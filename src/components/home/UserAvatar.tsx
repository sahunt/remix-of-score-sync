import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createAvatar } from '@dicebear/core';
import { funEmoji } from '@dicebear/collection';
import { useAuth } from '@/hooks/useAuth';

interface UserAvatarProps {
  size?: number;
  className?: string;
  linkToProfile?: boolean;
}

export function UserAvatar({ size = 48, className = '', linkToProfile = false }: UserAvatarProps) {
  const { user } = useAuth();

  const avatarSvg = useMemo(() => {
    // Use user ID as seed for consistent avatar per user
    const seed = user?.id || 'default-user';
    const avatar = createAvatar(funEmoji, {
      seed,
      size,
    });
    return avatar.toDataUri();
  }, [user?.id, size]);

  const avatarImg = (
    <img
      src={avatarSvg}
      alt="User avatar"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );

  if (linkToProfile) {
    return (
      <Link to="/profile" className="cursor-pointer">
        {avatarImg}
      </Link>
    );
  }

  return avatarImg;
}
