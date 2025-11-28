/**
 * Hook for handling keyboard navigation in dropdown menus
 * Supports ArrowUp, ArrowDown, Enter, and Escape keys
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface UseDropdownKeyboardNavigationProps<T> {
  items: T[];
  isOpen: boolean;
  onSelect: (item: T) => void;
  onClose: () => void;
}

interface UseDropdownKeyboardNavigationResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function useDropdownKeyboardNavigation<T>({
  items,
  isOpen,
  onSelect,
  onClose,
}: UseDropdownKeyboardNavigationProps<T>): UseDropdownKeyboardNavigationResult {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset selected index when dropdown closes or items change
  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            onSelect(items[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          setSelectedIndex(-1);
          break;
      }
    },
    [isOpen, items, selectedIndex, onSelect, onClose]
  );

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    dropdownRef,
  };
}
