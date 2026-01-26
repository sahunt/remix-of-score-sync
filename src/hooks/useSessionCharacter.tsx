import { useMemo } from 'react';

import character1 from '@/assets/characters/character-1.png';
import character2 from '@/assets/characters/character-2.png';
import character3 from '@/assets/characters/character-3.png';
import character4 from '@/assets/characters/character-4.png';
import character5 from '@/assets/characters/character-5.png';
import character6 from '@/assets/characters/character-6.png';

// Character library - add more images here to expand the collection
const characters = [
  character1,
  character2,
  character3,
  character4,
  character5,
  character6,
];

// Generate a session-based seed that persists until page reload
const sessionIndex = Math.floor(Math.random() * characters.length);

export function useSessionCharacter() {
  const character = useMemo(() => {
    return characters[sessionIndex];
  }, []);

  return character;
}
