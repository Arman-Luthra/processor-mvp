import { Block } from "@shared/schema";
import { nanoid } from "nanoid";

// Create a new block
export function createBlock(type: Block["type"] = "paragraph", content: string = "", language?: string): Block {
  const block: Block = {
    id: nanoid(),
    type,
    content,
  };
  if (language) block.language = language;
  return block;
}

// Count words in a string
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

// Get block class based on type
export function getBlockClass(type: Block["type"]): string {
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
    case "paragraph":
    default:
      return "text-base";
  }
}

// Detect if text contains a slash command
export function detectSlashCommand(text: string): boolean {
  return text.trim() === "/";
}

// Get caret position in contenteditable
export function getCaretPosition(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
}

// Set caret position in contenteditable
export function setCaretPosition(element: HTMLElement, position: number): void {
  const range = document.createRange();
  const selection = window.getSelection();
  
  // Find the node and position to place the caret
  let charCount = 0;
  let foundNode: Node | null = null;
  let foundPos = 0;
  
  function findNodeAtPosition(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeLength = node.textContent?.length || 0;
      if (charCount + nodeLength >= position) {
        foundNode = node;
        foundPos = position - charCount;
        return true;
      }
      charCount += nodeLength;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (findNodeAtPosition(node.childNodes[i])) {
          return true;
        }
      }
    }
    return false;
  }
  
  findNodeAtPosition(element);
  
  if (foundNode) {
    range.setStart(foundNode, foundPos);
    range.collapse(true);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}
