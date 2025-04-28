import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import CodeBlock from "@tiptap/extension-code-block";
import { Extension } from "@tiptap/core";

// Custom extension to handle placeholder visibility properly
const CustomPlaceholder = Placeholder.configure({
  placeholder: "Type '/' for commands",
  showOnlyWhenEditable: true,
  showOnlyCurrent: false,
  emptyEditorClass: "is-editor-empty",
  emptyNodeClass: "is-empty",
});

// Custom extension to handle keyboard navigation between blocks
const KeyboardHandler = Extension.create({
  name: "keyboardHandler",
  addKeyboardShortcuts() {
    return {
      // Keyboard shortcuts for formatting
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-`': () => this.editor.commands.toggleCode(),
      'Mod-Shift-.': () => this.editor.commands.toggleSuperscript(),
      'Mod-Shift-,': () => this.editor.commands.toggleSubscript(),
      
      // Disable TipTap's built-in Enter behavior
      Enter: () => {
        // Let TipTap handle Enter inside code blocks
        if (this.editor.isActive('codeBlock')) {
          return false;
        }
        
        // Always create a new block on Enter, even if the current one is empty
        // This matches Notion behavior
        const event = new CustomEvent('editor-enter-key', {
          detail: {
            editorId: this.editor.options.element.id,
            isEmpty: this.editor.isEmpty
          }
        });
        
        // Dispatch on the editor element and window for wider compatibility
        this.editor.options.element.dispatchEvent(event);
        window.dispatchEvent(event);
        
        // Prevent TipTap's default Enter behavior
        return true;
      },
    };
  },
});

// Export all extensions TipTap needs
export const TipTapExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: false, // We'll use a custom configured version
  }),
  Underline,
  Link.configure({
    openOnClick: true,
    HTMLAttributes: {
      class: "text-[#2E75CC] underline",
    },
  }),
  Superscript,
  Subscript,
  CodeBlock.configure({
    HTMLAttributes: {
      class: "code-block font-mono bg-[#F7F6F3] p-3 rounded-md",
    },
  }),
  CustomPlaceholder,
  KeyboardHandler,
];
