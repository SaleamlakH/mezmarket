import { Badge } from '@/components/Badge';

export function DevFixtureBadge() {
  if (!import.meta.env.DEV) return null;

  return <Badge tone="warning">Dev fixture</Badge>;
}
