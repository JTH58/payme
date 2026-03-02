import { renderHook, act } from "@testing-library/react"
import { useSwipeToDismiss } from "../use-swipe-dismiss"

// Helper to create a mock React.TouchEvent
function mockTouchEvent(
  clientX: number,
  clientY: number,
  target?: EventTarget | null
): React.TouchEvent {
  return {
    touches: [{ clientX, clientY }] as unknown as React.TouchList,
    target: target ?? document.createElement("div"),
  } as unknown as React.TouchEvent
}

describe("useSwipeToDismiss", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test("should start in IDLE state with zero translateY", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss: jest.fn(),
      })
    )

    expect(result.current.translateY).toBe(0)
    expect(result.current.isDragging).toBe(false)
    expect(result.current.isAnimating).toBe(false)
    expect(result.current.dragProgress).toBe(0)
  })

  test("should transition IDLE → MAYBE_DRAG → DRAGGING on downward swipe", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss: jest.fn(),
      })
    )

    // touchstart on header
    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })

    // touchmove down past threshold (>5px)
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 120))
    })

    expect(result.current.isDragging).toBe(true)
    expect(result.current.translateY).toBe(20)
  })

  test("should dismiss when drag exceeds threshold", () => {
    const onDismiss = jest.fn()
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss,
        threshold: 80,
      })
    )

    // Start drag from header
    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 200))
    })

    expect(result.current.isDragging).toBe(true)

    // Release — delta = 100 > threshold 80
    act(() => {
      result.current.contentHandlers.onTouchEnd()
    })

    expect(result.current.isAnimating).toBe(true)

    // After animation duration
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(onDismiss).toHaveBeenCalledTimes(1)
    // State preserved during Radix exit animation (not reset until re-open)
    expect(result.current.isAnimating).toBe(true)
    expect(result.current.translateY).toBeGreaterThan(0)
  })

  test("should snap back when drag does not exceed threshold", () => {
    const onDismiss = jest.fn()
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss,
        threshold: 80,
      })
    )

    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 150))
    })

    // Release — delta = 50 < threshold 80
    act(() => {
      result.current.contentHandlers.onTouchEnd()
    })

    // Should be snapping (animating back)
    expect(result.current.isAnimating).toBe(true)
    expect(result.current.translateY).toBe(0)

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(onDismiss).not.toHaveBeenCalled()
    expect(result.current.isAnimating).toBe(false)
  })

  test("should abort drag on horizontal swipe", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss: jest.fn(),
      })
    )

    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })

    // Horizontal movement greater than vertical
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(120, 103))
    })

    expect(result.current.isDragging).toBe(false)
    expect(result.current.translateY).toBe(0)
  })

  test("should ignore all events when enabled=false", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: false,
        onDismiss: jest.fn(),
      })
    )

    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 200))
    })

    expect(result.current.isDragging).toBe(false)
    expect(result.current.translateY).toBe(0)
  })

  test("should reset stale dismiss state on re-open (enabled: false → true)", () => {
    const onDismiss = jest.fn()
    const { result, rerender } = renderHook(
      (props: { enabled: boolean; onDismiss: () => void }) =>
        useSwipeToDismiss(props),
      {
        initialProps: { enabled: true, onDismiss },
      }
    )

    // Swipe to dismiss
    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 200))
    })
    act(() => {
      result.current.contentHandlers.onTouchEnd()
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Dismiss fired, state preserved for Radix exit
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(result.current.isAnimating).toBe(true)

    // Simulate Radix close → enabled=false (state preserved)
    rerender({ enabled: false, onDismiss })
    expect(result.current.isAnimating).toBe(true)

    // Re-open → stale state should be cleared
    rerender({ enabled: true, onDismiss })
    expect(result.current.translateY).toBe(0)
    expect(result.current.isDragging).toBe(false)
    expect(result.current.isAnimating).toBe(false)
  })

  test("should reset state when enabled changes from true to false", () => {
    const { result, rerender } = renderHook(
      (props: { enabled: boolean; onDismiss: () => void }) =>
        useSwipeToDismiss(props),
      {
        initialProps: {
          enabled: true,
          onDismiss: jest.fn(),
        },
      }
    )

    // Start dragging
    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 150))
    })
    expect(result.current.isDragging).toBe(true)

    // Disable
    rerender({ enabled: false, onDismiss: jest.fn() })

    expect(result.current.isDragging).toBe(false)
    expect(result.current.translateY).toBe(0)
  })

  test("should not allow body drag when scrollTop > 0", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss: jest.fn(),
      })
    )

    // Mock body element with scrollTop > 0
    const bodyEl = document.createElement("div")
    Object.defineProperty(bodyEl, "scrollTop", { value: 50, writable: true })
    // @ts-expect-error -- assigning to read-only ref for testing
    result.current.bodyRef.current = bodyEl

    // Touch starts inside body
    const bodyChild = document.createElement("span")
    bodyEl.appendChild(bodyChild)

    act(() => {
      result.current.contentHandlers.onTouchStart(
        mockTouchEvent(100, 100, bodyChild)
      )
    })
    act(() => {
      result.current.contentHandlers.onTouchMove(
        mockTouchEvent(100, 120, bodyChild)
      )
    })

    // Should NOT enter dragging because scrollTop > 0
    expect(result.current.isDragging).toBe(false)
  })

  test("should always allow drag from header regardless of body scroll", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss: jest.fn(),
      })
    )

    // Mock body element with scrollTop > 0
    const bodyEl = document.createElement("div")
    Object.defineProperty(bodyEl, "scrollTop", { value: 100, writable: true })
    // @ts-expect-error -- assigning to read-only ref for testing
    result.current.bodyRef.current = bodyEl

    // Touch starts on HEADER (uses headerHandlers)
    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 120))
    })

    expect(result.current.isDragging).toBe(true)
  })

  test("should clamp translateY to minimum 0 (no upward drag)", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss: jest.fn(),
      })
    )

    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    // Move down first to enter DRAGGING
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 120))
    })
    // Then move back up past origin
    act(() => {
      result.current.contentHandlers.onTouchMove(mockTouchEvent(100, 80))
    })

    expect(result.current.translateY).toBe(0)
  })

  test("touchEnd during MAYBE_DRAG should reset to IDLE", () => {
    const { result } = renderHook(() =>
      useSwipeToDismiss({
        enabled: true,
        onDismiss: jest.fn(),
      })
    )

    act(() => {
      result.current.headerHandlers.onTouchStart(mockTouchEvent(100, 100))
    })
    // End without enough movement
    act(() => {
      result.current.contentHandlers.onTouchEnd()
    })

    expect(result.current.isDragging).toBe(false)
    expect(result.current.isAnimating).toBe(false)
    expect(result.current.translateY).toBe(0)
  })
})
