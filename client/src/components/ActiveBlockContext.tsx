import { createContext, useContext, useState } from 'react';

const ActiveBlockContext = createContext({
  activeBlockId: null as string | null,
  setActiveBlockId: (_: string | null) => {},
});

export function ActiveBlockProvider({ children }: { children: React.ReactNode }) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  return (
    <ActiveBlockContext.Provider value={{ activeBlockId, setActiveBlockId }}>
      {children}
    </ActiveBlockContext.Provider>
  );
}

export function useActiveBlock() {
  return useContext(ActiveBlockContext);
} 