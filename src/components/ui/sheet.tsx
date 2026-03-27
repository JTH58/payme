"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSwipeToDismiss } from "@/hooks/use-swipe-dismiss"

// --- Utility: merge refs ---
function useMergedRef<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return React.useCallback(
    (node: T | null) => {
      refs.forEach((ref) => {
        if (typeof ref === "function") {
          ref(node)
        } else if (ref && typeof ref === "object") {
          ;(ref as React.MutableRefObject<T | null>).current = node
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs
  )
}

// --- SheetContext: pass open/onOpenChange to SheetContent ---
const SheetContext = React.createContext<{
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>({})

const Sheet: React.FC<DialogPrimitive.DialogProps> = ({
  onOpenChange,
  open,
  ...props
}) => (
  <SheetContext.Provider value={{ onOpenChange, open }}>
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open} {...props} />
  </SheetContext.Provider>
)
Sheet.displayName = "Sheet"

const SheetTrigger = DialogPrimitive.Trigger

const SheetPortal = DialogPrimitive.Portal

const SheetClose = DialogPrimitive.Close

// --- SwipeContext: distribute swipe refs/handlers to children ---
const SwipeContext = React.createContext<{
  bodyRef: React.RefObject<HTMLDivElement | null>
  headerHandlers: { onTouchStart: (e: React.TouchEvent) => void }
  isDragging: boolean
  dragProgress: number
} | null>(null)

// --- SheetOverlay ---
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
      "theme-overlay-scrim fixed inset-0 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

// --- SheetContent ---
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(SheetContext)
  const swipe = useSwipeToDismiss({
    enabled: !!open,
    onDismiss: () => onOpenChange?.(false),
  })

  const mergedRef = useMergedRef(ref, swipe.contentRef)

  // Build animation class — on swipe dismiss, keep fade-out but remove slide-out
  const isSwipeDismiss = swipe.isAnimating && swipe.translateY > 0
  const isSnapping = swipe.isAnimating && !isSwipeDismiss
  const closedAnimClass = isSwipeDismiss
    ? "data-[state=closed]:fade-out-0"
    : "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom"

  // Build inline style for drag transform
  const dragStyle: React.CSSProperties =
    swipe.isDragging || swipe.isAnimating
      ? ({
          ...style,
          transform: `translateY(${swipe.translateY}px)`,
          transition: swipe.isDragging
            ? "none"
            : "transform 300ms ease-out",
          // Pin Radix exit animation's end-position to current translateY
          // so animate-out doesn't pull the sheet back up
          ...(isSwipeDismiss && {
            '--tw-exit-translate-y': `${swipe.translateY}px`,
          }),
        } as React.CSSProperties)
      : style ?? {}

  // Overlay opacity: track finger during drag, smooth transition on release
  const overlayStyle: React.CSSProperties | undefined = swipe.isDragging
    ? { opacity: 1 - swipe.dragProgress * 0.5 }
    : isSwipeDismiss
      ? { opacity: 0, transition: "opacity 300ms ease-out" }
      : isSnapping
        ? { transition: "opacity 300ms ease-out" }
        : undefined

  return (
    <SheetPortal>
      <SheetOverlay style={overlayStyle} />
      <DialogPrimitive.Content
        ref={mergedRef}
        className={cn(
          "glass-panel-strong fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col overflow-hidden rounded-t-[1.75rem] border-t pb-[env(safe-area-inset-bottom)] duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom",
          closedAnimClass,
          className
        )}
        style={dragStyle}
        data-dragging={swipe.isDragging || undefined}
        onTouchStart={swipe.contentHandlers.onTouchStart}
        onTouchMove={swipe.contentHandlers.onTouchMove}
        onTouchEnd={swipe.contentHandlers.onTouchEnd}
        onInteractOutside={(e) => {
          e.preventDefault()
          swipe.dismiss()
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          swipe.dismiss()
        }}
        {...props}
      >
        <SwipeContext.Provider
          value={{
            bodyRef: swipe.bodyRef,
            headerHandlers: swipe.headerHandlers,
            isDragging: swipe.isDragging,
            dragProgress: swipe.dragProgress,
          }}
        >
          {children}
        </SwipeContext.Provider>
        <button
          type="button"
          onClick={() => swipe.dismiss()}
          className="theme-icon-button absolute right-2 top-2 min-w-[44px] min-h-[44px] opacity-80 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </DialogPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = DialogPrimitive.Content.displayName

// --- SheetHeader ---
const SheetHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const swipeCtx = React.useContext(SwipeContext)

  return (
    <div
      className={cn(
        "flex-shrink-0 flex flex-col items-center space-y-3 text-center px-6 pt-6 pb-4 border-b border-slate-200/70",
        className
      )}
      {...props}
      onTouchStart={swipeCtx?.headerHandlers.onTouchStart}
    >
      {/* Drag handle */}
      <div
        className={cn(
          "w-10 h-1 rounded-full transition-colors",
          swipeCtx?.isDragging ? "bg-slate-500" : "bg-slate-400/70"
        )}
      />
      {children && <div className="w-full space-y-1.5">{children}</div>}
    </div>
  )
}
SheetHeader.displayName = "SheetHeader"

// --- SheetBody ---
const SheetBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const swipeCtx = React.useContext(SwipeContext)
  const mergedRef = useMergedRef(ref, swipeCtx?.bodyRef)

  return (
    <div
      ref={mergedRef}
      className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
      {...props}
    />
  )
})
SheetBody.displayName = "SheetBody"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-slate-900",
      className
    )}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-600", className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetClose,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
}
