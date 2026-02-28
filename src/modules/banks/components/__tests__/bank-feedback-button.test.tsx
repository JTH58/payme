import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BankFeedbackButton } from '../bank-feedback-button';

// Mock ResizeObserver for Radix Dialog
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('BankFeedbackButton', () => {
  it('should render trigger button', () => {
    render(<BankFeedbackButton bankCode="812" bankShortName="台新銀行" />);
    expect(screen.getByText('資訊有誤？我要回報問題')).toBeInTheDocument();
  });

  it('should open FeedbackModal on click', async () => {
    const user = userEvent.setup();
    render(<BankFeedbackButton bankCode="812" bankShortName="台新銀行" />);

    await user.click(screen.getByText('資訊有誤？我要回報問題'));
    expect(screen.getByText('意見回饋')).toBeInTheDocument();
  });

  it('should pre-fill description with bank info', async () => {
    const user = userEvent.setup();
    render(<BankFeedbackButton bankCode="812" bankShortName="台新銀行" />);

    await user.click(screen.getByText('資訊有誤？我要回報問題'));
    const textarea = screen.getByPlaceholderText(/請詳細描述/);
    expect(textarea).toHaveValue('[812] 台新銀行 — ');
  });
});
