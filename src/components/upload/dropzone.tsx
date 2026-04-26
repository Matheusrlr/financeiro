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

interface InvestmentAccount {
  id: string
  name: string
  bankCode: string
}

interface DropzoneProps {
  onUploadSuccess: (documentId: string) => void
  cards: Card[]
  investmentAccounts: InvestmentAccount[]
}

type UploadState = "idle" | "dragging" | "validating" | "uploading" | "success" | "error"
type DocType = "credit_card_statement" | "investment_statement"

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

function autoDetectDocType(fileName: string): DocType {
  const lower = fileName.toLowerCase()
  const investmentKeywords = [
    "extrato", "invest", "portfolio", "xp", "btg", "warren", "genial", "modal", "clear", "rico",
    "rentabilidade", "consolidado", "relatorio",
  ]
  return investmentKeywords.some((k) => lower.includes(k)) ? "investment_statement" : "credit_card_statement"
}

export function Dropzone({ onUploadSuccess, cards, investmentAccounts }: DropzoneProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocType>("credit_card_statement")
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [referenceMonth, setReferenceMonth] = useState<string>(currentMonth())
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountBank, setNewAccountBank] = useState("inter")
  const [localAccounts, setLocalAccounts] = useState<InvestmentAccount[]>(investmentAccounts)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedFile) {
      const detectedType = autoDetectDocType(selectedFile.name)
      setDocType(detectedType)
      if (detectedType === "credit_card_statement") {
        const detected = autoDetectCard(selectedFile.name, cards)
        setSelectedCardId(detected)
      } else if (localAccounts.length > 0) {
        setSelectedAccountId(localAccounts[0].id)
      }
    }
  }, [selectedFile, cards, localAccounts])

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

  async function handleCreateAccount() {
    if (!newAccountName.trim()) return
    try {
      const res = await fetch("/api/investment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAccountName.trim(), bankCode: newAccountBank }),
      })
      if (res.ok) {
        const account = await res.json()
        setLocalAccounts((prev) => [...prev, account])
        setSelectedAccountId(account.id)
        setShowNewAccountModal(false)
        setNewAccountName("")
        toast.success("Conta criada com sucesso.")
      } else {
        toast.error("Erro ao criar conta.")
      }
    } catch {
      toast.error("Erro ao criar conta.")
    }
  }

  async function handleUpload() {
    if (!selectedFile) return
    setState("uploading")

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("referenceMonth", referenceMonth)

    if (docType === "credit_card_statement" && selectedCardId) {
      formData.append("cardId", selectedCardId)
    } else if (docType === "investment_statement" && selectedAccountId) {
      formData.append("accountId", selectedAccountId)
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (res.status === 201) {
        toast.success("Arquivo enviado! Processando em segundo plano.")
        setSelectedFile(null)
        setSelectedCardId("")
        setSelectedAccountId(localAccounts.length > 0 ? localAccounts[0].id : "")
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
      {/* Type selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDocType("credit_card_statement")}
          className={[
            "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            docType === "credit_card_statement"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-muted-foreground hover:bg-muted",
          ].join(" ")}
        >
          Cartão de crédito
        </button>
        <button
          type="button"
          onClick={() => setDocType("investment_statement")}
          className={[
            "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            docType === "investment_statement"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-muted-foreground hover:bg-muted",
          ].join(" ")}
        >
          Investimento
        </button>
      </div>

      {/* Drop zone */}
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
            {docType === "credit_card_statement" ? (
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
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Conta de investimento</label>
                <div className="flex gap-1">
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {localAccounts.length === 0 && <option value="">Nenhuma conta</option>}
                    {localAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewAccountModal(true)}
                    title="Nova conta"
                    className="rounded-md border border-input bg-background px-2 text-sm hover:bg-muted"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

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

      {/* New account modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-semibold">Nova conta de investimento</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Ex: Inter Prime"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Banco</label>
              <select
                value={newAccountBank}
                onChange={(e) => setNewAccountBank(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="inter">Inter</option>
                <option value="xp">XP</option>
                <option value="btg">BTG</option>
                <option value="nubank">Nubank</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateAccount} className="flex-1">Criar</Button>
              <Button variant="outline" onClick={() => setShowNewAccountModal(false)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
