import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDashboardPeriodContext } from '../useDashboardPeriodContext';
import { DashboardPeriodProvider } from '../DashboardPeriodProvider';

const NOW = new Date(2026, 9, 21, 15, 30);

function FilterView() {
  const { period, range, customRange, selectPeriod, setCustomRange } = useDashboardPeriodContext();

  return (
    <div>
      <span data-testid="period">{period}</span>
      <span data-testid="range-from">{range.from}</span>
      <span data-testid="custom-range">
        {customRange.start} - {customRange.end}
      </span>
      <button type="button" onClick={() => selectPeriod('week')}>
        Select week
      </button>
      <button
        type="button"
        onClick={() => setCustomRange({ start: '2026-10-01', end: '2026-10-03' })}
      >
        Select custom range
      </button>
    </div>
  );
}

function Harness() {
  const [dashboardVisible, setDashboardVisible] = useState(true);

  return (
    <DashboardPeriodProvider now={NOW}>
      <button type="button" onClick={() => setDashboardVisible((visible) => !visible)}>
        Toggle dashboard
      </button>
      {dashboardVisible ? <FilterView /> : <span>Another page</span>}
    </DashboardPeriodProvider>
  );
}

describe('DashboardPeriodProvider', () => {
  it('defaults to today with the current day range', () => {
    render(
      <DashboardPeriodProvider now={NOW}>
        <FilterView />
      </DashboardPeriodProvider>,
    );

    expect(screen.getByTestId('period')).toHaveTextContent('today');
    expect(screen.getByTestId('range-from')).toHaveTextContent(new Date(2026, 9, 21).toISOString());
  });

  it('keeps the selected period when the dashboard unmounts and remounts', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Select week' }));
    expect(screen.getByTestId('period')).toHaveTextContent('week');

    await user.click(screen.getByRole('button', { name: 'Toggle dashboard' }));
    expect(screen.queryByTestId('period')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle dashboard' }));
    expect(screen.getByTestId('period')).toHaveTextContent('week');
  });

  it('keeps a custom range when the dashboard unmounts and remounts', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Select custom range' }));
    expect(screen.getByTestId('period')).toHaveTextContent('custom');

    await user.click(screen.getByRole('button', { name: 'Toggle dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Toggle dashboard' }));

    expect(screen.getByTestId('period')).toHaveTextContent('custom');
    expect(screen.getByTestId('custom-range')).toHaveTextContent('2026-10-01 - 2026-10-03');
  });
});
