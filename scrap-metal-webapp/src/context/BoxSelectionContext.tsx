import React, { createContext, useContext, ReactNode } from 'react';

interface BoxSelectionContextType {
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  selectedBoxIndices: Set<number>;
  onToggleBox: (index: number) => void;
}

const BoxSelectionContext = createContext<BoxSelectionContextType | undefined>(undefined);

interface BoxSelectionProviderProps {
  children: ReactNode;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  selectedBoxIndices: Set<number>;
  onToggleBox: (index: number) => void;
}

export const BoxSelectionProvider: React.FC<BoxSelectionProviderProps> = ({
  children,
  boxes,
  selectedBoxIndices,
  onToggleBox,
}) => {
  return (
    <BoxSelectionContext.Provider value={{ boxes, selectedBoxIndices, onToggleBox }}>
      {children}
    </BoxSelectionContext.Provider>
  );
};

export const useBoxSelection = () => {
  const context = useContext(BoxSelectionContext);
  if (context === undefined) {
    throw new Error('useBoxSelection must be used within a BoxSelectionProvider');
  }
  return context;
}; 