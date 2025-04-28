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
    } else if (titleRef.current) {
      // Select all text when focusing
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
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
      titleRef.current?.blur();
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
      className={`text-[40px] font-bold focus:outline-none ${isPlaceholder ? 'text-gray-400' : 'text-secondary'}`}
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
