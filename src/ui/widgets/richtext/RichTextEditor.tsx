/**
 * Rich-text editor widget (TipTap / ProseMirror) — the built-in editor for the
 * `richtext` field type. Controlled: `value` is an HTML string, `onChange`
 * receives the HTML on every edit. Output matches the read-only renderer
 * (`display.tsx` → `.prose`), so what you type is what you see.
 *
 * This module is loaded lazily (see ./index.tsx) so ProseMirror only ships in the
 * bundle of apps that actually use rich text.
 */
import { Fragment, useEffect, useRef } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  RemoveFormatting,
  Undo,
  Redo,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/components/ui/button'
import type { RichTextAction } from '@/engine'
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

function promptLink(editor: Editor) {
  const prev = editor.getAttributes('link').href as string | undefined
  const url = window.prompt('URL', prev ?? 'https://')
  if (url === null) return
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

/**
 * Every toolbar action the editor can offer, by id. `form.toolbar` picks a subset
 * (see RICHTEXT_ACTIONS below for the ids); the whole set is the default.
 *
 * An action MUST have a matching allowed tag in the server-side HTML sanitizer,
 * or the editor writes markup the save silently strips — enabling one here is
 * half the change.
 */
const ACTIONS: Record<
  RichTextAction,
  {
    icon: LucideIcon
    label: string
    isActive?: (e: Editor) => boolean
    isDisabled?: (e: Editor) => boolean
    run: (e: Editor) => void
  }
> = {
  bold: {
    icon: Bold,
    label: 'Bold',
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run()
  },
  italic: {
    icon: Italic,
    label: 'Italic',
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run()
  },
  underline: {
    icon: UnderlineIcon,
    label: 'Underline',
    isActive: (e) => e.isActive('underline'),
    run: (e) => e.chain().focus().toggleUnderline().run()
  },
  strike: {
    icon: Strikethrough,
    label: 'Strikethrough',
    isActive: (e) => e.isActive('strike'),
    run: (e) => e.chain().focus().toggleStrike().run()
  },
  h2: {
    icon: Heading2,
    label: 'Heading 2',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run()
  },
  h3: {
    icon: Heading3,
    label: 'Heading 3',
    isActive: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run()
  },
  bulletList: {
    icon: List,
    label: 'Bullet list',
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run()
  },
  orderedList: {
    icon: ListOrdered,
    label: 'Numbered list',
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run()
  },
  blockquote: {
    icon: Quote,
    label: 'Quote',
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run()
  },
  link: {
    icon: LinkIcon,
    label: 'Link',
    isActive: (e) => e.isActive('link'),
    run: promptLink
  },
  // Drops every mark AND block type in the selection — the "I pasted this from
  // Word" escape hatch. Produces no markup of its own, so it is always safe.
  clearFormat: {
    icon: RemoveFormatting,
    label: 'Clear formatting',
    run: (e) => e.chain().focus().unsetAllMarks().clearNodes().run()
  },
  undo: {
    icon: Undo,
    label: 'Undo',
    isDisabled: (e) => !e.can().undo(),
    run: (e) => e.chain().focus().undo().run()
  },
  redo: {
    icon: Redo,
    label: 'Redo',
    isDisabled: (e) => !e.can().redo(),
    run: (e) => e.chain().focus().redo().run()
  }
}

// Toolbar layout: ordered groups, rendered with a divider between them. A custom
// `form.toolbar` filters the ids; a group left with no action renders nothing (and
// no stray divider), so any subset stays visually grouped without the caller
// having to place separators.
const GROUPS: RichTextAction[][] = [
  ['bold', 'italic', 'underline', 'strike'],
  ['h2', 'h3'],
  ['bulletList', 'orderedList', 'blockquote', 'link'],
  ['clearFormat'],
  ['undo', 'redo']
]

/** Toolbar action ids, in default order — the default when `form.toolbar` is unset. */
export const RICHTEXT_ACTIONS: RichTextAction[] = GROUPS.flat()

function Toolbar({ editor, actions }: { editor: Editor; actions: RichTextAction[] }) {
  const enabled = new Set(actions)
  const groups = GROUPS.map((g) => g.filter((id) => enabled.has(id) && ACTIONS[id])).filter(
    (g) => g.length > 0
  )
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
      {groups.map((group, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="mx-1 h-5 w-px bg-border" />}
          {group.map((id) => {
            const a = ACTIONS[id]
            return (
              <ToolbarButton
                key={id}
                icon={a.icon}
                label={a.label}
                active={a.isActive?.(editor)}
                disabled={a.isDisabled?.(editor)}
                onClick={() => a.run(editor)}
              />
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

export default function RichTextEditor({ field, value, onChange, disabled, t }: WidgetProps) {
  // `form.rows` = visible text rows. One prose-sm row is ~1.5rem, so the inline
  // min-height (which beats the class below) lands on the requested row count.
  const rows = field.form?.rows
  // `form.toolbar` = the actions to show, in RICHTEXT_ACTIONS order (unset = all).
  const actions = field.form?.toolbar ?? RICHTEXT_ACTIONS
  // Read by onUpdate, whose closure would otherwise see the first render's `value`.
  const valueRef = useRef(value)
  valueRef.current = value
  const editor = useEditor({
    editable: !disabled,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener' } })
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[8rem] px-3 py-2 focus:outline-none',
        ...(rows ? { style: `min-height: ${rows * 1.5}rem` } : {})
      }
    },
    // TipTap also fires onUpdate when WE load content (editor init, and the
    // external-sync setContent below) — not just on a user edit. Echoing that back
    // through onChange marks the field as user-edited, and an edit form loses the
    // race: the editor mounts before the record arrives, so the empty document
    // writes '' into the field; `reset(keepDirtyValues)` then refuses to overwrite
    // what looks like the user's own input, and saving wipes the stored text.
    // Only a value that actually differs from what we were handed is a real edit.
    onUpdate: ({ editor }) => {
      const next = normalize(editor.getHTML())
      if (next === (valueRef.current ?? '')) return
      onChange(next)
    }
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
      {!disabled && <Toolbar editor={editor} actions={actions} />}
      <EditorContent
        editor={editor}
        placeholder={field.form?.placeholder ? t(field.form.placeholder) : undefined}
      />
    </div>
  )
}
