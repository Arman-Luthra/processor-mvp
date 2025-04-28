import { useEffect, useRef, useState } from "react";
import { Block } from "@shared/schema";
import { 
  Heading1, Heading2, Heading3, 
  ListOrdered, List, Minus, 
  Type, Code, FileText 
} from "lucide-react";

interface FormatDropdownProps {
  onSelect: (type: Block["type"]) => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export default function FormatDropdown({
  onSelect,
  onClose,
  buttonRef,
}: FormatDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Format options - simpler version with just names
  const formatOptions = [
    { type: "title", name: "Title", icon: <Type size={16} /> },
    { type: "heading1", name: "Heading 1", icon: <Heading1 size={16} /> },
    { type: "heading2", name: "Heading 2", icon: <Heading2 size={16} /> },
    { type: "heading3", name: "Heading 3", icon: <Heading3 size={16} /> },
    { type: "paragraph", name: "Text", icon: <FileText size={16} /> },
    { type: "bulletList", name: "Bullet List", icon: <List size={16} /> },
    { type: "numberedList", name: "Numbered List", icon: <ListOrdered size={16} /> },
    { type: "dashedList", name: "Dashed List", icon: <Minus size={16} /> },
    { type: "code", name: "Code", icon: <Code size={16} /> },
  ];

  // Position the dropdown when the menu opens
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 160;
      
      // Position to the left of the content with some padding
      setPosition({
        top: rect.top,
        left: rect.left - dropdownWidth - 5,
      });
    }
  }, [buttonRef]);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, buttonRef]);

  return (
    <div
      ref={dropdownRef}
      className="fixed z-10 bg-white shadow-md rounded-md w-40 overflow-hidden border border-[#E0DFDC]"
      style={{ 
        top: position.top, 
        left: position.left,
        visibility: position.top > 0 ? 'visible' : 'hidden'
      }}
    >
      <div className="format-options py-0.5">
        {formatOptions.map((option) => (
          <div
            key={option.type}
            className="flex items-center px-2 py-1 hover:bg-[#F7F6F3] cursor-pointer text-sm"
            onClick={() => onSelect(option.type as Block["type"])}
          >
            <div className="w-5 h-5 flex items-center justify-center mr-2 text-gray-500">
              {option.icon}
            </div>
            <span className="text-gray-700">{option.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
