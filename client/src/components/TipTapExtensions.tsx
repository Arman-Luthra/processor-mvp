import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import CodeBlock from "@tiptap/extension-code-block";
import { Extension } from "@tiptap/core";
import { Node } from "@tiptap/core";

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

  // Track consecutive empty lines in lists
  addStorage(): { emptyListItemCount: number } {
    return {
      emptyListItemCount: 0
    };
  },

  addKeyboardShortcuts() {
    return {
      // Keyboard shortcuts for formatting
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-`': () => this.editor.commands.toggleCode(),
      'Mod-Shift-.': () => this.editor.commands.toggleSuperscript(),
      'Mod-Shift-,': () => this.editor.commands.toggleSubscript(),

      // Handle Enter key
      Enter: () => {
        // Let TipTap handle Enter inside code blocks
        if (this.editor.isActive('codeBlock')) {
          return false;
        }
        
        // Special handling for lists
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          const isEmpty = this.editor.state.doc.textBetween(
            this.editor.state.selection.from - 1,
            this.editor.state.selection.to + 1,
            ''
          ).trim() === '';
          
          // If we're in an empty list item
          if (isEmpty) {
            // Increment the counter of consecutive empty items
            this.storage.emptyListItemCount += 1;
            
            // After two consecutive empties, exit the list and create a new block
            if (this.storage.emptyListItemCount >= 2) {
              // Reset counter
              this.storage.emptyListItemCount = 0;
              
              // Exit the list
              if (this.editor.isActive('bulletList')) {
                this.editor.commands.toggleBulletList();
              } else if (this.editor.isActive('orderedList')) {
                this.editor.commands.toggleOrderedList();
              }
              
              // Create a new block below it
              const event = new CustomEvent('editor-enter-key', {
                detail: {
                  editorId: this.editor.options.element.id,
                  isEmpty: true
                }
              });
              
              window.dispatchEvent(event);
              return true;
            }
          } else {
            // Reset counter for non-empty list items
            this.storage.emptyListItemCount = 0;
          }
          
          // Let TipTap handle regular list behavior
          return false;
        }

        // For non-list, non-code formats, create a new block on Enter
        const event = new CustomEvent('editor-enter-key', {
          detail: {
            editorId: this.editor.options.element.id,
            isEmpty: this.editor.isEmpty
          }
        });

        window.dispatchEvent(event);

        // Prevent TipTap's default Enter behavior for regular paragraphs
        return true;
      },
    };
  },
});

// Simple extension without paste rules to avoid TypeScript errors
const PreserveHtmlOnPaste = Extension.create({
  name: 'preserveHtmlOnPaste',
});

// Create a custom extension that will preserves HTML content
const RawHtmlSupport = Node.create({
  name: 'rawHtml',

  group: 'block',

  content: 'inline*',

  parseHTML() {
    return [
      { tag: 'div' },
      { tag: 'p' },
      { tag: 'ul' },
      { tag: 'ol' },
      { tag: 'li' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0];
  },
});

// Export all extensions TipTap needs
export const TipTapExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: false, // We'll use a custom configured version
    bulletList: {
      HTMLAttributes: {
        class: 'bullet-list',
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: 'ordered-list',
      },
    },
    listItem: {
      HTMLAttributes: {
        class: 'list-item',
      },
    },
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
  PreserveHtmlOnPaste,
  // We're not using RawHtmlSupport since we're handling HTML with wrapper components
];