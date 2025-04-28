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
  registerBlockRef?: (blockId: string, element: HTMLElement | null) => void;
  shouldFocus?: boolean;
}

export default function TextBlock({
  block,
  updateBlock,
  addBlockAfter,
  deleteBlock,
  registerBlockRef,
  shouldFocus = false,
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
  
  // Register block reference with parent
  useEffect(() => {
    if (registerBlockRef && blockRef.current) {
      registerBlockRef(block.id, blockRef.current);
      return () => registerBlockRef(block.id, null);
    }
  }, [block.id, registerBlockRef]);
  
  // Auto focus this block if shouldFocus is true
  useEffect(() => {
    if (shouldFocus && editor) {
      setTimeout(() => {
        editor.commands.focus('end');
      }, 10);
    }
  }, [shouldFocus, editor]);
  
  // Ensure we only process Enter key once
  const isAddingBlock = useRef(false);
  
  // Handle custom editor-enter-key event from TipTap extension
  useEffect(() => {
    if (!editor) return;
    
    // Generate a unique ID for this editor instance if it doesn't have one
    const editorElement = editor.view.dom;
    const editorId = editorElement.id || `editor-${block.id}`;
    editorElement.id = editorId;
    
    const handleEditorEnterKey = (event: CustomEvent) => {
      // Prevent duplicate block creation
      if (isAddingBlock.current) return;
      
      const { editorId: eventEditorId } = event.detail;
      
      // Only handle if this is the active editor (the one that fired the event)
      const isThisEditor = editorId === eventEditorId || editor.isFocused;
      
      if (isThisEditor) {
        // Don't create a new block for code blocks
        if (block.type === "code") return;
        
        // Set flag to prevent multiple block creation
        isAddingBlock.current = true;
        
        // Create a new block after this one with same type for lists
        const newBlockType = ["bulletList", "numberedList", "dashedList"].includes(block.type) 
          ? block.type 
          : "paragraph";
        
        addBlockAfter(block.id, newBlockType);
        
        // Reset flag after a delay
        setTimeout(() => {
          isAddingBlock.current = false;
        }, 100);
      }
    };
    
    // Add event listener only on the window (to prevent duplicate triggers)
    window.addEventListener('editor-enter-key', handleEditorEnterKey as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('editor-enter-key', handleEditorEnterKey as EventListener);
    };
  }, [editor, block.id, block.type, addBlockAfter]);

  // Handle keyboard shortcuts directly on the editor container
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!editor) return;

    // Enter key creates a new block - but we'll let the extension handle this
    // to avoid duplicate blocks being created
    if (event.key === "Enter" && !event.shiftKey) {
      // Let code blocks handle Enter normally
      if (block.type === "code") return;
      
      // Don't do anything here - let the extension handle it
      // This prevents multiple handler conflicts
    }
    
    // Backspace key on empty block deletes the block and moves cursor to previous block
    if (event.key === "Backspace" && editor.isEmpty) {
      event.preventDefault();
      
      // Signal to NotionEditor to delete this block and focus the previous one
      const deleteEvent = new CustomEvent('block-delete-backward', {
        detail: { blockId: block.id }
      });
      window.dispatchEvent(deleteEvent);
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
    // Update the block type first
    updateBlock(block.id, { type });
    setShowFormatMenu(false);
    
    // Handle content formatting for the editor
    if (editor) {
      // Strip any existing formatting characters from the beginning
      let content = editor.getText() || '';
      
      // Remove any bullet/number/dash prefixes from the text
      content = content.replace(/^[•\-\d]+\.?\s+/, '');
      
      // For list types, we leave the content clean and rely on CSS for the visual markers
      // This ensures changing between formats doesn't stack prefixes
      
      // Set the clean content and focus
      editor.commands.setContent(content);
      
      // Focus back on the editor after changing format
      setTimeout(() => {
        editor.commands.focus('end');
      }, 0);
    }
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
      case "bulletList":
        return "text-base pl-5";
      case "numberedList":
        return "text-base pl-5";
      case "dashedList":
        return "text-base pl-5";
      case "paragraph":
      default:
        return "text-base";
    }
  };

  return (
    <div ref={blockRef} className="group relative">
      {/* Format menu button (appears on hover) */}
      <div className="absolute left-0 -ml-8 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <EditorContent className="editor-content" editor={editor} />
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