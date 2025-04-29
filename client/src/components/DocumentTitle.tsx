import { useState, useRef, useEffect, forwardRef } from "react";

interface DocumentTitleProps {
  title: string;
  onChange: (title: string) => void;
  inputRef?: React.RefObject<HTMLDivElement>;
}

export default function DocumentTitle({ title, onChange, inputRef }: DocumentTitleProps) {
  const [isPlaceholder, setIsPlaceholder] = useState(title === "Untitled" || !title);
  const internalTitleRef = useRef<HTMLDivElement>(null);
  
  const titleRef = inputRef || internalTitleRef;
  
  useEffect(() => {
    if (titleRef.current && !titleRef.current.isEqualNode(document.activeElement)) {
      titleRef.current.textContent = title || "Untitled";
    }
    setIsPlaceholder(title === "Untitled" || !title);
  }, [title]);

  const handleFocus = () => {
    if (isPlaceholder && titleRef.current) {
      titleRef.current.textContent = "";
      setIsPlaceholder(false);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newTitle = e.currentTarget.textContent || "";
    setIsPlaceholder(newTitle === "");
    onChange(newTitle || "Untitled");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const event = new CustomEvent('focus-first-block', {
        detail: { fromTitle: true }
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div
      ref={titleRef}
      contentEditable
      className={`text-4xl font-bold outline-none ${isPlaceholder ? 'text-gray-400' : ''}`}
      onFocus={handleFocus}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      data-placeholder={isPlaceholder ? "Untitled" : ""}
    />
  );
}