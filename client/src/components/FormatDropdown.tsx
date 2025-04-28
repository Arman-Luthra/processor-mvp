import { useEffect, useRef, useState } from "react";
import { Block } from "@shared/schema";
import { FileText, Heading1, Heading2, Heading3, Type, Code, Bookmark } from "lucide-react";

interface FormatOption {
  type: Block["type"];
  title: string;
  description: string;
  icon: React.ReactNode;
}

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

  // Format options with icons
  const formatOptions: FormatOption[] = [
    {
      type: "title",
      title: "Title",
      description: "Large heading",
      icon: <Type size={18} />,
    },
    {
      type: "heading1",
      title: "Heading 1",
      description: "Section heading",
      icon: <Heading1 size={18} />,
    },
    {
      type: "heading2",
      title: "Heading 2",
      description: "Subsection heading",
      icon: <Heading2 size={18} />,
    },
    {
      type: "heading3",
      title: "Heading 3",
      description: "Smaller heading",
      icon: <Heading3 size={18} />,
    },
    {
      type: "paragraph",
      title: "Paragraph",
      description: "Normal text",
      icon: <FileText size={18} />,
    },
    {
      type: "markdown",
      title: "Markdown",
      description: "Formatted text",
      icon: <Bookmark size={18} />,
    },
    {
      type: "code",
      title: "Code",
      description: "Syntax highlighting",
      icon: <Code size={18} />,
    },
  ];

  // Position the dropdown next to the button
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 256; // Width of the dropdown (w-64 = 16rem = 256px)
      
      // Check if there's enough space to show dropdown to the right
      const viewportWidth = window.innerWidth;
      const spaceOnRight = viewportWidth - rect.right;
      
      // Position dropdown where it fits best
      if (spaceOnRight >= dropdownWidth + 10) {
        // Position to the right of the button with some padding
        setPosition({
          top: rect.top,
          left: rect.right + 10,
        });
      } else {
        // Not enough space on right, position to the left with some offset
        setPosition({
          top: rect.top,
          left: Math.max(10, rect.left - dropdownWidth - 10),
        });
      }
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
      className="fixed z-10 bg-white shadow-md rounded-md w-64 overflow-hidden border border-[#E0DFDC]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 text-sm text-gray-700 font-medium">FORMATTING</div>

      <div className="format-options py-1">
        {formatOptions.map((option) => (
          <div
            key={option.type}
            className="flex items-center px-3 py-2 hover:bg-[#F7F6F3] cursor-pointer"
            onClick={() => onSelect(option.type)}
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-[#F7F6F3] mr-3">
              {option.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-800 mb-0.5">{option.title}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
