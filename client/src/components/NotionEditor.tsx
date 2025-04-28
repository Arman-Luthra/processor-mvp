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

  // Add a new block after the current one
  const addBlockAfter = (blockId: string, blockType: Block["type"] = "paragraph") => {
    setBlocks((prevBlocks) => {
      const blockIndex = prevBlocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return prevBlocks;

      const newBlock: Block = {
        id: nanoid(),
        type: blockType,
        content: "",
      };

      return [
        ...prevBlocks.slice(0, blockIndex + 1),
        newBlock,
        ...prevBlocks.slice(blockIndex + 1),
      ];
    });
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
