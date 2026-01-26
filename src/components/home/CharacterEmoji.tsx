import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { funEmoji } from '@dicebear/collection';

interface CharacterEmojiProps {
  size?: number;
  className?: string;
}

// Generate a session-based seed that changes on each page load
const sessionSeed = `session-${Date.now()}-${Math.random()}`;

export function CharacterEmoji({ size = 200, className = '' }: CharacterEmojiProps) {
  const avatarSvg = useMemo(() => {
    const avatar = createAvatar(funEmoji, {
      seed: sessionSeed,
      size,
    });
    return avatar.toDataUri();
  }, [size]);

  return (
    <img
      src={avatarSvg}
      alt="Character"
      width={size}
      height={size}
      className={className}
    />
  );
}
