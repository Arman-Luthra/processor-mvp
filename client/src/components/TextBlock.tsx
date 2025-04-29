import { useState, useRef, useEffect } from "react";
import { Block } from "@shared/schema";
import FormatDropdown from "@/components/FormatDropdown";
import SelectionMenu from "@/components/SelectionMenu";
import { useEditor, EditorContent } from "@tiptap/react";
import { TipTapExtensions } from "@/components/TipTapExtensions";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useActiveBlock } from './ActiveBlockContext';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

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
  const isProcessingCommand = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { activeBlockId, setActiveBlockId } = useActiveBlock();
  
  // Simplify state management for dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
    transform: isDragging || isSorting 
      ? `translate3d(${transform?.x || 0}px, ${transform?.y || 0}px, 0) scale(1.02) rotate(1deg)` 
      : CSS.Transform.toString(transform),
    transition,
    boxShadow: isDragging || isSorting ? '0 15px 35px rgba(0, 0, 0, 0.2)' : 'none',
    zIndex: isDragging || isSorting ? 50 : 'auto',
    opacity: 1,
    borderRadius: isDragging || isSorting ? '0.5rem' : '0',
    padding: isDragging || isSorting ? '4px' : '0',
    backgroundColor: isDragging || isSorting ? 'white' : 'transparent',
  } as React.CSSProperties;

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
    onFocus: () => {
      setIsActive(true);
      setActiveBlockId(block.id);
    },
    onBlur: () => {
      // Don't immediately deactivate when the dropdown is open
      if (!isDropdownOpen) {
        setIsActive(false);
        setActiveBlockId(null);
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
      
      // Skip if we're processing a slash command
      if (isProcessingCommand.current) return;
      
      const { editorId: eventEditorId, forceNewBlock } = event.detail;
      
      // Only handle if this is the active editor (the one that fired the event)
      const isThisEditor = editorId === eventEditorId || editor.isFocused;
      
      if (isThisEditor) {
        // Don't create a new block for code blocks - UNLESS forceNewBlock is true
        if (block.type === "code" && !forceNewBlock) return;
        
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
    
    // Handle specific code block exit event
    const handleCodeBlockExit = (event: CustomEvent) => {
      const { blockId, shouldCreateNewBlock, preserveContent, originalContent } = event.detail;
      
      // Only handle if this is the block that sent the event
      if (blockId === block.id && shouldCreateNewBlock) {
        // Set flag to prevent duplicate block creation
        isAddingBlock.current = true;
        
        // If we need to preserve content, update the current block's content
        if (preserveContent && originalContent && editor) {
          // Store original content to restore in this block
          const storedContent = originalContent;
          
          // Create a new paragraph block after this one
          addBlockAfter(block.id, "paragraph");
          
          // After a short delay, restore the code content
          setTimeout(() => {
            // Restore code content to this block
            editor.commands.setContent("");
            editor.commands.setCodeBlock();
            
            // Need to parse the HTML to extract just the content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = storedContent;
            const codeContent = tempDiv.textContent || "";
            
            editor.commands.insertContent(codeContent);
            
            // Reset flag
            isAddingBlock.current = false;
          }, 50);
        } else {
          // Regular behavior - create a paragraph block
          addBlockAfter(block.id, "paragraph");
          
          // Reset flag after a delay
          setTimeout(() => {
            isAddingBlock.current = false;
          }, 100);
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('editor-enter-key', handleEditorEnterKey as EventListener);
    window.addEventListener('code-block-exit', handleCodeBlockExit as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('editor-enter-key', handleEditorEnterKey as EventListener);
      window.removeEventListener('code-block-exit', handleCodeBlockExit as EventListener);
    };
  }, [editor, block.id, block.type, addBlockAfter]);

  // Handle keyboard shortcuts directly on the editor container
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!editor) return;

    // Enter key creates a new block - but we'll let the extension handle this
    // to avoid duplicate blocks being created
    if (event.key === "Enter" && !event.shiftKey) {
      // Process slash commands when Enter is pressed - check this first
      if (editor.getText().startsWith('/')) {
        // Immediately prevent default to stop any cursor movement
        event.preventDefault();
        event.stopPropagation();
        
        const command = editor.getText().trim().toLowerCase();
        let blockType: Block["type"] | null = null;
        
        switch (command) {
          case '/title':
          case '/h1':
            blockType = 'title';
            break;
          case '/heading':
          case '/h2':
            blockType = 'heading2';
            break;
          case '/subheading':
          case '/h3':
            blockType = 'heading3';
            break;
          case '/body':
            blockType = 'paragraph';
            break;
          case '/monostyled':
          case '/code':
            blockType = 'code';
            break;
          case '/bulletedlist':
            blockType = 'bulletList';
            break;
          case '/numberedlist':
            blockType = 'orderedList';
            break;
        }
        
        if (blockType) {
          // Set flag to prevent new block creation
          isProcessingCommand.current = true;
          
          // Store current state for restoring
          const oldState = editor.state;
          
          // Temporarily disable TipTap keyboard events
          const oldHandleKeyDown = editor.view.dom.onkeydown;
          editor.view.dom.onkeydown = function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
            return oldHandleKeyDown?.call(this, e);
          };
          
          // Clear content and update immediately
          editor.commands.clearContent();
          updateBlock(block.id, { type: blockType as Block["type"] });
          
          // Apply format based on type
          switch (blockType) {
            case "title":
              editor.chain().focus().setHeading({ level: 1 }).run();
              break;
            case "heading2":
              editor.chain().focus().setHeading({ level: 2 }).run();
              break;
            case "heading3":
              editor.chain().focus().setHeading({ level: 3 }).run();
              break;
            case "bulletList":
              editor.chain().focus().run();
              editor.commands.insertContent({
                type: 'bulletList',
                content: [{
                  type: 'listItem',
                  content: [{ type: 'paragraph' }]
                }]
              });
              break;
            case "orderedList":
              editor.chain().focus().run();
              editor.commands.insertContent({
                type: 'orderedList',
                content: [{
                  type: 'listItem',
                  content: [{ type: 'paragraph' }]
                }]
              });
              break;
            case "code":
              editor.chain().focus().setCodeBlock().run();
              break;
            case "paragraph":
            default:
              editor.chain().focus().setParagraph().run();
              break;
          }
          
          // Restore keyboard handler
          setTimeout(() => {
            editor.view.dom.onkeydown = oldHandleKeyDown;
            editor.commands.focus('end');
            
            // Reset processing flag
            setTimeout(() => {
              isProcessingCommand.current = false;
            }, 100);
          }, 50);
          
          return;
        }
      }
      
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
    
    // '/' key for commands - only open format menu on "/" if we're not already in a command
    if (event.key === "/" && editor.isEmpty) {
      // Don't prevent default here - allow the "/" to be typed
      setTimeout(() => {
        // Only open format menu if we just typed "/" and nothing else
        if (editor.getText() === "/") {
          setShowFormatMenu(true);
        }
      }, 10);
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
        return "Body";
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

  // Monitor text changes to handle slash commands
  useEffect(() => {
    if (!editor || !showFormatMenu) return;
    
    const handleTextUpdate = () => {
      const text = editor.getText();
      // If user has typed more than just "/", close the format menu
      // as they're likely typing a command
      if (text.length > 1 && text.startsWith('/')) {
        setShowFormatMenu(false);
      }
    };
    
    const updateListener = () => {
      handleTextUpdate();
    };
    
    editor.on('update', updateListener);
    
    return () => {
      editor.off('update', updateListener);
    };
  }, [editor, showFormatMenu]);

  // Close format menu when dragging
  useEffect(() => {
    if (isDragging) setShowFormatMenu(false);
  }, [isDragging]);

  // Update menu visibility when active state changes
  useEffect(() => {
    if (isActive || isDropdownOpen || isHovered) {
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  }, [isActive, isDropdownOpen, isHovered]);

  // Calculate format menu visibility
  const showFormatMenuVisible = isActive || isHovered;

  const getWordCount = () => {
    if (!editor) return 0;
    const text = editor.getText().trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  };

  // after selecting a language, refocus editor
  const handleDropdownChange = (v: string) => {
    updateBlock(block.id, { language: v });
    if (editor) {
      editor.commands.updateAttributes('codeBlock', { language: v });
      setTimeout(() => {
        editor.commands.focus();
      }, 50);
    }
  };

  // IMPORTANT: Calculate visibility states
  const showDropdown = block.type === "code" && (isActive || isDropdownOpen);
  const formatMenuVisible = showFormatMenu && showFormatMenuVisible;

  useEffect(() => {
    if (!editor) return;
    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      if (text) {
        editor.commands.insertContent(text);
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener('paste', handlePaste);
    return () => {
      dom.removeEventListener('paste', handlePaste);
    };
  }, [editor]);

  return (
    <div className="relative w-full">
      <div
        className="relative w-full flex flex-row items-start"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={-1}
      >
        {showDropdown && (
          <div
            className="absolute left-0 top-2 z-10 animate-fade-in"
            style={{ transform: 'translateX(-130%)' }}
          >
            <Select
              value={block.language || "plaintext"}
              onValueChange={handleDropdownChange}
              onOpenChange={(open) => {
                setIsDropdownOpen(open);
                
                // If dropdown is closing and editor exists, refocus the editor
                if (!open && editor) {
                  setTimeout(() => {
                    if (editor.isFocused) return;
                    editor.commands.focus();
                  }, 100);
                }
              }}
            >
              <SelectTrigger
                className="w-[120px] h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plaintext">plaintext</SelectItem>
                <SelectItem value="javascript">javascript</SelectItem>
                <SelectItem value="typescript">typescript</SelectItem>
                <SelectItem value="python">python</SelectItem>
                <SelectItem value="java">java</SelectItem>
                <SelectItem value="c">c</SelectItem>
                <SelectItem value="cpp">cpp</SelectItem>
                <SelectItem value="go">go</SelectItem>
                <SelectItem value="ruby">ruby</SelectItem>
                <SelectItem value="rust">rust</SelectItem>
                <SelectItem value="php">php</SelectItem>
                <SelectItem value="markdown">markdown</SelectItem>
                <SelectItem value="json">json</SelectItem>
                <SelectItem value="html">html</SelectItem>
                <SelectItem value="css">css</SelectItem>
                <SelectItem value="shell">shell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex-1">
          <div
            ref={setNodeRef}
            style={style}
            className={`relative group w-full flex ${isFirstBlock ? 'first-block' : ''} ${block.type} ${isActive ? 'active' : ''}`}
            data-block-id={block.id}
            {...attributes}
          >
            <div className="w-full flex relative">
              <div
                className={`w-[calc(100%-160px)] py-1 focus:outline-none ${getBlockClass(block.type)}`}
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
              {showMenu && (
                <div className="w-[160px] flex flex-col justify-start items-start pl-2 animate-fade-in">
                  <div 
                    className="flex flex-nowrap items-center justify-start py-1 px-3 rounded hover:bg-gray-100 cursor-pointer text-gray-500 text-sm group w-full select-none" 
                    ref={formatMenuButtonRef} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFormatMenu();
                    }}
                  >
                    <div 
                      className="min-w-[8px] grid grid-rows-3 grid-cols-2 gap-px cursor-grab active:cursor-grabbing drag-handle select-none"
                      {...listeners}
                    >
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-gray-400 select-none"></div>
                      ))}
                    </div>
                    <span className="ml-2 whitespace-nowrap select-none">{getBlockTypeName(block.type)}</span>
                  </div>
                  <div className="flex items-center justify-start w-full text-xs text-gray-400 select-none px-3 pb-1">
                    {getWordCount()} word{getWordCount() !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
            {formatMenuVisible && (
              <FormatDropdown
                onSelect={handleFormatSelect}
                onClose={() => setShowFormatMenu(false)}
                buttonRef={formatMenuButtonRef}
              />
            )}
            {showSelectionMenu && editor && (
              <SelectionMenu
                editor={editor}
                position={selectionPosition}
                onClose={() => setShowSelectionMenu(false)}
                selectedText={selectedText}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}