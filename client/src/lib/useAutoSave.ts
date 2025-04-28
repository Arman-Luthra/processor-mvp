import { useEffect, useRef, useState } from "react";

export function useAutoSave<T>(
  data: T,
  saveCallback: (data: T) => void,
  delayMs: number = 2000
) {
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<T>(data);

  const isEqual = (a: T, b: T) => {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  useEffect(() => {
    // Check if data has changed since last save
    if (isEqual(data, lastSavedDataRef.current)) {
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      
      // Call the save callback
      saveCallback(data);
      
      // Update the last saved data reference
      lastSavedDataRef.current = JSON.parse(JSON.stringify(data));
      
      // Reset the saving state after a brief delay
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
      
      saveTimeoutRef.current = null;
    }, delayMs);

    // Clean up the timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, saveCallback, delayMs]);

  return isSaving;
}
