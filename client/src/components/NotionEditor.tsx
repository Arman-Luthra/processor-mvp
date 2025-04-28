import { useState, useEffect, useRef, useCallback } from "react";
import DocumentTitle from "@/components/DocumentTitle";
import TextBlock from "@/components/TextBlock";
import { useAutoSave } from "@/lib/useAutoSave";
import { nanoid } from "nanoid";
import { Block } from "@shared/schema";

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
        content: "",
      },
    ];
  });

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
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Register a block reference
  const registerBlockRef = (id: string, element: HTMLElement | null) => {
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

      const newBlock: Block = {
        id: newBlockId,
        type: blockType,
        content: "",
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
      return prevBlocks.filter((b) => b.id !== blockId);
    });
  };

  // Update block content
  const updateBlock = (blockId: string, updatedData: Partial<Block>) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, ...updatedData } : block
      )
    );
  };

  // Handle focusing blocks
  const focusBlockById = useCallback((blockId: string) => {
    // Add a brief timeout to ensure DOM has been updated
    setTimeout(() => {
      const element = blockRefs.current.get(blockId);
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
    
    window.addEventListener('focus-first-block', handleFocusFirstBlock);
    window.addEventListener('block-delete-backward', handleBlockDeleteBackward as EventListener);
    
    return () => {
      window.removeEventListener('focus-first-block', handleFocusFirstBlock);
      window.removeEventListener('block-delete-backward', handleBlockDeleteBackward as EventListener);
    };
  }, [blocks, focusBlockById, deleteBlock]);

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[740px] px-4 py-10 md:py-20">
        {/* Document title */}
        <div className="mb-10">
          <DocumentTitle title={title} onChange={handleTitleChange} />
        </div>

        {/* Text blocks */}
        <div className="space-y-3">
          {blocks.map((block) => (
            <TextBlock
              key={block.id}
              block={block}
              updateBlock={updateBlock}
              addBlockAfter={addBlockAfter}
              deleteBlock={deleteBlock}
              registerBlockRef={registerBlockRef}
              shouldFocus={block.id === lastCreatedBlockId}
            />
          ))}
        </div>

        {/* Autosave indicator */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
          {isSaving ? "Saving..." : "All changes saved"}
        </div>
      </div>
    </div>
  );
}
