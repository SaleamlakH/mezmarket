import type { OwnerResponse } from '@mez/types';

export function ProfileDetails({ profile }: { profile: OwnerResponse }) {
  const rows = [
    { label: 'Name', value: profile.name },
    { label: 'Contact Email', value: profile.contactEmail },
    { label: 'Contact Phone', value: profile.contactPhone },
  ];

  return (
    <div className="flex flex-col">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`px-5 py-4 ${index < rows.length - 1 ? 'border-b border-(--border)' : ''}`}
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
            {row.label}
          </p>
          <p className={`text-base ${row.value ? 'text-(--text)' : 'text-(--text-muted)'}`}>
            {row.value ?? 'Not set'}
          </p>
        </div>
      ))}
    </div>
  );
}
