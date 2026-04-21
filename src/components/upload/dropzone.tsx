"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface DropzoneProps {
  onUploadSuccess: (documentId: string) => void
  documentType?: "credit_card_statement" | "investment_statement"
}

type UploadState = "idle" | "dragging" | "validating" | "uploading" | "success" | "error"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Dropzone({ onUploadSuccess, documentType = "credit_card_statement" }: DropzoneProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (file.type !== "application/pdf") return "Apenas arquivos PDF são aceitos"
    if (file.size > 10 * 1024 * 1024) return "Arquivo muito grande (máx 10MB)"
    return null
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    setState("validating")
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      setState("idle")
      return
    }
    setSelectedFile(file)
    setState("idle")
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setState("dragging")
  }

  function handleDragLeave() {
    setState(selectedFile ? "idle" : "idle")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  async function handleUpload() {
    if (!selectedFile) return
    setState("uploading")

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("type", documentType)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (res.status === 201) {
        toast.success("Fatura enviada! Processamento iniciado.")
        setSelectedFile(null)
        setState("idle")
        onUploadSuccess(data.documentId)
      } else if (res.status === 409) {
        toast.error("Esta fatura já foi enviada anteriormente.")
        setState("idle")
      } else {
        toast.error("Erro ao enviar fatura. Tente novamente.")
        setState("idle")
      }
    } catch {
      toast.error("Erro ao enviar fatura. Tente novamente.")
      setState("idle")
    }
  }

  const isDragging = state === "dragging"
  const isUploading = state === "uploading"

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={[
          "flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {!selectedFile ? (
          <div className="text-center text-muted-foreground">
            <p className="text-sm font-medium">Arraste um PDF ou clique para selecionar</p>
            <p className="mt-1 text-xs">Máximo 10MB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          </div>
        )}
      </div>

      {selectedFile && (
        <Button onClick={handleUpload} disabled={isUploading} className="w-full">
          {isUploading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Enviando...
            </span>
          ) : (
            documentType === "investment_statement" ? "Enviar extrato" : "Enviar fatura"
          )}
        </Button>
      )}
    </div>
  )
}
