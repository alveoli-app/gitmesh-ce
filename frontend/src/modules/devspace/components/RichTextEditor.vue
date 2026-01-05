<template>
  <div ref="editorContainer" class="rich-text-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <div v-if="editor" class="editor-toolbar">
      <div class="toolbar-left">
        <button 
          type="button"
          @click="editor.chain().focus().toggleBold().run()" 
          :class="{ 'is-active': editor.isActive('bold') }"
        >
          <i class="ri-bold"></i>
        </button>
        <button 
          type="button"
          @click="editor.chain().focus().toggleItalic().run()" 
          :class="{ 'is-active': editor.isActive('italic') }"
        >
          <i class="ri-italic"></i>
        </button>
        <button 
          type="button"
          @click="editor.chain().focus().toggleStrike().run()" 
          :class="{ 'is-active': editor.isActive('strike') }"
        >
          <i class="ri-strikethrough"></i>
        </button>
        <button 
          type="button"
          @click="editor.chain().focus().toggleCode().run()" 
          :class="{ 'is-active': editor.isActive('code') }"
        >
          <i class="ri-code-line"></i>
        </button>
        <div class="divider"></div>
        <button 
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" 
          :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        >
          H1
        </button>
        <button 
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" 
          :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        >
          H2
        </button>
        <button 
          type="button"
          @click="editor.chain().focus().toggleBulletList().run()" 
          :class="{ 'is-active': editor.isActive('bulletList') }"
        >
          <i class="ri-list-unordered"></i>
        </button>
        <button 
          type="button"
          @click="editor.chain().focus().toggleOrderedList().run()" 
          :class="{ 'is-active': editor.isActive('orderedList') }"
        >
          <i class="ri-list-ordered"></i>
        </button>
        <button 
          type="button"
          @click="editor.chain().focus().toggleBlockquote().run()" 
          :class="{ 'is-active': editor.isActive('blockquote') }"
        >
          <i class="ri-double-quotes-l"></i>
        </button>
      </div>
      <div class="toolbar-right">
        <button 
          type="button"
          @click.prevent.stop="toggleFullscreen" 
          class="fullscreen-btn"
          :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'"
        >
          <i :class="isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"></i>
        </button>
      </div>
    </div>
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { ref } from 'vue'

export default {
  name: 'RichTextEditor',
  components: {
    EditorContent,
  },
  props: {
    modelValue: {
      type: [String, Object],
      default: '',
    },
    placeholder: {
      type: String,
      default: 'Write a description...',
    },
    editable: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue', 'blur'],
  setup(props, { emit }) {
    const isFullscreen = ref(false)
    const editorContainer = ref(null)
    
    const editor = useEditor({
      content: props.modelValue,
      extensions: [
        StarterKit,
        Link.configure({
          openOnClick: false,
        }),
        Placeholder.configure({
          placeholder: props.placeholder,
        }),
      ],
      editable: props.editable,
      onUpdate: ({ editor }) => {
        emit('update:modelValue', editor.getJSON())
      },
      onBlur: ({ editor }) => {
        emit('blur', editor.getJSON())
      },
    })

    const toggleFullscreen = () => {
      if (!editorContainer.value) {
        console.warn('Editor container not found')
        return
      }
      
      if (!isFullscreen.value) {
        // Entering fullscreen
        isFullscreen.value = true
        document.body.style.overflow = 'hidden'
      } else {
        // Exiting fullscreen
        isFullscreen.value = false
        document.body.style.overflow = ''
      }
    }
    
    // Listen for ESC key to exit fullscreen
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && isFullscreen.value) {
        toggleFullscreen()
      }
    }
    
    document.addEventListener('keydown', handleKeydown)

    return {
      editor,
      isFullscreen,
      toggleFullscreen,
      editorContainer,
      handleKeydown,
    }
  },
  watch: {
    modelValue(value) {
      // JSON parity check to avoid cursor jumping
      const currentContent = this.editor.getJSON()
      const isSame = JSON.stringify(currentContent) === JSON.stringify(value)
      if (isSame) {
        return
      }
      this.editor.commands.setContent(value, false)
    },
    editable(value) {
      this.editor.setEditable(value)
    },
  },
  beforeUnmount() {
    // Clean up event listeners
    document.removeEventListener('keydown', this.handleKeydown)
    
    // Restore body overflow if in fullscreen
    if (this.isFullscreen) {
      document.body.style.overflow = ''
    }
    
    this.editor.destroy()
  },
}
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background-color: #18181b;
  position: relative;
  transition: all 0.3s ease;
  display: flex !important;
  flex-direction: column !important;
  min-height: 200px !important;
  height: 100%;
}

/* CSS-based fullscreen - simpler and more reliable */
.rich-text-editor.is-fullscreen {
  position: fixed !important;
  top: 56px !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 56px) !important;
  z-index: 99999 !important;
  border-radius: 0;
  margin: 0;
  border: none;
  max-width: none !important;
  max-height: none !important;
  background-color: #09090b;
}

.is-fullscreen .editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 100000 !important;
  background-color: #18181b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid #27272a;
}

.editor-toolbar {
  display: flex !important;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: #27272a;
  flex-shrink: 0 !important;
  min-height: 44px !important;
  height: 44px;
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}

.editor-toolbar button {
  border: none;
  background: transparent;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #a1a1aa;
  font-size: 14px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.editor-toolbar button:hover {
  background-color: #3f3f46;
  color: #e4e4e7;
}

.editor-toolbar button.is-active {
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.fullscreen-btn {
  padding: 6px 10px !important;
}

.fullscreen-btn i {
  font-size: 16px;
}

.divider {
  width: 1px;
  background-color: #3f3f46;
  margin: 0 4px;
  height: 20px;
  flex-shrink: 0;
}

.editor-content {
  padding: 12px;
  min-height: 150px !important;
  height: auto;
  overflow-y: auto;
  transition: all 0.3s ease;
  flex: 1 1 auto !important;
  background-color: #18181b;
}

.is-fullscreen .editor-content {
  min-height: calc(100vh - 116px) !important;
  max-height: calc(100vh - 116px);
  padding: 24px;
  overflow-y: auto;
  background-color: #09090b;
}

:deep(.ProseMirror) {
  outline: none;
  min-height: 150px !important;
  height: auto;
  color: #e4e4e7;
  background-color: transparent;
}

.is-fullscreen :deep(.ProseMirror) {
  min-height: calc(100vh - 156px);
  max-width: 900px;
  margin: 0 auto;
  color: #e4e4e7;
}

/* Dark mode text styling */
:deep(.ProseMirror h1),
:deep(.ProseMirror h2),
:deep(.ProseMirror h3),
:deep(.ProseMirror h4),
:deep(.ProseMirror h5),
:deep(.ProseMirror h6) {
  color: #fafafa;
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

:deep(.ProseMirror h1) {
  font-size: 2em;
}

:deep(.ProseMirror h2) {
  font-size: 1.5em;
}

:deep(.ProseMirror p) {
  color: #d4d4d8;
  margin: 0.5em 0;
  line-height: 1.6;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  color: #d4d4d8;
  padding-left: 1.5em;
  margin: 0.5em 0;
}

:deep(.ProseMirror li) {
  margin: 0.25em 0;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #3f3f46;
  padding-left: 1em;
  color: #a1a1aa;
  margin: 1em 0;
  font-style: italic;
}

:deep(.ProseMirror code) {
  background-color: #27272a;
  color: #60a5fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

:deep(.ProseMirror pre) {
  background-color: #18181b;
  color: #e4e4e7;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  border: 1px solid #27272a;
  margin: 1em 0;
}

:deep(.ProseMirror pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

:deep(.ProseMirror a) {
  color: #60a5fa;
  text-decoration: underline;
}

:deep(.ProseMirror a:hover) {
  color: #93c5fd;
}

:deep(.ProseMirror strong) {
  color: #fafafa;
  font-weight: 600;
}

:deep(.ProseMirror em) {
  color: #d4d4d8;
  font-style: italic;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #52525b;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
