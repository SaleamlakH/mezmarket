import { Link } from 'react-router';

interface BrandProps {
  size?: 'md' | 'lg';
}

export function Brand({ size = 'md' }: BrandProps) {
  const textSize = size === 'md' ? 'text-xl' : 'text-3xl';

  return (
    <Link to="/" className={`font-bold tracking-tight text-(--text) ${textSize}`}>
      Mez<span className="text-(--accent)">Market</span>
    </Link>
  );
}
