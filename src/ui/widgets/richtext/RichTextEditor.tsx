/**
 * Rich-text editor widget (TipTap / ProseMirror) — the built-in editor for the
 * `richtext` field type. Controlled: `value` is an HTML string, `onChange`
 * receives the HTML on every edit. Output matches the read-only renderer
 * (`display.tsx` → `.prose`), so what you type is what you see.
 *
 * This module is loaded lazily (see ./index.tsx) so ProseMirror only ships in the
 * bundle of apps that actually use rich text.
 */
import { useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo,
  Redo,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/components/ui/button'
import type { WidgetProps } from '../types'

/** TipTap emits this for an empty document; store it as '' so "empty" is falsy. */
const EMPTY_HTML = '<p></p>'
const normalize = (html: string) => (html === EMPTY_HTML ? '' : html)

function ToolbarButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn('h-8 w-8', active && 'bg-accent text-accent-foreground')}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep focus in the editor so the command applies to the current selection.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon />
    </Button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
      <ToolbarButton
        icon={Bold}
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={Italic}
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={Heading2}
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        icon={Heading3}
        label="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={List}
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={Quote}
        label="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton icon={LinkIcon} label="Link" active={editor.isActive('link')} onClick={setLink} />
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        icon={Undo}
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        icon={Redo}
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  )
}

export default function RichTextEditor({ field, value, onChange, disabled, t }: WidgetProps) {
  const editor = useEditor({
    editable: !disabled,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener' } })
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[8rem] px-3 py-2 focus:outline-none'
      }
    },
    onUpdate: ({ editor }) => onChange(normalize(editor.getHTML()))
  })

  // Keep the editor in sync when the value changes from outside (form reset,
  // clone prefill, async record load) without clobbering the caret while typing.
  useEffect(() => {
    if (!editor) return
    const incoming = value || ''
    if (incoming !== normalize(editor.getHTML())) {
      editor.commands.setContent(incoming, false)
    }
  }, [value, editor])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) return null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring',
        disabled && 'opacity-60'
      )}
    >
      {!disabled && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        placeholder={field.form?.placeholder ? t(field.form.placeholder) : undefined}
      />
    </div>
  )
}
