import { useState, useRef, useEffect } from "react";

interface DocumentTitleProps {
  title: string;
  onChange: (title: string) => void;
}

export default function DocumentTitle({ title, onChange }: DocumentTitleProps) {
  const [editableTitle, setEditableTitle] = useState(title);
  const [isPlaceholder, setIsPlaceholder] = useState(title === "Untitled" || !title);
  const titleRef = useRef<HTMLDivElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setEditableTitle(title);
    setIsPlaceholder(title === "Untitled" || !title);
  }, [title]);

  // Handle focus
  const handleFocus = () => {
    if (isPlaceholder) {
      // Clear the placeholder text on focus
      setEditableTitle("");
      if (titleRef.current) {
        titleRef.current.textContent = "";
      }
      setIsPlaceholder(false);
    }
    
    // Always select all text when focusing after a small delay
    // This ensures the browser has time to process the contentEditable focus
    setTimeout(() => {
      if (titleRef.current) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(titleRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 10);
  };

  // Handle input changes
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newTitle = e.currentTarget.textContent || "";
    setEditableTitle(newTitle);
    setIsPlaceholder(false);
    onChange(newTitle);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move focus to the first content block when pressing Enter in title
      const firstBlock = document.querySelector('.editor-content');
      if (firstBlock) {
        (firstBlock as HTMLElement).focus();
      } else {
        titleRef.current?.blur();
      }
    }
  };

  // Handle blur
  const handleBlur = () => {
    if (!editableTitle.trim()) {
      setEditableTitle("Untitled");
      setIsPlaceholder(true);
      onChange("Untitled");
    }
  };

  return (
    <div
      ref={titleRef}
      className={`text-[40px] font-bold focus:outline-none ${isPlaceholder ? 'text-gray-400' : 'text-gray-800'}`}
      contentEditable
      onFocus={handleFocus}
      onBlur={handleBlur}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning={true}
    >
      {editableTitle}
    </div>
  );
}
