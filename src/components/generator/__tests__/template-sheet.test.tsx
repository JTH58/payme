import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSheet } from '../template-sheet';

// Radix Dialog requires ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('TemplateSheet', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render sheet title', () => {
    render(<TemplateSheet {...defaultProps} />);

    expect(screen.getByText('熱門場景')).toBeInTheDocument();
  });

  test('should render "如何使用？" help button', () => {
    render(<TemplateSheet {...defaultProps} />);

    expect(screen.getByText('如何使用？')).toBeInTheDocument();
  });

  test('should render templates in grid layout', () => {
    const { container } = render(<TemplateSheet {...defaultProps} />);

    // Check grid container exists (rendered in portal)
    const grid = document.body.querySelector('.grid.grid-cols-2');
    expect(grid).toBeTruthy();
  });

  test('should render template cards', () => {
    render(<TemplateSheet {...defaultProps} />);

    // templates.json contains "Netflix 合租" and other templates
    expect(screen.getByText('Netflix 合租')).toBeInTheDocument();
  });

  test('should call onSelect and close when template clicked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <TemplateSheet
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByText('Netflix 合租'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String), title: 'Netflix 合租' })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('should not render when closed', () => {
    render(<TemplateSheet {...defaultProps} open={false} />);

    expect(screen.queryByText('熱門場景')).not.toBeInTheDocument();
  });
});
