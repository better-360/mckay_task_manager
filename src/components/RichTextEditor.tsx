'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { 
  Bold, Italic, Strikethrough, Code, List, ListOrdered, 
  Quote, Minus, Image as ImageIcon, Link as LinkIcon,
  CheckSquare, AtSign, Paperclip
} from 'lucide-react'
import { useState, useRef, forwardRef, useImperativeHandle } from 'react'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  minimal?: boolean
}

export interface RichTextEditorRef {
  clearContent: () => void
  setContent: (content: string) => void
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ 
  content = '', 
  onChange, 
  placeholder = 'Yazmaya başlayın...',
  className = '',
  editable = true,
  minimal = false
}, ref) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'bg-blue-100 text-blue-800 px-1 rounded',
        },
        suggestion: {
          items: async ({ query }) => {
            try {
              const response = await fetch('/api/users')
              if (response.ok) {
                const users = await response.json()
                return users
                  .filter((user: any) => 
                    user.name?.toLowerCase().includes(query.toLowerCase()) ||
                    user.email?.toLowerCase().includes(query.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((user: any) => ({
                    id: user.id,
                    label: user.name || user.email,
                  }))
              }
            } catch (error) {
              console.error('Error fetching users:', error)
            }
            return []
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  useImperativeHandle(ref, () => ({
    clearContent: () => {
      editor?.commands.clearContent()
    },
    setContent: (content: string) => {
      editor?.commands.setContent(content)
    }
  }), [editor])

  if (!editor) {
    return null
  }

  const addImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          editor.chain().focus().setImage({ src: data.url }).run()
        } else {
          alert('Dosya yüklenirken hata oluştu')
        }
      } catch (error) {
        console.error('Upload error:', error)
        alert('Dosya yüklenirken hata oluştu')
      }
    }
  }

  const handleFileUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (response.ok) {
            const data = await response.json()
            // Dosya linkini editöre ekle
            editor.chain().focus().insertContent(`<a href="${data.url}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">${data.name}</a>`).run()
          } else {
            alert('Dosya yüklenirken hata oluştu')
          }
        } catch (error) {
          console.error('Upload error:', error)
          alert('Dosya yüklenirken hata oluştu')
        }
      }
    }
    input.click()
  }

  const addLink = () => {
    const url = window.prompt('URL girin:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const MenuBar = () => {
    if (minimal) return null

    return (
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bold') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <Bold className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('italic') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <Italic className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('strike') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('code') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bulletList') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <List className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('orderedList') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('taskList') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <CheckSquare className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('blockquote') ? 'bg-gray-200' : ''
          }`}
          type="button"
        >
          <Quote className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 rounded hover:bg-gray-100"
          type="button"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <button
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-100"
          type="button"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        
        <button
          onClick={addLink}
          className="p-2 rounded hover:bg-gray-100"
          type="button"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        
        <button
          onClick={handleFileUpload}
          className="p-2 rounded hover:bg-gray-100"
          type="button"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      <MenuBar />
      <div className={`p-3 ${minimal ? 'min-h-[80px]' : 'min-h-[120px]'}`}>
        <div 
          className={`${minimal ? 'min-h-[60px]' : 'min-h-[100px]'}`}
        >
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none focus:outline-none h-full"
          />
        </div>
        <style jsx>{`
          .ProseMirror {
            min-height: ${minimal ? '60px' : '100px'} !important;
          }
        `}</style>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
})

export default RichTextEditor 