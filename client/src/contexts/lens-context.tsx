import { createContext, useContext, useState } from "react";

type LensContextType = {
  isOpen: boolean;
  currentUrl: string;
  openLens: (url?: string) => void;
  closeLens: () => void;
  setCurrentUrl: (url: string) => void;
};

const LensContext = createContext<LensContextType | null>(null);

const DEFAULT_URL = "https://sevco.us";

export function LensProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);

  function openLens(url?: string) {
    if (url) setCurrentUrl(url);
    setIsOpen(true);
  }

  function closeLens() {
    setIsOpen(false);
  }

  return (
    <LensContext.Provider value={{ isOpen, currentUrl, openLens, closeLens, setCurrentUrl }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens() {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useLens must be used inside LensProvider");
  return ctx;
}
