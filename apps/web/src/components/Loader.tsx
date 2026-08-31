import { Loader2 } from 'lucide-react';

export interface LoaderProps {
  size?: number;
}

export function Loader({ size = 20 }: LoaderProps) {
  return <Loader2 size={size} className="animate-spin text-(--accent)" aria-hidden="true" />;
}
