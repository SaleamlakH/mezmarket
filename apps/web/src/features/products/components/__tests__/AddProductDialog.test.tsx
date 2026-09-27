import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CreateProductResponse, UnitsResponse } from '@mez/types';
import { AddProductDialog } from '../AddProductDialog';
import { unitsService } from '@/features/products/api/unitsService';
import { productsService } from '@/features/products/api/productsService';

vi.mock('@/features/products/api/unitsService', () => ({
  unitsService: { listUnits: vi.fn() },
}));

vi.mock('@/features/products/api/productsService', () => ({
  productsService: {
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    createProductUpload: vi.fn(),
    putFile: vi.fn(),
    getProductUploadUrls: vi.fn(),
  },
}));

const units: UnitsResponse = {
  dimensions: [
    {
      id: 'd-1',
      name: 'Weight',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      units: [
        {
          id: 'u-1',
          dimensionId: 'd-1',
          name: 'Kilogram',
          symbol: 'kg',
          ratioToReferenceUnit: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'u-2',
          dimensionId: 'd-1',
          name: 'Gram',
          symbol: 'g',
          ratioToReferenceUnit: 0.001,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    {
      id: 'd-2',
      name: 'Volume',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      units: [
        {
          id: 'u-3',
          dimensionId: 'd-2',
          name: 'Liter',
          symbol: 'L',
          ratioToReferenceUnit: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ],
};

const created: CreateProductResponse = {
  id: 'p-1',
  businessId: 'b-1',
  branchId: 'br-1',
  categoryId: null,
  name: 'Honey',
  brand: null,
  description: null,
  trackAsPartial: false,
  lowStockThreshold: null,
  currentSealedStock: 0,
  active: true,
  uploadId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  units: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Each `Field` renders its message as an alert inside its own wrapper, so a
 * field can be checked for an error without depending on the validation copy,
 * which lives in `@mez/validation` and is expected to change.
 */
function fieldError(label: string | RegExp) {
  return within(screen.getByLabelText(label).closest('div') as HTMLElement).queryByRole('alert');
}

function expectFieldError(label: string | RegExp) {
  const alert = fieldError(label);

  expect(alert, `expected the ${label} field to show an error`).not.toBeNull();
  expect(alert?.textContent).toEqual(expect.any(String));
  expect(alert?.textContent).not.toHaveLength(0);
}

describe('AddProductDialog', () => {
  const onCreated = vi.fn();
  const onClose = vi.fn();

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(unitsService.listUnits).mockResolvedValue(units as never);
    vi.mocked(productsService.createProduct).mockResolvedValue(created as never);
  });

  /**
   * Renders the dialog with a valid base unit, then expands the MOU section.
   * The content unit is left for each test to choose.
   */
  async function openMouSection() {
    const user = userEvent.setup();
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    await screen.findByText('Content unit (MOU)');
    await user.type(screen.getByLabelText('Name'), 'Honey');
    await user.type(screen.getByLabelText('Sell price'), '250');

    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Base unit'), 'u-1');
    fireEvent.click(screen.getByText('Content unit (MOU)'));

    return {
      user,
      contentUnit: within(dialog).getByRole('combobox', { name: 'Content unit' }),
    };
  }

  it('shows inline errors for a submitted empty form', async () => {
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    await waitFor(() => expect(fieldError('Name')).not.toBeNull());
    expectFieldError('Name');
    expectFieldError('Base unit');
    expectFieldError('Sell price');
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports the sell price after the field is blurred', async () => {
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    const sellPrice = await screen.findByLabelText('Sell price');
    fireEvent.focus(sellPrice);
    fireEvent.blur(sellPrice);

    await waitFor(() => expect(fieldError('Sell price')).not.toBeNull());
    expectFieldError('Sell price');
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports the product name after the field is blurred', async () => {
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    const name = await screen.findByLabelText('Name');
    fireEvent.focus(name);
    fireEvent.blur(name);

    await waitFor(() => expect(fieldError('Name')).not.toBeNull());
    expectFieldError('Name');
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports the low stock threshold after the field is blurred', async () => {
    const user = userEvent.setup();
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    const lowStock = await screen.findByLabelText(/low stock at/i);
    await user.type(lowStock, '-1');
    fireEvent.blur(lowStock);

    await waitFor(() => expect(fieldError(/low stock at/i)).not.toBeNull());
    expectFieldError(/low stock at/i);
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports the base unit after the field is blurred', async () => {
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    const baseUnit = await screen.findByLabelText('Base unit');
    fireEvent.focus(baseUnit);
    fireEvent.blur(baseUnit);

    await waitFor(() => expect(fieldError('Base unit')).not.toBeNull());
    expectFieldError('Base unit');
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the value becomes valid', async () => {
    const user = userEvent.setup();
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    const name = await screen.findByLabelText('Name');
    fireEvent.focus(name);
    fireEvent.blur(name);
    await waitFor(() => expect(fieldError('Name')).not.toBeNull());

    await user.type(name, 'Honey');

    await waitFor(() => expect(fieldError('Name')).toBeNull());
  });

  it('revalidates the base unit on every change once it has been touched', async () => {
    const user = userEvent.setup();
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    const baseUnit = await screen.findByLabelText('Base unit');
    fireEvent.focus(baseUnit);
    fireEvent.blur(baseUnit);
    await waitFor(() => expect(fieldError('Base unit')).not.toBeNull());

    await user.selectOptions(baseUnit, 'u-1');

    await waitFor(() => expect(fieldError('Base unit')).toBeNull());
  });

  it('keeps the MOU silent when no content unit is selected', async () => {
    const user = userEvent.setup();
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    await screen.findByText('Content unit (MOU)');

    await user.type(screen.getByLabelText('Name'), 'Honey');
    await user.type(screen.getByLabelText('Sell price'), '250');

    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Base unit'), 'u-1');

    fireEvent.click(screen.getByText('Content unit (MOU)'));
    const contentUnit = within(dialog).getByRole('combobox', { name: 'Content unit' });
    const conversionRate = screen.getByLabelText('Conversion rate');

    contentUnit.focus();
    fireEvent.blur(contentUnit);
    fireEvent.blur(conversionRate);

    await waitFor(() => expect(fieldError('Content unit')).toBeNull());
    expect(fieldError('Conversion rate')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    await waitFor(() => expect(productsService.createProduct).toHaveBeenCalledTimes(1));
    expect(productsService.createProduct).toHaveBeenCalledWith(
      'b-1',
      expect.not.objectContaining({ mou: expect.anything() }),
    );
  });

  it('flags a content unit that matches the base unit', async () => {
    const { user, contentUnit } = await openMouSection();

    await user.selectOptions(contentUnit, 'u-1');

    await waitFor(() => expect(fieldError('Content unit')).not.toBeNull());
    expectFieldError('Content unit');
  });

  it('flags a content unit conflict before the sell price is filled in', async () => {
    const user = userEvent.setup();
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    await screen.findByText('Content unit (MOU)');

    // The sell price is deliberately left empty. An empty required price used to
    // abort the schema parse, which silently skipped the content unit rules, so
    // the conflict only appeared once a price had been typed.
    await user.type(screen.getByLabelText('Name'), 'Honey');

    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Base unit'), 'u-1');

    fireEvent.click(screen.getByText('Content unit (MOU)'));
    const contentUnit = within(dialog).getByRole('combobox', { name: 'Content unit' });
    await user.selectOptions(contentUnit, 'u-1');

    await waitFor(() => expect(fieldError('Content unit')).not.toBeNull());
    expectFieldError('Content unit');
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('flags a content unit that shares the base unit dimension', async () => {
    const { user, contentUnit } = await openMouSection();

    // u-2 is a different unit inside the base unit's own dimension.
    await user.selectOptions(contentUnit, 'u-2');

    await waitFor(() => expect(fieldError('Content unit')).not.toBeNull());
    expectFieldError('Content unit');
  });

  it('clears the conversion rate error when the content unit is unset', async () => {
    const { user, contentUnit } = await openMouSection();

    await user.selectOptions(contentUnit, 'u-3');
    await waitFor(() => expect(fieldError('Conversion rate')).not.toBeNull());

    fireEvent.change(contentUnit, { target: { value: '' } });

    await waitFor(() => expect(fieldError('Conversion rate')).toBeNull());
    expect(fieldError('Content unit')).toBeNull();
  });

  it('does not re-create the preview url when the form re-renders', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />,
      { wrapper },
    );

    await screen.findByText('Add photo');
    const input = container.querySelector('#product-image') as HTMLInputElement;
    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await user.upload(input, photo);

    // The preview image is decorative, so it exposes no role and is queried directly.
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    const src = (container.querySelector('img') as HTMLImageElement).getAttribute('src');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    // Typing into a text field does not re-render the form, because react hook
    // form keeps those inputs uncontrolled. Choosing a base unit does: it writes
    // to a watched value, so this is what exercises a re-render.
    await waitFor(() => expect(screen.queryByRole('option', { name: /Kilogram/ })).not.toBeNull());
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Base unit'), 'u-1');

    expect((container.querySelector('img') as HTMLImageElement).getAttribute('src')).toBe(src);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('creates a product with a base unit and an MOU', async () => {
    const user = userEvent.setup();
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    await screen.findByText('Content unit (MOU)');

    await user.type(screen.getByLabelText('Name'), 'Honey');
    await user.type(screen.getByLabelText('Sell price'), '250');

    const dialog = screen.getByRole('dialog');
    const baseUnit = within(dialog).getByLabelText('Base unit');
    await user.selectOptions(baseUnit, 'u-1');

    fireEvent.click(screen.getByText('Content unit (MOU)'));
    const mouUnit = within(dialog).getByRole('combobox', { name: 'Content unit' });
    await user.selectOptions(mouUnit, 'u-3');
    await user.type(screen.getByLabelText('Conversion rate'), '4');

    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    await waitFor(() =>
      expect(productsService.createProduct).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({
          name: 'Honey',
          baseUnit: { unitId: 'u-1', price: 250 },
          mou: { unitId: 'u-3', conversionRate: 4 },
        }),
      ),
    );
    expect(onCreated).toHaveBeenCalledWith(created);
  });
});
