import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const GOTO_MAP: Record<string, string> = {
  h: "/",
  w: "/wiki",
  m: "/music",
  p: "/projects",
  v: "/services",
  j: "/jobs",
  r: "/sparks/rewards",
  f: "/feed",
  c: "/command",
};

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(opts: { onShowHelp: () => void }) {
  const [, navigate] = useLocation();
  const metaLeftDown = useRef(false);
  const metaRightDown = useRef(false);
  const dualMetaFired = useRef(false);
  const gotoArmed = useRef<number | null>(null);
  const onShowHelpRef = useRef(opts.onShowHelp);

  useEffect(() => {
    onShowHelpRef.current = opts.onShowHelp;
  }, [opts.onShowHelp]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "MetaLeft") metaLeftDown.current = true;
      if (e.code === "MetaRight") metaRightDown.current = true;
      if (
        metaLeftDown.current &&
        metaRightDown.current &&
        !dualMetaFired.current &&
        (e.code === "MetaLeft" || e.code === "MetaRight")
      ) {
        dualMetaFired.current = true;
        e.preventDefault();
        navigate("/command");
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("sevco:open-search"));
        return;
      }

      if (isTypingTarget(document.activeElement)) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onShowHelpRef.current();
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("sevco:open-search"));
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        gotoArmed.current = Date.now();
        return;
      }
      if (gotoArmed.current && Date.now() - gotoArmed.current < 1500) {
        const path = GOTO_MAP[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          gotoArmed.current = null;
          navigate(path);
          return;
        }
        gotoArmed.current = null;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "MetaLeft") metaLeftDown.current = false;
      if (e.code === "MetaRight") metaRightDown.current = false;
      if (!metaLeftDown.current && !metaRightDown.current) {
        dualMetaFired.current = false;
      }
    }

    function onBlur() {
      metaLeftDown.current = false;
      metaRightDown.current = false;
      dualMetaFired.current = false;
      gotoArmed.current = null;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [navigate]);
}
