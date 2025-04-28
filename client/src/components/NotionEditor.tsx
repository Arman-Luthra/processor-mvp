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

  // Focus the newly created block
  useEffect(() => {
    if (lastCreatedBlockId) {
      // Short delay to ensure the DOM has updated
      const timeoutId = setTimeout(() => {
        const element = blockRefs.current.get(lastCreatedBlockId);
        if (element) {
          // Find the editor element and focus it
          const editor = element.querySelector('.ProseMirror');
          if (editor) {
            (editor as HTMLElement).focus();
          }
        }
        // Reset the last created block ID
        setLastCreatedBlockId(null);
      }, 10);
      
      return () => clearTimeout(timeoutId);
    }
  }, [lastCreatedBlockId, blocks]);

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
