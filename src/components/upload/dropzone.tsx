"use client"

import { useRef, useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { currentMonth } from "@/lib/utils"

interface Card {
  id: string
  name: string
  bankCode: string
}

interface DropzoneProps {
  onUploadSuccess: (documentId: string) => void
  cards: Card[]
}

type UploadState = "idle" | "dragging" | "validating" | "uploading" | "success" | "error"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function autoDetectCard(fileName: string, cards: Card[]): string {
  const lower = fileName.toLowerCase()
  if (lower.includes("inter")) {
    const found = cards.find((c) => c.bankCode.toLowerCase() === "inter")
    if (found) return found.id
  }
  if (lower.includes("nubank") || lower.includes("nu_")) {
    const found = cards.find((c) => c.bankCode.toLowerCase() === "nubank")
    if (found) return found.id
  }
  return ""
}

export function Dropzone({ onUploadSuccess, cards }: DropzoneProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [referenceMonth, setReferenceMonth] = useState<string>(currentMonth())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedFile) {
      const detected = autoDetectCard(selectedFile.name, cards)
      setSelectedCardId(detected)
    }
  }, [selectedFile, cards])

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
    setState("idle")
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
    formData.append("referenceMonth", referenceMonth)
    if (selectedCardId) formData.append("cardId", selectedCardId)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (res.status === 201) {
        toast.success("Arquivo enviado! Processando em segundo plano.")
        setSelectedFile(null)
        setSelectedCardId("")
        setReferenceMonth(currentMonth())
        setState("idle")
        onUploadSuccess(data.documentId)
      } else if (res.status === 409) {
        toast.error("Este arquivo já foi enviado anteriormente.")
        setState("idle")
      } else {
        toast.error("Erro ao enviar arquivo. Tente novamente.")
        setState("idle")
      }
    } catch {
      toast.error("Erro ao enviar arquivo. Tente novamente.")
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
            <p className="mt-1 text-xs">Fatura de cartão ou extrato de investimento · Máximo 10MB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cartão</label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Auto-detectar</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês de referência</label>
              <input
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <Button onClick={handleUpload} disabled={isUploading} className="w-full">
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enviando...
              </span>
            ) : (
              "Enviar PDF"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
