import { ImageOff } from 'lucide-react';

export interface ProductImageProps {
  size?: number;
  className?: string;
}

export function ProductImage({ size = 40, className = '' }: ProductImageProps) {
  const Icon = ImageOff;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--border) bg-(--surface-secondary) ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.4)} aria-hidden className="text-(--text-muted)" />
    </span>
  );
}
