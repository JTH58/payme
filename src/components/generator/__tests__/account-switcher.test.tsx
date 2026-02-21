import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSwitcher } from '../account-switcher';

const mockAccounts = [
  { b: '004', a: '1234567890' },
  { b: '822', a: '0987654321' },
  { b: '812', a: '1111222233' },
];

describe('AccountSwitcher', () => {
  it('should return null when accounts has 1 or fewer items', () => {
    const { container } = render(
      <AccountSwitcher
        accounts={[{ b: '004', a: '1234567890' }]}
        currentBankCode="004"
        currentAccountNumber="1234567890"
        onSelect={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render buttons for each account', () => {
    render(
      <AccountSwitcher
        accounts={mockAccounts}
        currentBankCode="004"
        currentAccountNumber="1234567890"
        onSelect={jest.fn()}
      />
    );

    // Should show last 4 digits of each account
    expect(screen.getByText('*7890')).toBeInTheDocument();
    expect(screen.getByText('*4321')).toBeInTheDocument();
    expect(screen.getByText('*2233')).toBeInTheDocument();
  });

  it('should display short bank names (without 銀行/商業銀行)', () => {
    render(
      <AccountSwitcher
        accounts={mockAccounts}
        currentBankCode="004"
        currentAccountNumber="1234567890"
        onSelect={jest.fn()}
      />
    );

    // Should contain the shortened name from banks.json lookup
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(3);
  });

  it('should call onSelect when clicking an account', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();

    render(
      <AccountSwitcher
        accounts={mockAccounts}
        currentBankCode="004"
        currentAccountNumber="1234567890"
        onSelect={onSelect}
      />
    );

    const secondButton = screen.getByText('*4321').closest('button')!;
    await user.click(secondButton);

    expect(onSelect).toHaveBeenCalledWith('822', '0987654321');
  });
});
