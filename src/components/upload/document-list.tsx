"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface DocumentListProps {
  documents: Array<{
    id: string
    fileName: string
    referenceMonth: string
    status: "processing" | "completed" | "error"
    type: "credit_card_statement" | "investment_statement"
    createdAt: string
  }>
  loading: boolean
}

function StatusBadge({ status }: { status: DocumentListProps["documents"][number]["status"] }) {
  if (status === "processing") {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-400">
        Processando...
      </Badge>
    )
  }
  if (status === "completed") {
    return <Badge variant="default" className="bg-emerald-600">Concluído</Badge>
  }
  return <Badge variant="destructive">Erro</Badge>
}

function TypeBadge({ type }: { type: DocumentListProps["documents"][number]["type"] }) {
  if (type === "investment_statement") {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-400">
        Investimento
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-amber-700 border-amber-400">
      Fatura
    </Badge>
  )
}

export function DocumentList({ documents, loading }: DocumentListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum documento enviado ainda.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{doc.fileName}</p>
              <TypeBadge type={doc.type} />
            </div>
            <p className="text-xs text-muted-foreground">
              Referência: {doc.referenceMonth} &middot;{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(doc.createdAt))}
            </p>
          </div>
          <StatusBadge status={doc.status} />
        </div>
      ))}
    </div>
  )
}
