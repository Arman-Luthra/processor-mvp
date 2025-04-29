import { useState, useRef, useEffect } from "react";
import { Block } from "@shared/schema";
import FormatDropdown from "@/components/FormatDropdown";
import SelectionMenu from "@/components/SelectionMenu";
import { useEditor, EditorContent } from "@tiptap/react";
import { TipTapExtensions } from "@/components/TipTapExtensions";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TextBlockProps {
  block: Block;
  updateBlock: (blockId: string, updatedData: Partial<Block>) => void;
  addBlockAfter: (blockId: string, blockType?: Block["type"]) => void;
  deleteBlock: (blockId: string) => void;
  registerBlockRef?: (blockId: string, element: HTMLElement | null) => void;
  shouldFocus?: boolean;
  isFirstBlock?: boolean;
  isLastBlock?: boolean;
  isDragging?: boolean;
}

export default function TextBlock({
  block,
  updateBlock,
  addBlockAfter,
  deleteBlock,
  registerBlockRef,
  shouldFocus = false,
  isFirstBlock = false,
  isLastBlock = false,
  isDragging = false,
}: TextBlockProps) {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const formatMenuButtonRef = useRef<HTMLDivElement>(null);

  // Initialize dnd-kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({
    id: block.id,
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  // Apply dnd-kit styles
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSorting ? 0.5 : 1,
  };

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
    }
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
    if (registerBlockRef) {
      registerBlockRef(block.id, setNodeRef as unknown as HTMLElement);
      return () => registerBlockRef(block.id, null);
    }
  }, [block.id, registerBlockRef, setNodeRef]);
  
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
        
        // Always create a paragraph block after exiting a list, don't inherit list type
        const newBlockType = "paragraph";
        
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
      // Don't delete the first block, as it should always exist
      if (!isFirstBlock) {
        event.preventDefault();
        
        // Signal to NotionEditor to delete this block and focus the previous one
        const deleteEvent = new CustomEvent('block-delete-backward', {
          detail: { blockId: block.id }
        });
        window.dispatchEvent(deleteEvent);
      } else {
        // For first block, do nothing special on backspace when empty
        // This ensures normal behavior without weird effects
      }
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
    if (!editor) return;
    
    // Extract current content text before clearing formatting
    // Trim the text to remove extra whitespace
    const currentText = editor.getText().trim();
    
    // Completely reset the editor content
    editor.commands.clearContent(true);
    
    // Update block type in the state
    updateBlock(block.id, { type });
    setShowFormatMenu(false);

    // Apply the new format with the extracted text
    switch (type) {
      case "title":
      case "heading1":
        editor.chain().focus().setHeading({ level: 1 }).run();
        if (currentText) editor.chain().insertContent(currentText).run();
        break;
      case "heading2":
        editor.chain().focus().setHeading({ level: 2 }).run();
        if (currentText) editor.chain().insertContent(currentText).run();
        break;
      case "heading3":
        editor.chain().focus().setHeading({ level: 3 }).run();
        if (currentText) editor.chain().insertContent(currentText).run();
        break;
      case "bulletList":
        // For lists, we need to create the structure and then insert the text
        editor.chain().focus().run();
        if (currentText) {
          editor.commands.insertContent({
            type: 'bulletList',
            content: [{
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: currentText ? [{ type: 'text', text: currentText }] : []
              }]
            }]
          });
        } else {
          editor.commands.insertContent({
            type: 'bulletList',
            content: [{
              type: 'listItem',
              content: [{ type: 'paragraph' }]
            }]
          });
        }
        break;
      case "orderedList":
        editor.chain().focus().run();
        if (currentText) {
          editor.commands.insertContent({
            type: 'orderedList',
            content: [{
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: currentText ? [{ type: 'text', text: currentText }] : []
              }]
            }]
          });
        } else {
          editor.commands.insertContent({
            type: 'orderedList',
            content: [{
              type: 'listItem',
              content: [{ type: 'paragraph' }]
            }]
          });
        }
        break;
      case "code":
        editor.chain().focus().setCodeBlock().run();
        if (currentText) editor.chain().insertContent(currentText).run();
        break;
      case "paragraph":
      default:
        editor.chain().focus().setParagraph().run();
        if (currentText) editor.chain().insertContent(currentText).run();
        break;
    }
    
    // Focus the editor after changing format
    setTimeout(() => {
      editor.commands.focus('end');
    }, 10);
  };

  // Add a direct DOM manipulation to force the placeholder visibility
  useEffect(() => {
    if (editor && isFirstBlock) {
      const editorEl = editor.view.dom;
      const paragraphs = editorEl.querySelectorAll('p');
      
      if (paragraphs.length > 0) {
        const firstParagraph = paragraphs[0];
        firstParagraph.setAttribute('data-placeholder', 'Start writing');
        // Just set the data-placeholder attribute but don't add any manual elements
      }
    }
  }, [editor, isFirstBlock]);

  // Helper to get block type name for display
  const getBlockTypeName = (type: Block["type"]) => {
    switch (type) {
      case "title":
        return "Title";
      case "heading1":
        return "Heading 1";
      case "heading2":
        return "Heading 2";
      case "heading3":
        return "Heading 3";
      case "bulletList":
        return "Bullet List";
      case "orderedList":
        return "Numbered List";
      case "code":
        return "Code";
      case "paragraph":
      default:
        return "Text";
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
      case "orderedList":
        return "text-base pl-5";
      case "dashedList":
        return "text-base pl-5";
      case "paragraph":
      default:
        return "text-base";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group w-full flex ${isFirstBlock ? 'first-block' : ''} ${block.type}`}
      {...attributes}
    >
      {/* Container for both content and format controls with fixed width */}
      <div className="w-full flex relative">
        {/* Editable content area with explicit width and its own click handler */}
        <div
          className={`w-[calc(100%-100px)] py-1 focus:outline-none ${getBlockClass(block.type)}`}
          onKeyDown={handleKeyDown}
          data-block-id={block.id}
          onClick={() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
        >
          <EditorContent 
            className="editor-content w-full"
            editor={editor}
          />
        </div>

        {/* Format and drag control - fixed position and width */}
        <div className="w-[100px] flex justify-start items-start pl-2">
          <div className="flex items-center py-1 px-2 rounded hover:bg-gray-100 cursor-pointer text-gray-500 text-sm group" ref={formatMenuButtonRef}>
            {/* Drag handle (2x3 dots) */}
            <div 
              className="mr-2 grid grid-rows-3 grid-cols-2 gap-0.5 cursor-grab active:cursor-grabbing drag-handle"
              {...listeners}
            >
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-gray-400"></div>
              ))}
            </div>
            
            {/* Format name */}
            <span onClick={(e) => {
              e.stopPropagation();
              toggleFormatMenu();
            }}>{getBlockTypeName(block.type)}</span>
          </div>
        </div>
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