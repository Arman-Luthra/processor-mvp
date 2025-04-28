import { useState, useRef, useEffect } from "react";
import { Block } from "@shared/schema";
import FormatDropdown from "@/components/FormatDropdown";
import SelectionMenu from "@/components/SelectionMenu";
import { useEditor, EditorContent } from "@tiptap/react";
import { TipTapExtensions } from "@/components/TipTapExtensions";
import { MoreVertical } from "lucide-react";

interface TextBlockProps {
  block: Block;
  updateBlock: (blockId: string, updatedData: Partial<Block>) => void;
  addBlockAfter: (blockId: string, blockType?: Block["type"]) => void;
  deleteBlock: (blockId: string) => void;
}

export default function TextBlock({
  block,
  updateBlock,
  addBlockAfter,
  deleteBlock,
}: TextBlockProps) {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const blockRef = useRef<HTMLDivElement>(null);
  const formatMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: TipTapExtensions,
    content: block.content,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      updateBlock(block.id, { content });
    },
    onSelectionUpdate: ({ editor }) => {
      const selection = editor.view.state.selection;
      const { from, to } = selection;
      
      if (from === to) {
        // No selection
        setShowSelectionMenu(false);
        return;
      }

      const selectedContent = editor.state.doc.textBetween(from, to, " ");
      if (!selectedContent) {
        setShowSelectionMenu(false);
        return;
      }

      // Position the selection menu
      if (window.getSelection() && window.getSelection()!.rangeCount > 0) {
        const range = window.getSelection()!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectionPosition({
          top: rect.top - 40, // Position above the selection
          left: rect.left + rect.width / 2, // Center the menu
        });
        
        setSelectedText(selectedContent);
        setShowSelectionMenu(true);
      }
    },
  });

  // Update editor when block type changes
  useEffect(() => {
    if (editor) {
      // Update editor class based on block type
      editor.setOptions({
        editorProps: {
          attributes: {
            class: getBlockClass(block.type),
          },
        },
      });
    }
  }, [block.type, editor]);

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!editor) return;

    // Enter key creates a new block
    if (event.key === "Enter" && !event.shiftKey) {
      if (editor.isEmpty) {
        // Don't create a new block on empty blocks when pressing Enter
        return;
      }
      
      if (block.type === "code") {
        // Let code blocks handle Enter normally
        return;
      }
      
      if (!event.isDefaultPrevented()) {
        event.preventDefault();
        addBlockAfter(block.id);
      }
    }
    
    // Backspace key on empty block deletes the block
    if (event.key === "Backspace" && editor.isEmpty) {
      event.preventDefault();
      deleteBlock(block.id);
    }
    
    // '/' key for commands
    if (event.key === "/" && editor.isEmpty) {
      event.preventDefault();
      setShowFormatMenu(true);
    }
  };

  // Toggle format menu
  const toggleFormatMenu = () => {
    setShowFormatMenu(!showFormatMenu);
  };

  // Apply formatting to block
  const handleFormatSelect = (type: Block["type"]) => {
    updateBlock(block.id, { type });
    setShowFormatMenu(false);
    // Focus back on the editor after changing format
    setTimeout(() => {
      // Use the editor's view to focus instead of directly calling focus
      if (editor && editor.view) {
        editor.view.focus();
      }
    }, 0);
  };

  // Helper to get block class based on type
  const getBlockClass = (type: Block["type"]) => {
    switch (type) {
      case "title":
        return "text-[40px] font-bold";
      case "heading1":
        return "text-[30px] font-semibold";
      case "heading2":
        return "text-[24px] font-semibold";
      case "heading3":
        return "text-[20px] font-semibold";
      case "code":
        return "font-mono p-3 bg-[#F7F6F3] rounded-md text-sm";
      case "markdown":
        return "font-mono text-base";
      case "paragraph":
      default:
        return "text-base";
    }
  };

  return (
    <div ref={blockRef} className="group relative">
      {/* Format menu button (appears on hover) */}
      <div className="absolute left-0 -ml-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          ref={formatMenuButtonRef}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F7F6F3] text-gray-400 hover:text-gray-700"
          onClick={toggleFormatMenu}
          aria-label="Format options"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Editable content area */}
      <div
        className={`py-1 focus:outline-none ${getBlockClass(block.type)}`}
        data-placeholder="Type '/' for commands"
        onKeyDown={handleKeyDown}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Format dropdown menu */}
      {showFormatMenu && (
        <FormatDropdown
          onSelect={handleFormatSelect}
          onClose={() => setShowFormatMenu(false)}
          buttonRef={formatMenuButtonRef}
        />
      )}

      {/* Selection menu */}
      {showSelectionMenu && editor && (
        <SelectionMenu
          editor={editor}
          position={selectionPosition}
          onClose={() => setShowSelectionMenu(false)}
          selectedText={selectedText}
        />
      )}
    </div>
  );
}
