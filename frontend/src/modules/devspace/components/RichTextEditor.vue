<template>
  <div class="rich-text-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <div v-if="editor" class="editor-toolbar">
      <div class="toolbar-left">
        <button 
          @click="editor.chain().focus().toggleBold().run()" 
          :class="{ 'is-active': editor.isActive('bold') }"
        >
          <i class="ri-bold"></i>
        </button>
        <button 
          @click="editor.chain().focus().toggleItalic().run()" 
          :class="{ 'is-active': editor.isActive('italic') }"
        >
          <i class="ri-italic"></i>
        </button>
        <button 
          @click="editor.chain().focus().toggleStrike().run()" 
          :class="{ 'is-active': editor.isActive('strike') }"
        >
          <i class="ri-strikethrough"></i>
        </button>
        <button 
          @click="editor.chain().focus().toggleCode().run()" 
          :class="{ 'is-active': editor.isActive('code') }"
        >
          <i class="ri-code-line"></i>
        </button>
        <div class="divider"></div>
        <button 
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" 
          :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        >
          H1
        </button>
        <button 
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" 
          :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        >
          H2
        </button>
        <button 
          @click="editor.chain().focus().toggleBulletList().run()" 
          :class="{ 'is-active': editor.isActive('bulletList') }"
        >
          <i class="ri-list-unordered"></i>
        </button>
        <button 
          @click="editor.chain().focus().toggleOrderedList().run()" 
          :class="{ 'is-active': editor.isActive('orderedList') }"
        >
          <i class="ri-list-ordered"></i>
        </button>
        <button 
          @click="editor.chain().focus().toggleBlockquote().run()" 
          :class="{ 'is-active': editor.isActive('blockquote') }"
        >
          <i class="ri-double-quotes-l"></i>
        </button>
      </div>
      <div class="toolbar-right">
        <button 
          @click="toggleFullscreen" 
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
      isFullscreen.value = !isFullscreen.value
    }

    return {
      editor,
      isFullscreen,
      toggleFullscreen,
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
    this.editor.destroy()
  },
}
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--el-bg-color);
  position: relative;
  transition: all 0.3s ease;
}

.rich-text-editor.is-fullscreen {
  position: fixed !important;
  top: 56px !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 56px) !important;
  z-index: 2999 !important;
  border-radius: 0;
  margin: 0;
}

.is-fullscreen .editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 3000 !important;
  background-color: var(--el-fill-color-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-fill-color-light);
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
  color: var(--el-text-color-regular);
  font-size: 14px;
  transition: all 0.2s;
}

.editor-toolbar button:hover {
  background-color: var(--el-fill-color-darker);
}

.editor-toolbar button.is-active {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.fullscreen-btn {
  padding: 6px 10px !important;
}

.fullscreen-btn i {
  font-size: 16px;
}

.divider {
  width: 1px;
  background-color: var(--el-border-color);
  margin: 0 4px;
  height: 20px;
}

.editor-content {
  padding: 12px;
  min-height: 150px;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.is-fullscreen .editor-content {
  min-height: calc(100vh - 116px);
  max-height: calc(100vh - 116px);
  padding: 24px;
}

:deep(.ProseMirror) {
  outline: none;
  min-height: 150px;
}

.is-fullscreen :deep(.ProseMirror) {
  min-height: calc(100vh - 156px);
  max-width: 900px;
  margin: 0 auto;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
