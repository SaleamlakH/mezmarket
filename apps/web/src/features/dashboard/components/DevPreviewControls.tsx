import { SegmentedControl } from '@/components/SegmentedControl';
import type { SegmentedOption } from '@/components/SegmentedControl';
import {
  DASHBOARD_PREVIEW_ROLE_LABELS,
  type DashboardPreviewMode,
  type DashboardPreviewState,
  type DashboardRolePreview,
} from '../fixtures/dashboardPreview';
import type { DashboardPreviewValue } from '../fixtures/useDashboardPreview';

const MODE_OPTIONS: SegmentedOption<DashboardPreviewMode>[] = [
  { value: 'live', label: 'Live' },
  { value: 'preview', label: 'Preview' },
];

const ROLE_OPTIONS: SegmentedOption<DashboardRolePreview>[] = [
  { value: 'OWNER_MANAGER', label: DASHBOARD_PREVIEW_ROLE_LABELS.OWNER_MANAGER },
  { value: 'CASHIER', label: DASHBOARD_PREVIEW_ROLE_LABELS.CASHIER },
];

const STATE_OPTIONS: SegmentedOption<DashboardPreviewState>[] = [
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
  { value: 'empty', label: 'Empty' },
  { value: 'ready', label: 'Ready' },
];

export function DevPreviewControls({ preview }: { preview: DashboardPreviewValue }) {
  return (
    <div className="mt-4 flex flex-wrap items-start gap-3">
      <div role="group" aria-label="Dashboard data mode">
        <SegmentedControl options={MODE_OPTIONS} value={preview.mode} onChange={preview.setMode} />
      </div>
      {preview.mode === 'preview' && (
        <>
          <div role="group" aria-label="Dashboard preview state">
            <SegmentedControl
              options={STATE_OPTIONS}
              value={preview.state}
              onChange={preview.setState}
            />
          </div>
          <div role="group" aria-label="Dashboard preview role">
            <SegmentedControl
              options={ROLE_OPTIONS}
              value={preview.role}
              onChange={preview.setRole}
            />
          </div>
        </>
      )}
    </div>
  );
}
