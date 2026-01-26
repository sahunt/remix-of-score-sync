import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({ placeholder = 'Search by song title...', onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center justify-between px-[23px] py-[16px] bg-secondary rounded-[10px]">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-[13px] font-normal leading-[21px] tracking-[0.3px] placeholder:text-white/60 focus:outline-none"
        />
        <Icon name="search" size={20} className="text-white ml-3 flex-shrink-0" />
      </div>
    </form>
  );
}
