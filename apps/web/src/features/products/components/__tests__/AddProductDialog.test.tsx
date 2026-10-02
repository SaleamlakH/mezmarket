import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CreateProductResponse, UnitsResponse } from '@mez/types';
import { AddProductDialog } from '../AddProductDialog';
import { unitsService } from '@/features/products/api/unitsService';
import { productsService } from '@/features/products/api/productsService';
import { ApiError } from '@/lib/apiClient';

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

/**
 * A field of the unit that is open. Only one card is ever open, so it is found by
 * that fact rather than by counting, and the fields that are shut cannot be mistaken
 * for it.
 */
function openUnitPanel() {
  const toggle = screen.getByRole('button', { expanded: true });
  return document.getElementById(toggle.getAttribute('aria-controls') as string) as HTMLElement;
}

function unitField(label: string) {
  return within(openUnitPanel()).getByLabelText(label);
}

function unitFieldError(label: string) {
  return within(unitField(label).closest('div') as HTMLElement).queryByRole('alert');
}

/** A unit's card by its heading, whether it is open or shut. */
function unitToggle(label: string) {
  return screen.getByRole('button', { name: label });
}
function unitCard(label: string) {
  return unitToggle(label).closest('div')?.parentElement as HTMLElement;
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
    // Authorization is requested as soon as a photo is chosen, so the mock has
    // to answer before the file input's change handler settles.
    vi.mocked(productsService.createProductUpload).mockResolvedValue({
      upload: { id: 'up-1' },
      uploadUrl: 'https://bucket.example/up-1',
    } as never);
    vi.mocked(productsService.putFile).mockResolvedValue(undefined as never);
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

  /**
   * Fills in the product itself and steps past it, since every product now carries a
   * question about its own units before it can be created.
   */
  async function reachCustomUnitsStep(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Name'), 'Honey');
    await user.type(screen.getByLabelText('Sell price'), '250');

    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Base unit'), 'u-1');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await screen.findByText(/Step 2 of 2/);
    return dialog;
  }

  it('shows inline errors for a submitted empty form', async () => {
    render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
      wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(fieldError('Name')).not.toBeNull());
    expectFieldError('Name');
    expectFieldError('Base unit');
    expectFieldError('Sell price');
    expect(productsService.createProduct).not.toHaveBeenCalled();
    // The product itself is not finished, so its own units are not asked for yet.
    expect(screen.queryByText(/Step 2 of 2/)).toBeNull();
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

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText(/Step 2 of 2/);
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

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

  describe('custom units', () => {
    it('creates a product with no custom units without asking about them', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);

      expect(screen.getByRole('heading', { name: 'Add custom units' })).toBeInTheDocument();
      expect(
        screen.getByText('A portion of this product, or a friendlier name for a unit.'),
      ).toBeInTheDocument();
      // Nothing says the step is empty: being asked about units and having none yet
      // is not a surprise worth spending the space on.
      expect(screen.queryByText('No custom units')).toBeNull();
      expect(screen.queryByText(/Most products are only/)).toBeNull();
      expect(screen.getByRole('button', { name: 'Add a unit' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
      expect(productsService.createProduct).toHaveBeenCalledTimes(1);
      // An empty set is left off the request entirely, the same as a content unit
      // that was never filled in.
      expect(
        vi.mocked(productsService.createProduct).mock.calls[0]?.[1]?.customUnits,
      ).toBeUndefined();
      expect(onCreated).toHaveBeenCalledWith(created);
    });

    /**
     * Enter in a field submits the form without consulting any button, and a browser
     * does it whether or not the button under the cursor says `type="button"`. The
     * step decides what submitting means, so moving off the first one can never
     * create the product.
     */
    it('treats a submission on the first step as moving on, not as creating', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await user.type(screen.getByLabelText('Name'), 'Honey');
      await user.type(screen.getByLabelText('Sell price'), '250');
      const dialog = screen.getByRole('dialog');
      await user.selectOptions(within(dialog).getByLabelText('Base unit'), 'u-1');

      fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);

      await screen.findByText(/Step 2 of 2/);
      expect(productsService.createProduct).not.toHaveBeenCalled();
      expect(onCreated).not.toHaveBeenCalled();
    });

    /**
     * The defect this guards: a browser runs a click's default action *after* every
     * listener, so if React reuses the button that moved the step and rewrites its
     * type in place, the press that was meant to move on is also activated as the
     * button that submits. The product is then created on arrival at step 2. Asserted
     * on the node itself, because that is the part jsdom does not model for us.
     */
    it('does not let the button that moves the step become the button that submits', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await user.type(screen.getByLabelText('Name'), 'Honey');
      await user.type(screen.getByLabelText('Sell price'), '250');
      const dialog = screen.getByRole('dialog');
      await user.selectOptions(within(dialog).getByLabelText('Base unit'), 'u-1');

      const pressed = screen.getByRole('button', { name: 'Next' });
      await user.click(pressed);

      const create = await screen.findByRole('button', { name: 'Create product' });
      expect(create).not.toBe(pressed);
      expect(pressed.isConnected).toBe(false);
      expect(create).toHaveAttribute('type', 'submit');
    });

    it('keeps a first-step submission from creating the product when the product is not finished', async () => {
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      const dialog = screen.getByRole('dialog');

      fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);

      await waitFor(() => expect(fieldError('Name')).not.toBeNull());
      expect(screen.queryByText(/Step 2 of 2/)).toBeNull();
      expect(productsService.createProduct).not.toHaveBeenCalled();
    });

    it('adds a unit that opens itself, offering buying and selling by default', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));

      expect(unitToggle('Unit 1')).toHaveAttribute('aria-expanded', 'true');
      expect(await unitField('Name')).toHaveValue('');
      expect(screen.getByLabelText('Unit 1 can be purchased in')).toBeChecked();
      expect(screen.getByLabelText('Unit 1 can be sold in')).toBeChecked();
    });

    it('sends a unit with a name, a rate and a price', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));

      await user.type(unitField('Name'), 'Shot');
      await user.type(screen.getByLabelText('Conversion rate'), '0.125');
      await user.type(unitField('Price'), '45');

      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() =>
        expect(productsService.createProduct).toHaveBeenCalledWith(
          'b-1',
          expect.objectContaining({
            customUnits: [
              {
                name: 'Shot',
                dependsOn: 'BASE',
                conversionRate: 0.125,
                price: 45,
                purchaseCapable: true,
                sellCapable: true,
              },
            ],
          }),
        ),
      );
    });

    it('drops the price from a unit that is only bought', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));

      await user.type(unitField('Name'), 'Box');
      await user.type(screen.getByLabelText('Conversion rate'), '12');
      await user.click(screen.getByLabelText('Box can be sold in'));

      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() =>
        expect(productsService.createProduct).toHaveBeenCalledWith(
          'b-1',
          expect.objectContaining({
            customUnits: [
              {
                name: 'Box',
                dependsOn: 'BASE',
                conversionRate: 12,
                purchaseCapable: true,
                sellCapable: false,
              },
            ],
          }),
        ),
      );
    });

    it('keeps two units apart and removes the one asked for', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.type(screen.getByLabelText('Conversion rate'), '0.125');
      await user.type(unitField('Price'), '45');

      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Box');
      await user.type(unitField('Conversion rate'), '12');
      await user.type(unitField('Price'), '120');

      await user.click(screen.getByRole('button', { name: 'Remove Shot' }));

      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() =>
        expect(productsService.createProduct).toHaveBeenCalledWith(
          'b-1',
          expect.objectContaining({
            customUnits: [
              {
                name: 'Box',
                dependsOn: 'BASE',
                conversionRate: 12,
                price: 120,
                purchaseCapable: true,
                sellCapable: true,
              },
            ],
          }),
        ),
      );
    });

    it('refuses a sellable unit with no price, naming the price', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.type(screen.getByLabelText('Conversion rate'), '0.125');

      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() => expect(unitFieldError('Price')).not.toBeNull());
      expect(productsService.createProduct).not.toHaveBeenCalled();
    });

    it('refuses two units sharing a name, naming the second', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.type(screen.getByLabelText('Conversion rate'), '0.125');
      await user.type(unitField('Price'), '45');

      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'shot');
      await user.type(unitField('Conversion rate'), '12');
      await user.type(unitField('Price'), '120');

      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() => expect(unitFieldError('Name')).not.toBeNull());
      expect(productsService.createProduct).not.toHaveBeenCalled();
    });

    it('refuses a unit based on a content unit the product does not have', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Label');
      await user.selectOptions(unitField('Based on'), 'MOU');
      await user.type(screen.getByLabelText('Conversion rate'), '3');
      await user.type(unitField('Price'), '5');

      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() => expect(unitFieldError('Based on')).not.toBeNull());
      expect(productsService.createProduct).not.toHaveBeenCalled();
    });

    it('takes a unit back to the product without losing what was typed', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');

      await user.click(screen.getByRole('button', { name: 'Back' }));
      await screen.findByText(/Step 1 of 2/);

      await user.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByText(/Step 2 of 2/);

      // Nothing is left open behind the user: what the unit is called is said on its
      // shut card, and it opens when it is asked for.
      expect(unitToggle('Shot')).toHaveAttribute('aria-expanded', 'false');
      await user.click(unitToggle('Shot'));
      expect(unitField('Name')).toHaveValue('Shot');
    });

    it('calls a card after the unit it holds, and the removal after it too', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));

      // With nothing typed there is nothing to call it but its position.
      expect(unitToggle('Unit 1')).toBeInTheDocument();

      await user.type(unitField('Name'), 'Shot');

      expect(unitToggle('Shot')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Unit 1/ })).toBeNull();
      expect(screen.getByRole('button', { name: 'Remove Shot' })).toBeInTheDocument();
    });

    it('sums up what a unit is worth while its card is shut', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.type(unitField('Conversion rate'), '0.125');
      await user.type(unitField('Price'), '45');

      await user.click(unitToggle('Shot'));

      // A shut card cannot show its own fields, so it says what they were worth: the
      // rate in the unit it is based on, the price, and what the unit may be used for.
      const card = within(unitCard('Shot'));
      expect(card.getByText('1 kg = 0.125 Shot')).toBeInTheDocument();
      expect(card.getByText('45')).toBeInTheDocument();
      expect(card.getByText('Buy & sell')).toBeInTheDocument();
    });

    it('leaves out what a unit has not been given yet', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Box');
      await user.type(unitField('Conversion rate'), '12');
      await user.type(unitField('Price'), '5');
      await user.click(screen.getByLabelText('Box can be sold in'));

      await user.click(unitToggle('Box'));

      // Bought but not sold: a price is not part of what the unit is, so it is left
      // out rather than quoted at a value that is no longer charged.
      const card = within(unitCard('Box'));
      expect(card.getByText('1 kg = 12 Box')).toBeInTheDocument();
      expect(card.getByText('Buy only')).toBeInTheDocument();
      expect(card.queryByText('5')).toBeNull();
    });

    it('opens one unit at a time', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Box');

      // Adding the second unit opened it, which shut the first.
      expect(unitToggle('Box')).toHaveAttribute('aria-expanded', 'true');
      expect(unitToggle('Shot')).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(1);

      await user.click(unitToggle('Shot'));

      expect(unitToggle('Shot')).toHaveAttribute('aria-expanded', 'true');
      expect(unitToggle('Box')).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(1);
    });

    it('leaves every unit shut when the step is left and returned to', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Box');

      await user.click(screen.getByRole('button', { name: 'Back' }));
      await screen.findByText(/Step 1 of 2/);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByText(/Step 2 of 2/);

      expect(unitToggle('Shot')).toHaveAttribute('aria-expanded', 'false');
      expect(unitToggle('Box')).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0);
      // The units are still there to be added to.
      expect(screen.getByRole('button', { name: 'Add a unit' })).toBeInTheDocument();
    });

    it('reports what is wrong with a shut unit, since its fields cannot be seen', async () => {
      const user = userEvent.setup();
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Box');

      // Shot is shut, and its rate was never given, so the card has to say so.
      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() =>
        expect(within(unitCard('Shot')).getByRole('alert')).toHaveTextContent(
          'Conversion rate is required',
        ),
      );
      expect(productsService.createProduct).not.toHaveBeenCalled();
    });

    it('shows a server refusal on the unit it belongs to', async () => {
      const user = userEvent.setup();
      vi.mocked(productsService.createProduct).mockRejectedValueOnce(
        new ApiError({
          code: 'BAD_REQUEST',
          message: 'This product already has a unit named "Shot"',
          details: { 'customUnits.0.name': 'This product already has a unit named "Shot"' },
          status: 400,
        }),
      );
      render(<AddProductDialog open businessId="b-1" onClose={onClose} onCreated={onCreated} />, {
        wrapper,
      });

      await screen.findByText('Content unit (MOU)');
      await reachCustomUnitsStep(user);
      await user.click(screen.getByRole('button', { name: 'Add a unit' }));
      await user.type(unitField('Name'), 'Shot');
      await user.type(screen.getByLabelText('Conversion rate'), '0.125');
      await user.type(unitField('Price'), '45');

      await user.click(screen.getByRole('button', { name: 'Create product' }));

      await waitFor(() =>
        expect(unitFieldError('Name')?.textContent).toBe(
          'This product already has a unit named "Shot"',
        ),
      );
    });
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

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText(/Step 2 of 2/);
    await user.click(screen.getByRole('button', { name: 'Create product' }));

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
