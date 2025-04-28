import { useState, useRef, useEffect } from "react";

interface DocumentTitleProps {
  title: string;
  onChange: (title: string) => void;
}

export default function DocumentTitle({ title, onChange }: DocumentTitleProps) {
  const [editableTitle, setEditableTitle] = useState(title);
  const titleRef = useRef<HTMLDivElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setEditableTitle(title);
  }, [title]);

  // Handle input changes
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newTitle = e.currentTarget.textContent || "";
    setEditableTitle(newTitle);
    onChange(newTitle);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleRef.current?.blur();
    }
  };

  return (
    <div
      ref={titleRef}
      className="text-[40px] font-bold text-secondary focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      contentEditable
      data-placeholder="Untitled"
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning={true}
    >
      {editableTitle}
    </div>
  );
}
