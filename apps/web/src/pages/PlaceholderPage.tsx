import { EmptyState } from '@/components/EmptyState';

export interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState title={title} description={description} />
    </div>
  );
}
