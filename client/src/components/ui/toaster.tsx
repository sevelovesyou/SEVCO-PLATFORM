import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useSounds } from "@/hooks/use-sounds"

export function Toaster() {
  const { toasts } = useToast()
  const { playSuccess, playError } = useSounds()
  const prevCountRef = useRef(0)

  useEffect(() => {
    if (toasts.length > prevCountRef.current) {
      const latest = toasts[toasts.length - 1]
      if (latest) {
        const v = (latest as any).variant
        if (v === "destructive" || v === "error") {
          playError()
        } else {
          playSuccess()
        }
      }
    }
    prevCountRef.current = toasts.length
  }, [toasts.length, playSuccess, playError])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
