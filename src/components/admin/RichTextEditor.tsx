"use client"

import { useEffect, useRef } from "react"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  RemoveFormatting,
  Heading2,
} from "lucide-react"

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ""
    }
  }, [value])

  function exec(command: string, commandValue?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    onChange(editorRef.current?.innerHTML ?? "")
  }

  function handleLink() {
    const url = window.prompt("Informe a URL do link")
    if (!url) return
    exec("createLink", url)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="flex flex-wrap gap-2 border-b border-border/70 px-3 py-3">
        <ToolbarButton title="Título" onClick={() => exec("formatBlock", "<h2>")}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Negrito" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Itálico" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Lista" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Citação" onClick={() => exec("formatBlock", "<blockquote>")}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Link" onClick={handleLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Limpar formatação" onClick={() => exec("removeFormat")}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
        className="min-h-[260px] cursor-text px-4 py-4 text-sm leading-7 outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2"
        data-placeholder={placeholder ?? "Escreva o conteúdo do tópico..."}
      />
      <style jsx>{`
        div[contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: rgb(113 113 122);
        }
      `}</style>
    </div>
  )
}
