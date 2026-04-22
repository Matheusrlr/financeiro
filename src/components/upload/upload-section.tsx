"use client"

import { useRouter } from "next/navigation"
import { Dropzone } from "./dropzone"
import { DocumentList } from "./document-list"

interface Card {
  id: string
  name: string
  bankCode: string
}

interface UploadSectionProps {
  documents: Array<{
    id: string
    fileName: string
    referenceMonth: string
    status: "processing" | "completed" | "error"
    type: "credit_card_statement" | "investment_statement"
    createdAt: string
  }>
  cards: Card[]
}

export function UploadSection({ documents, cards }: UploadSectionProps) {
  const router = useRouter()

  function handleUploadSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <Dropzone onUploadSuccess={handleUploadSuccess} cards={cards} />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Documentos enviados</h3>
        <DocumentList documents={documents} loading={false} />
      </div>
    </div>
  )
}
