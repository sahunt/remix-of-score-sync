import { Icon } from '@/components/ui/Icon';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (query: string) => void;
}

/**
 * Controlled search bar for real-time typeahead search.
 */
export function SearchBar({ 
  placeholder = 'Search by song title...', 
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-[23px] py-[16px] bg-secondary rounded-[10px]">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-[13px] font-normal leading-[21px] tracking-[0.3px] placeholder:text-white/60 focus:outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-white ml-3 flex-shrink-0 p-1 hover:bg-white/10 rounded"
          >
            <Icon name="close" size={20} />
          </button>
        ) : (
          <Icon name="search" size={20} className="text-white ml-3 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
