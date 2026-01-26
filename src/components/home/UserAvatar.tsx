import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { funEmoji } from '@dicebear/collection';
import { useAuth } from '@/hooks/useAuth';

interface UserAvatarProps {
  size?: number;
  className?: string;
}

export function UserAvatar({ size = 48, className = '' }: UserAvatarProps) {
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

  return (
    <img
      src={avatarSvg}
      alt="User avatar"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
