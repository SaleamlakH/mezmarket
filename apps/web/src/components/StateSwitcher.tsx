import { SegmentedControl } from './SegmentedControl';

/** The states a section can render. */
export type SectionState = 'loading' | 'error' | 'empty' | 'ready' | 'success';

const STATE_LABELS: Record<SectionState, string> = {
  loading: 'Loading',
  error: 'Error',
  empty: 'Empty',
  ready: 'Ready',
  success: 'Success',
};

const STATE_ORDER: SectionState[] = ['loading', 'error', 'empty', 'ready', 'success'];

export interface StateSwitcherProps {
  value: SectionState;
  onChange: (state: SectionState) => void;
  label?: string;
}

/** Dev-only control that flips a section between its states. */
export function StateSwitcher({ value, onChange, label = 'Section state' }: StateSwitcherProps) {
  return (
    <div role="group" aria-label={label}>
      <SegmentedControl
        options={STATE_ORDER.map((state) => ({ value: state, label: STATE_LABELS[state] }))}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
