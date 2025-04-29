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
  placeholder: "Start writing",
  showOnlyWhenEditable: true,
  showOnlyCurrent: false,
  emptyEditorClass: "is-editor-empty",
  emptyNodeClass: "is-empty"
});

// Custom extension to handle keyboard navigation between blocks
const KeyboardHandler = Extension.create({
  name: "keyboardHandler",

  // Track states for list handling and double-enter detection
  addStorage(): { emptyListItemCount: number; lastEnterTime: number; } {
    return {
      emptyListItemCount: 0,
      lastEnterTime: 0
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
        // Track time for double-enter detection
        const now = Date.now();
        const isDoubleEnter = now - this.storage.lastEnterTime < 500; // 500ms threshold
        this.storage.lastEnterTime = now;
        
        // Special handling for code blocks
        if (this.editor.isActive('codeBlock')) {
          // Always let TipTap handle Enter in code blocks for new lines
          return false;
        }
        
        // Special handling for lists
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          // Check if current list item is empty
          const isEmpty = this.editor.state.selection.$head.parent.textContent === '';
          
          // If we're in an empty list item
          if (isEmpty) {
            // Use TipTap's lift functionality to exit list cleanly
            this.editor.chain()
              .focus()
              .liftListItem('listItem')  // Exit the list properly
              .run();
              
            // For double-enter, don't create a new block, just leave as is
            if (isDoubleEnter) {
              return true;
            }
            
            // For single-enter on empty list item, convert to paragraph and signal for new block
            this.editor.commands.setParagraph();
            
            // No need to create a new block, just continue in current paragraph
            return true;
          }
          
          // Let TipTap handle non-empty list items
          return false;
        }
        
        // Handle first block specially
        const isFirstBlock = this.editor.options.element?.parentElement?.classList.contains('first-block');
        if (isFirstBlock) {
          // Create a new block when Enter in first block
          const event = new CustomEvent('editor-enter-key', {
            detail: {
              editorId: this.editor.options.element?.id,
              isEmpty: this.editor.isEmpty,
              isFirstBlock: true
            }
          });
          window.dispatchEvent(event);
          return true;
        }

        // For non-list, non-code, non-first block formats, create a new block on Enter
        const event = new CustomEvent('editor-enter-key', {
          detail: {
            editorId: this.editor.options.element?.id,
            isEmpty: this.editor.isEmpty
          }
        });

        window.dispatchEvent(event);

        // Prevent TipTap's default Enter behavior for regular paragraphs
        return true;
      },

      // Handle Backspace key
      Backspace: () => {
        const isAtStart = this.editor.state.selection.from === 1;
        const isEmpty = this.editor.isEmpty;
        const isFirstBlock = this.editor.options.element?.parentElement?.classList.contains('first-block');
        
        // Special handling for code blocks
        if (this.editor.isActive('codeBlock')) {
          // If at start of code block and empty, exit to paragraph
          if (isAtStart && isEmpty) {
            // Get the current editor content
            const codeContent = this.editor.getHTML();
            
            // Find parent block element
            const editorElement = this.editor.options.element;
            if (!editorElement) return true;
            
            const blockElement = editorElement.closest('[data-block-id]');
            if (!blockElement) return true;
            
            const blockId = blockElement.getAttribute('data-block-id');
            if (!blockId) return true;
            
            // Clear the editor and set it to paragraph
            this.editor.commands.clearContent();
            this.editor.commands.setParagraph();
            
            // Create a new block after this one
            setTimeout(() => {
              const event = new CustomEvent('code-block-exit', {
                detail: { 
                  blockId, 
                  shouldCreateNewBlock: true,
                  preserveContent: true,
                  originalContent: codeContent
                }
              });
              window.dispatchEvent(event);
            }, 10);
            
            return true;
          }
          
          // Let TipTap handle normal backspace in code blocks
          return false;
        }
        
        if (isEmpty) {
          if (isFirstBlock) {
            // Focus title if in first block
            const event = new CustomEvent('focus-title', {});
            window.dispatchEvent(event);
            return true;
          } else {
            // Delete current block and move to previous
            const event = new CustomEvent('block-delete-backward', {
              detail: {
                blockId: this.editor.options.element?.id
              }
            });
            window.dispatchEvent(event);
            return true;
          }
        }
        
        if (isFirstBlock && isAtStart) {
          // Focus title when at start of first block
          const event = new CustomEvent('focus-title', {});
          window.dispatchEvent(event);
          return true;
        }
        
        return false;
      },

      // Handle Shift+Enter key
      'Shift-Enter': () => {
        // Special handling for code blocks
        if (this.editor.isActive('codeBlock')) {
          // Get the current editor content
          const codeContent = this.editor.getHTML();
          
          // Find parent block element
          const editorElement = this.editor.options.element;
          if (!editorElement) return false;
          
          const blockElement = editorElement.closest('[data-block-id]');
          if (!blockElement) return false;
          
          const blockId = blockElement.getAttribute('data-block-id');
          if (!blockId) return false;
          
          // Clear the editor and set it to paragraph
          this.editor.commands.clearContent();
          this.editor.commands.setParagraph();
          
          // Create a new block after this one
          setTimeout(() => {
            const event = new CustomEvent('code-block-exit', {
              detail: { 
                blockId, 
                shouldCreateNewBlock: true,
                preserveContent: true,
                originalContent: codeContent
              }
            });
            window.dispatchEvent(event);
          }, 10);
          
          return true;
        }
        
        // For other blocks, treat Shift+Enter as a regular Enter to create a new block
        const event = new CustomEvent('editor-enter-key', {
          detail: {
            editorId: this.editor.options.element?.id,
            isEmpty: this.editor.isEmpty
          }
        });
        window.dispatchEvent(event);
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

const CustomSuperscript = Superscript.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      excludes: 'subscript',
    };
  },
});

const CustomSubscript = Subscript.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      excludes: 'superscript',
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
  CustomSuperscript,
  CustomSubscript,
  CodeBlock.configure({
    HTMLAttributes: {
      class: "code-block font-mono bg-[#F7F6F3] p-3 rounded-md",
    },
    exitOnTripleEnter: false,
  }),
  CustomPlaceholder,
  KeyboardHandler,
  PreserveHtmlOnPaste,
  // We're not using RawHtmlSupport since we're handling HTML with wrapper components
];