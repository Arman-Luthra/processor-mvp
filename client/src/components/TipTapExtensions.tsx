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
        
        // Let TipTap handle Enter in lists for proper indentation
        if (this.editor.isActive('bulletList') || 
            this.editor.isActive('orderedList')) {
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

// Extension to preserve HTML during paste operations
const PreserveHtmlOnPaste = Extension.create({
  name: 'preserveHtmlOnPaste',

  addPasteRules() {
    return [
      {
        type: 'text',
        regex: /./g, // Match any text
        handler: ({ match, range, chain }) => {
          // Just let the default paste handler work
          return false;
        },
      },
    ];
  },
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