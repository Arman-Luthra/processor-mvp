import { useState, useRef, useEffect } from "react";

interface DocumentTitleProps {
  title: string;
  onChange: (title: string) => void;
}

export default function DocumentTitle({ title, onChange }: DocumentTitleProps) {
  // Only store the placeholder state
  const [isPlaceholder, setIsPlaceholder] = useState(title === "Untitled" || !title);
  const titleRef = useRef<HTMLDivElement>(null);
  
  // We'll avoid using state for the title, as this can cause cursor jumping
  // Instead we'll directly update the DOM when needed

  // Initialize title on mount or when title prop changes
  useEffect(() => {
    if (titleRef.current && !titleRef.current.isEqualNode(document.activeElement)) {
      // Only update the DOM if this element is not currently focused
      // This prevents cursor jumping while typing
      titleRef.current.textContent = title || "Untitled";
    }
    
    // Update placeholder state
    setIsPlaceholder(title === "Untitled" || !title);
  }, [title]);

  // Handle focus
  const handleFocus = () => {
    if (isPlaceholder && titleRef.current) {
      // Clear the placeholder text on focus
      titleRef.current.textContent = "";
      setIsPlaceholder(false);
    }
  };

  // Handle input changes
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newTitle = e.currentTarget.textContent || "";
    setIsPlaceholder(newTitle === "");
    onChange(newTitle || "Untitled");
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Dispatch a custom event to tell NotionEditor to focus the first block
      const event = new CustomEvent('focus-first-block', {
        detail: { fromTitle: true }
      });
      
      // This allows NotionEditor to handle the focusing since it knows the blocks
      window.dispatchEvent(event);
    }
  };

  // Handle blur
  const handleBlur = () => {
    // If the title is empty, set it to Untitled
    if (titleRef.current && (!titleRef.current.textContent || !titleRef.current.textContent.trim())) {
      titleRef.current.textContent = "Untitled";
      setIsPlaceholder(true);
      onChange("Untitled");
    }
  };

  // A different approach for initializing the content which works better with contentEditable
  useEffect(() => {
    if (titleRef.current && titleRef.current.textContent === "") {
      titleRef.current.textContent = title || "Untitled";
    }
  }, []);
  
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
    />
  );
}