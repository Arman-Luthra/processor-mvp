import { useState, useEffect, useRef, useCallback } from "react";
import DocumentTitle from "@/components/DocumentTitle";
import TextBlock from "@/components/TextBlock";
import { useAutoSave } from "@/lib/useAutoSave";
import { nanoid } from "nanoid";
import { Block } from "@shared/schema";
import { DndContext, DragEndEvent, DragStartEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface NotionEditorProps {
  initialTitle: string;
  initialContent: any[];
  onSave: (title: string, content: any[]) => void;
  isSaving: boolean;
}

export default function NotionEditor({
  initialTitle,
  initialContent,
  onSave,
  isSaving,
}: NotionEditorProps) {
  const [title, setTitle] = useState(initialTitle || "Untitled");
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialContent && initialContent.length > 0) {
      return initialContent as Block[];
    }
    // Create a default paragraph block if no content
    return [
      {
        id: nanoid(),
        type: "paragraph",
        content: "<p></p>",
      },
    ];
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  // Set up sensors for DndKit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler for drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handler for drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setBlocks((prevBlocks) => {
        const oldIndex = prevBlocks.findIndex(block => block.id === active.id);
        const newIndex = prevBlocks.findIndex(block => block.id === over.id);
        
        return arrayMove(prevBlocks, oldIndex, newIndex);
      });
    }
    
    setActiveId(null);
  };

  // Perform autosave
  useAutoSave(
    {
      title,
      content: blocks,
    },
    (data) => {
      onSave(data.title, data.content);
    },
    3000 // 3 seconds delay
  );

  // Update title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  // Track the ID of the most recently created block
  const [lastCreatedBlockId, setLastCreatedBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Map<string, HTMLElement | ((node: HTMLElement | null) => void)>>(new Map());

  // Register a block reference
  const registerBlockRef = (id: string, element: HTMLElement | ((node: HTMLElement | null) => void) | null) => {
    if (element) {
      blockRefs.current.set(id, element);
    } else {
      blockRefs.current.delete(id);
    }
  };

  // Add a new block after the current one
  const addBlockAfter = (blockId: string, blockType: Block["type"] = "paragraph") => {
    const newBlockId = nanoid();
    
    // First update the blocks
    setBlocks((prevBlocks) => {
      const blockIndex = prevBlocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return prevBlocks;

      // All blocks start with empty content
      // The list styles are handled via CSS now
      const newBlock: Block = {
        id: newBlockId,
        type: blockType,
        content: blockType === "paragraph" ? "<p></p>" : "",
      };

      return [
        ...prevBlocks.slice(0, blockIndex + 1),
        newBlock,
        ...prevBlocks.slice(blockIndex + 1),
      ];
    });
    
    // Set the last created block ID
    setLastCreatedBlockId(newBlockId);
  };

  // Delete a block and set focus to adjacent block
  const deleteBlock = (blockId: string) => {
    setBlocks((prevBlocks) => {
      // Don't delete if it's the last block
      if (prevBlocks.length <= 1) return prevBlocks;
      
      // Filter out the block to delete
      return prevBlocks.filter((b) => b.id !== blockId);
    });
  };
  
  // We'll remove the automatic block creation effect as it's causing multiple placeholder issues

  // Update block content
  const updateBlock = (blockId: string, updatedData: Partial<Block>) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, ...updatedData } : block
      )
    );
  };

  // Move a block to a specific position
  const moveBlockToPosition = (blockId: string, targetPosition: number) => {
    setBlocks((prevBlocks) => {
      const blockIndex = prevBlocks.findIndex((b) => b.id === blockId);
      
      // Invalid index or target position
      if (blockIndex === -1 || targetPosition < 0 || targetPosition >= prevBlocks.length) {
        return prevBlocks;
      }
      
      // No need to move if the position is the same
      if (blockIndex === targetPosition) {
        return prevBlocks;
      }
      
      // Create a new array with the block moved to the target position
      const newBlocks = [...prevBlocks];
      const [movedBlock] = newBlocks.splice(blockIndex, 1);
      newBlocks.splice(targetPosition, 0, movedBlock);
      
      return newBlocks;
    });
  };

  // Handle focusing blocks
  const focusBlockById = useCallback((blockId: string) => {
    // Add a brief timeout to ensure DOM has been updated
    setTimeout(() => {
      const ref = blockRefs.current.get(blockId);
      if (!ref) return;

      // If it's a function ref (from dnd-kit), we can't directly access the element
      // Instead, we need to find the element with data-block-id attribute
      let element: HTMLElement | null = null;
      
      if (typeof ref === 'function') {
        // Find the element with the matching data-block-id attribute
        element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      } else {
        element = ref;
      }
      
      if (element) {
        // Find the editor and focus it
        const editorElement = element.querySelector('.ProseMirror');
        if (editorElement) {
          (editorElement as HTMLElement).focus();
          
          // Set cursor at the start of the editor
          if (editorElement.firstChild) {
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              // Position at start of text
              range.setStart(editorElement.firstChild, 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
      
      // Reset tracking
      setLastCreatedBlockId(null);
    }, 10);
  }, []);
  
  // Focus the newly created block
  useEffect(() => {
    if (lastCreatedBlockId) {
      focusBlockById(lastCreatedBlockId);
    }
  }, [lastCreatedBlockId, focusBlockById]);
  
  // Reference to the title input (using HTMLDivElement since our title is a contentEditable div)
  const titleRef = useRef<HTMLDivElement>(null);

  // Listen for focus-first-block event (from title)
  useEffect(() => {
    const handleFocusFirstBlock = () => {
      if (blocks.length > 0) {
        focusBlockById(blocks[0].id);
      }
    };
    
    // Handle backspace on empty block to move cursor to previous block
    const handleBlockDeleteBackward = (event: CustomEvent) => {
      const { blockId } = event.detail;
      const blockIndex = blocks.findIndex(b => b.id === blockId);
      
      // If this is the first block, do nothing
      if (blockIndex <= 0) return;
      
      // Get the previous block
      const previousBlockId = blocks[blockIndex - 1].id;
      
      // Delete the current block
      deleteBlock(blockId);
      
      // Focus the previous block
      setTimeout(() => {
        focusBlockById(previousBlockId);
      }, 10);
    };
    
    // Handle backspace on first block to focus title
    const handleFocusTitle = () => {
      // Focus the title input and place cursor at end
      if (titleRef.current) {
        titleRef.current.focus();
        
        // Move cursor to end of text for contentEditable div
        const selection = window.getSelection();
        const range = document.createRange();
        
        // Make sure there's content to select
        if (titleRef.current.childNodes.length > 0) {
          const lastChild = titleRef.current.childNodes[titleRef.current.childNodes.length - 1];
          const length = lastChild.textContent?.length || 0;
          range.setStart(lastChild, length);
        } else {
          // If empty, just put cursor at the beginning
          range.setStart(titleRef.current, 0);
        }
        
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    };
    
    window.addEventListener('focus-first-block', handleFocusFirstBlock);
    window.addEventListener('block-delete-backward', handleBlockDeleteBackward as EventListener);
    window.addEventListener('focus-title', handleFocusTitle);
    
    return () => {
      window.removeEventListener('focus-first-block', handleFocusFirstBlock);
      window.removeEventListener('block-delete-backward', handleBlockDeleteBackward as EventListener);
      window.removeEventListener('focus-title', handleFocusTitle);
    };
  }, [blocks, focusBlockById, deleteBlock]);

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[740px] px-4 py-10 md:py-20">
        {/* Document title */}
        <div className="mb-10 pl-16">
          <DocumentTitle 
            title={title} 
            onChange={handleTitleChange} 
            inputRef={titleRef as React.RefObject<HTMLDivElement>} 
          />
        </div>

        {/* Text blocks - Wrapped in DndContext */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={blocks.map(block => block.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 pl-16 overflow-hidden w-full">
              {blocks.map((block, index) => (
                <TextBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  addBlockAfter={addBlockAfter}
                  deleteBlock={deleteBlock}
                  registerBlockRef={registerBlockRef}
                  shouldFocus={block.id === lastCreatedBlockId}
                  isFirstBlock={index === 0}
                  isLastBlock={index === blocks.length - 1}
                  isDragging={activeId === block.id}
                />
              ))}
              
              {/* Add block button at the end */}
              <div 
                className="flex items-center cursor-pointer opacity-30 hover:opacity-100 transition-opacity my-2"
                onClick={() => {
                  // Add a new paragraph block at the end
                  const lastBlockId = blocks.length > 0 ? blocks[blocks.length - 1].id : null;
                  if (lastBlockId) {
                    addBlockAfter(lastBlockId, 'paragraph');
                  } else {
                    // If no blocks, create the first one
                    const newBlockId = nanoid();
                    setBlocks([{
                      id: newBlockId,
                      type: "paragraph",
                      content: "<p></p>",
                    }]);
                    setLastCreatedBlockId(newBlockId);
                  }
                }}
              >
                <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-gray-500 hover:bg-gray-100">+</div>
                <span className="ml-2 text-sm text-gray-500">Add a block</span>
              </div>
            </div>
          </SortableContext>
        </DndContext>

        {/* Autosave indicator */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
          {isSaving ? "Saving..." : "All changes saved"}
        </div>
      </div>
    </div>
  );
}
