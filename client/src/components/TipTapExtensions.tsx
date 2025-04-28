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
      
      // Tab key for list indentation
      Tab: () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return this.editor.commands.sinkListItem('listItem');
        }
        return false;
      },
      
      // Shift+Tab for list outdent
      'Shift-Tab': () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return this.editor.commands.liftListItem('listItem');
        }
        return false;
      },

      // Handle Enter key
      Enter: () => {
        // Let TipTap handle Enter inside code blocks
        if (this.editor.isActive('codeBlock')) {
          return false;
        }
        
        // Special handling for lists
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          // Check if current list item is empty by checking text content directly
          const isEmpty = this.editor.state.selection.$head.parent.textContent === '';
          
          // If we're in an empty list item
          if (isEmpty) {
            // We don't need a counter anymore - if the item is empty, exit the list directly
            // This makes it behave more like Notion - one empty Enter exits the list immediately
            
            // First lift the list item out of the list if it's nested
            this.editor.commands.liftListItem('listItem');
            
            // Check if we're still in a list after lift
            if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
              // Exit the list
              if (this.editor.isActive('bulletList')) {
                this.editor.commands.toggleBulletList();
              } else if (this.editor.isActive('orderedList')) {
                this.editor.commands.toggleOrderedList();
              }
            }
            
            // Force paragraph format for the new block
            this.editor.commands.setParagraph();
            
            // Create a new block below with proper indentation
            setTimeout(() => {
              const event = new CustomEvent('editor-enter-key', {
                detail: {
                  editorId: this.editor.options.element.id,
                  isEmpty: true
                }
              });
              window.dispatchEvent(event);
            }, 0);
            
            return true;
          }
          
          // Let TipTap handle non-empty list items
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