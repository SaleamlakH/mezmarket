import { Search } from 'lucide-react';
import { Button } from './Button';
import { Filter } from 'lucide-react';

export interface SearchInputProps {
  placeholder?: string;
  onFilter?: () => void;
  value?: string;
  onChange?: (value: string) => void;
}

export function SearchInput({
  placeholder = 'Search…',
  onFilter,
  value,
  onChange,
}: SearchInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-(--border) bg-(--field) px-3 text-(--text-muted)">
        <Search size={14} strokeWidth={2} />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="focus-ring h-full w-full border-none bg-transparent text-[13px] text-(--text) outline-none placeholder:text-(--text-muted)"
        />
      </label>
      {onFilter && (
        <Button
          type="button"
          shape="square"
          variant="field"
          aria-label="Filter"
          title="Filter"
          onClick={onFilter}
        >
          <Filter size={16} aria-hidden />
        </Button>
      )}
    </div>
  );
}
