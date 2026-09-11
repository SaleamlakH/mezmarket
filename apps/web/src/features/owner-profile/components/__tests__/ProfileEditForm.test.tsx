import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileEditForm } from '../ProfileEditForm';
import { useOwnerProfileForm } from '../../hooks/useOwnerProfileForm';
import type { OwnerApi } from '../../api/ownerApi';
import type { OwnerResponse } from '@mez/types';

vi.mock('../../hooks/useOwnerProfileForm', () => ({
  useOwnerProfileForm: vi.fn(),
}));

const profile: OwnerResponse = {
  id: 'o1',
  name: 'Ada',
  contactEmail: 'ada@example.com',
  contactPhone: '+1234567890',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('ProfileEditForm', () => {
  const mockHandleChange = vi.fn();
  const mockHandleBlur = vi.fn();
  const mockHandleSubmit = vi.fn();
  const onCancel = vi.fn();
  const onSaved = vi.fn();

  const ownerApi = {
    getOwnerProfile: vi.fn(),
    updateOwnerProfile: vi.fn(),
  } as unknown as OwnerApi;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFormDefault();
  });

  function mockFormDefault() {
    vi.mocked(useOwnerProfileForm).mockReturnValue({
      values: {
        name: profile.name,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
      },
      errors: {},
      hasChanges: false,
      isSubmitting: false,
      submitError: null,
      handleChange: mockHandleChange,
      handleBlur: mockHandleBlur,
      handleSubmit: mockHandleSubmit,
    });
  }

  const renderForm = () =>
    render(
      <ProfileEditForm
        ownerApi={ownerApi}
        profile={profile}
        onCancel={onCancel}
        onSaved={onSaved}
      />,
    );

  const saveButton = () => screen.getByRole('button', { name: 'Save' });

  it('renders the profile fields prefilled from the current form values', () => {
    renderForm();

    expect(screen.getByLabelText(/name/i)).toHaveValue('Ada');
    expect(screen.getByLabelText(/contact email/i)).toHaveValue('ada@example.com');
    expect(screen.getByLabelText(/contact phone/i)).toHaveValue('+1234567890');
  });

  it('routes change and blur events to the form handlers', async () => {
    const user = userEvent.setup();
    renderForm();

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'L');

    expect(mockHandleChange).toHaveBeenCalledWith('name', expect.stringContaining('AdaL'));

    fireEvent.blur(nameInput);
    expect(mockHandleBlur).toHaveBeenCalledWith('name');
  });

  it('disables Save while the form has no changes', () => {
    renderForm();
    expect(saveButton()).toBeDisabled();
  });

  it('enables Save once there are changes and submits through handleSubmit', async () => {
    vi.mocked(useOwnerProfileForm).mockReturnValue({
      hasChanges: true,
      isSubmitting: false,
      submitError: null,
      errors: {},
      values: {
        name: 'Ada L.',
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
      },
      handleChange: mockHandleChange,
      handleBlur: mockHandleBlur,
      handleSubmit: mockHandleSubmit,
    });
    mockHandleSubmit.mockImplementation((e) => e.preventDefault());

    const user = userEvent.setup();
    renderForm();

    expect(saveButton()).toBeEnabled();

    await user.click(saveButton());
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables Save and shows a pending state while submitting', () => {
    vi.mocked(useOwnerProfileForm).mockReturnValue({
      hasChanges: true,
      isSubmitting: true,
      submitError: null,
      errors: {},
      values: {
        name: 'Ada L.',
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
      },
      handleChange: mockHandleChange,
      handleBlur: mockHandleBlur,
      handleSubmit: mockHandleSubmit,
    });

    const { container } = renderForm();

    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();
  });

  it('calls onCancel when the user cancels', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders field and form-level errors', () => {
    vi.mocked(useOwnerProfileForm).mockReturnValue({
      hasChanges: true,
      isSubmitting: false,
      submitError: 'Server exploded',
      errors: { name: 'Name is required' },
      values: {
        name: profile.name,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
      },
      handleChange: mockHandleChange,
      handleBlur: mockHandleBlur,
      handleSubmit: mockHandleSubmit,
    });

    renderForm();

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Server exploded')).toBeInTheDocument();
  });
});
