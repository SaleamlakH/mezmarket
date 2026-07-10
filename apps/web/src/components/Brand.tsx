interface BrandProps {
  size?: 'sm' | 'md';
}

export function Brand({ size = 'md' }: BrandProps) {
  const textSize = size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <div className={`font-bold tracking-tight text-(--text) ${textSize}`}>
      Mez<span className="text-(--accent)">Market</span>
    </div>
  );
}
