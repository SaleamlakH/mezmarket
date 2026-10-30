import { Link } from 'react-router';

interface BrandProps {
  size?: 'md' | 'lg';
  to?: string;
}

export function Brand({ size = 'md', to = '/' }: BrandProps) {
  const textSize = size === 'md' ? 'text-xl' : 'text-3xl';

  return (
    <Link to={to} className={`font-bold tracking-tight text-(--text) ${textSize}`}>
      Mez<span className="text-(--accent)">Market</span>
    </Link>
  );
}
