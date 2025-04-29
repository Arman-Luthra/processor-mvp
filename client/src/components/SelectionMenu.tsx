import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { 
  Bold, Italic, Underline, StrikethroughIcon, 
  Subscript, Superscript, Link, Code 
} from "lucide-react";

interface SelectionMenuProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
  selectedText: string;
}

export default function SelectionMenu({
  editor,
  position,
  onClose,
  selectedText,
}: SelectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate word count
  const wordCount = selectedText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Close the menu when selection changes
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [onClose]);

  // Apply formatting to selection
  const applyFormatting = (format: string) => {
    switch (format) {
      case "bold":
        editor.chain().focus().toggleBold().run();
        break;
      case "italic":
        editor.chain().focus().toggleItalic().run();
        break;
      case "underline":
        editor.chain().focus().toggleUnderline().run();
        break;
      case "strikethrough":
        editor.chain().focus().toggleStrike().run();
        break;
      case "code":
        editor.chain().focus().toggleCode().run();
        break;
      case "link":
        const url = prompt("Enter URL", "https://");
        if (url) {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }
        break;
      case "subscript":
        editor.chain().focus().unsetSuperscript().toggleSubscript().run();
        break;
      case "superscript":
        editor.chain().focus().unsetSubscript().toggleSuperscript().run();
        break;
      default:
        break;
    }
  };

  // Get correct position to avoid menu going offscreen
  const menuStyle = () => {
    let { top, left } = position;
    
    // Ensure menu doesn't go above viewport
    if (top < 40) {
      top = 40;
    }
    
    // Calculate if menu would go offscreen on right
    if (menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth;
      const viewportWidth = window.innerWidth;
      
      // Center the menu around the left position
      left = Math.max(
        10, // Min left margin
        Math.min(
          left - menuWidth / 2,
          viewportWidth - menuWidth - 10 // Max left position to keep menu inside viewport
        )
      );
    }
    
    return { top, left };
  };

  return (
    <div
      ref={menuRef}
      className="selection-menu fixed z-20 bg-white shadow-md rounded-lg border border-[#E0DFDC] animate-in fade-in zoom-in-95 duration-100"
      style={menuStyle()}
    >
      <div className="flex items-center px-1.5">
        {/* Word counter */}
        <div className="text-xs text-gray-500 px-2 border-r border-[#E0DFDC]">
          {wordCount} word{wordCount !== 1 ? "s" : ""}
        </div>

        {/* Formatting options */}
        <div className="flex">
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Bold"
            onClick={() => applyFormatting("bold")}
          >
            <Bold size={16} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Italic"
            onClick={() => applyFormatting("italic")}
          >
            <Italic size={16} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Underline"
            onClick={() => applyFormatting("underline")}
          >
            <Underline size={16} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Strikethrough"
            onClick={() => applyFormatting("strikethrough")}
          >
            <StrikethroughIcon size={16} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Subscript"
            onClick={() => applyFormatting("subscript")}
          >
            <Subscript size={16} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Superscript"
            onClick={() => applyFormatting("superscript")}
          >
            <Superscript size={16} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Link"
            onClick={() => applyFormatting("link")}
          >
            <Link size={16} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F6F3]"
            title="Code"
            onClick={() => applyFormatting("code")}
          >
            <Code size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
