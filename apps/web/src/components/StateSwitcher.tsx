import { SegmentedControl } from './SegmentedControl';

/**
 * The states a section can render while previewing the UI.
 */
export type SectionState = 'loading' | 'error' | 'empty' | 'ready';

const STATE_LABELS: Record<SectionState, string> = {
  loading: 'Loading',
  error: 'Error',
  empty: 'Empty',
  ready: 'Ready',
};

const STATE_ORDER: SectionState[] = ['loading', 'error', 'empty', 'ready'];

export interface StateSwitcherProps {
  value: SectionState;
  onChange: (state: SectionState) => void;
  label?: string;
}

/**
 * Dev-only scaffolding: flips a section between its loading, error, empty,
 * and ready states so each can be inspected without waiting on the API. Once
 * the API wiring lands, query status drives these states and this switcher is
 * removed.
 */
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
