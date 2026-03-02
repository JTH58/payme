"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

type SwipeState = "IDLE" | "MAYBE_DRAG" | "DRAGGING" | "DISMISSING" | "SNAPPING"

interface UseSwipeDismissOptions {
  enabled: boolean
  onDismiss: () => void
  threshold?: number
}

interface SwipeResult {
  contentRef: React.RefObject<HTMLDivElement | null>
  bodyRef: React.RefObject<HTMLDivElement | null>
  translateY: number
  isDragging: boolean
  isAnimating: boolean
  dragProgress: number
  headerHandlers: { onTouchStart: (e: React.TouchEvent) => void }
  contentHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

const ANIMATION_DURATION = 300

export function useSwipeToDismiss({
  enabled,
  onDismiss,
  threshold = 80,
}: UseSwipeDismissOptions): SwipeResult {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const [translateY, setTranslateY] = useState(0)
  const [state, setState] = useState<SwipeState>("IDLE")

  // Refs to avoid stale closures in native event listeners
  const stateRef = useRef<SwipeState>("IDLE")
  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const currentYRef = useRef(0)
  const isHeaderTouchRef = useRef(false)
  const onDismissRef = useRef(onDismiss)
  const thresholdRef = useRef(threshold)
  const enabledRef = useRef(enabled)

  // Keep refs in sync
  onDismissRef.current = onDismiss
  thresholdRef.current = threshold
  enabledRef.current = enabled

  const updateState = useCallback((newState: SwipeState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  // Reset state on open/close transitions
  // useLayoutEffect prevents single-frame flash on re-open
  useLayoutEffect(() => {
    if (!enabled) {
      // During swipe dismiss, preserve off-screen state for Radix exit animation
      if (stateRef.current === "DISMISSING") return

      updateState("IDLE")
      setTranslateY(0)
      startYRef.current = 0
      currentYRef.current = 0
      isHeaderTouchRef.current = false
    } else if (stateRef.current !== "IDLE") {
      // On re-open: clear stale dismiss state before paint
      updateState("IDLE")
      setTranslateY(0)
      startYRef.current = 0
      currentYRef.current = 0
      isHeaderTouchRef.current = false
    }
  }, [enabled, updateState])

  const isInBody = useCallback((target: EventTarget | null): boolean => {
    if (!bodyRef.current || !target) return false
    return bodyRef.current.contains(target as Node)
  }, [])

  const canDragFromBody = useCallback((): boolean => {
    if (!bodyRef.current) return true
    return bodyRef.current.scrollTop <= 0
  }, [])

  const handleTouchStartHeader = useCallback(
    (e: React.TouchEvent) => {
      if (!enabledRef.current) return
      const touch = e.touches[0]
      startYRef.current = touch.clientY
      startXRef.current = touch.clientX
      currentYRef.current = touch.clientY
      isHeaderTouchRef.current = true
      updateState("MAYBE_DRAG")
    },
    [updateState]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabledRef.current) return
      if (stateRef.current !== "IDLE") return
      const touch = e.touches[0]
      startYRef.current = touch.clientY
      startXRef.current = touch.clientX
      currentYRef.current = touch.clientY
      isHeaderTouchRef.current = false
      updateState("MAYBE_DRAG")
    },
    [updateState]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabledRef.current) return
      const touch = e.touches[0]
      currentYRef.current = touch.clientY

      const deltaY = touch.clientY - startYRef.current
      const deltaX = touch.clientX - startXRef.current

      if (stateRef.current === "MAYBE_DRAG") {
        // Need enough movement to decide direction
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
          // Horizontal swipe — bail out
          updateState("IDLE")
          return
        }

        if (deltaY > 5) {
          // Downward movement — check if we can drag
          if (isHeaderTouchRef.current || !isInBody(e.target) || canDragFromBody()) {
            updateState("DRAGGING")
            setTranslateY(deltaY)
          } else {
            // Body has scroll content — let native scroll handle it
            updateState("IDLE")
          }
        }
        // If deltaY <= 5, stay in MAYBE_DRAG (user still deciding)
        return
      }

      if (stateRef.current === "DRAGGING") {
        // Clamp: only allow downward movement (min 0)
        const clampedY = Math.max(0, deltaY)
        setTranslateY(clampedY)
      }
    },
    [updateState, isInBody, canDragFromBody]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabledRef.current) return

    if (stateRef.current === "MAYBE_DRAG") {
      updateState("IDLE")
      setTranslateY(0)
      return
    }

    if (stateRef.current !== "DRAGGING") return

    const deltaY = currentYRef.current - startYRef.current

    if (deltaY >= thresholdRef.current) {
      // Dismiss
      updateState("DISMISSING")
      // Animate to full height then dismiss
      const contentHeight = contentRef.current?.offsetHeight ?? 500
      setTranslateY(contentHeight)

      setTimeout(() => {
        onDismissRef.current()
        // State preserved for Radix exit animation — reset happens on next open
      }, ANIMATION_DURATION)
    } else {
      // Snap back
      updateState("SNAPPING")
      setTranslateY(0)

      setTimeout(() => {
        updateState("IDLE")
      }, ANIMATION_DURATION)
    }
  }, [updateState])

  // Register native touchmove with { passive: false } for preventDefault
  useEffect(() => {
    const el = contentRef.current
    if (!el || !enabled) return

    const onNativeTouchMove = (e: TouchEvent) => {
      if (stateRef.current === "DRAGGING") {
        e.preventDefault()
      }
    }

    el.addEventListener("touchmove", onNativeTouchMove, { passive: false })
    return () => {
      el.removeEventListener("touchmove", onNativeTouchMove)
    }
  }, [enabled])

  const isDragging = state === "DRAGGING"
  const isAnimating = state === "DISMISSING" || state === "SNAPPING"
  const contentHeight = contentRef.current?.offsetHeight ?? 500
  const dragProgress = isDragging ? Math.min(translateY / contentHeight, 1) : 0

  return {
    contentRef,
    bodyRef,
    translateY,
    isDragging,
    isAnimating,
    dragProgress,
    headerHandlers: {
      onTouchStart: handleTouchStartHeader,
    },
    contentHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
