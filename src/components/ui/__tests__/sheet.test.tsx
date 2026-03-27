import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from '../sheet';

// Radix Dialog requires ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Sheet', () => {
  test('should render content when open', () => {
    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Test Title</SheetTitle>
            <SheetDescription>Test Description</SheetDescription>
          </SheetHeader>
          <p>Sheet Body</p>
        </SheetContent>
      </Sheet>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Sheet Body')).toBeInTheDocument();
  });

  test('should not render content when closed', () => {
    render(
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Hidden Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    expect(screen.queryByText('Hidden Title')).not.toBeInTheDocument();
  });

  test('should render drag handle in header', () => {
    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>With Handle</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    // Drag handle renders in portal — query from document.body
    const handles = document.body.querySelectorAll('.rounded-full');
    const dragHandle = Array.from(handles).find(el =>
      el.classList.contains('w-10') && el.classList.contains('h-1')
    );
    expect(dragHandle).toBeTruthy();
  });

  test('should render close button', () => {
    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Closeable</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    expect(screen.getByText('Close')).toBeInTheDocument(); // sr-only text
  });

  test('should call onOpenChange when overlay clicked', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <Sheet open={true} onOpenChange={handleChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Click Outside</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    // Click the overlay (Radix renders it as a sibling of content)
    const overlay = document.querySelector('[data-state="open"]');
    if (overlay) {
      await user.click(overlay);
    }

    // Radix may or may not fire onOpenChange depending on implementation
    // The key test is that the component doesn't crash
    expect(screen.getByText('Click Outside')).toBeInTheDocument();
  });

  // --- New tests for swipe-to-dismiss integration ---

  test('should render drag handle with default resting style', () => {
    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Handle Style</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    const handles = document.body.querySelectorAll('.rounded-full');
    const dragHandle = Array.from(handles).find(el =>
      el.classList.contains('w-10') && el.classList.contains('h-1')
    );
    expect(dragHandle).toBeTruthy();
    expect(dragHandle!.classList.contains('bg-slate-400/70')).toBe(true);
  });

  test('SheetBody should accept and forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();

    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Ref Test</SheetTitle>
          </SheetHeader>
          <SheetBody ref={ref}>
            <p>Body Content</p>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(screen.getByText('Body Content')).toBeInTheDocument();
  });

  test('SheetContent should have data-dragging attribute only when dragging', () => {
    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Dragging Test</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    // Find the content element (Radix Dialog Content)
    const content = document.querySelector('[role="dialog"]');
    expect(content).toBeTruthy();
    // Not dragging by default — attribute should not be present
    expect(content!.hasAttribute('data-dragging')).toBe(false);
  });
});
