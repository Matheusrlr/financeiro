"use client"

import { useRouter } from "next/navigation"
import { Dropzone } from "./dropzone"
import { DocumentList } from "./document-list"

interface UploadSectionProps {
  documents: Array<{
    id: string
    fileName: string
    referenceMonth: string
    status: "processing" | "completed" | "error"
    createdAt: string
  }>
  documentType: "credit_card_statement" | "investment_statement"
  title: string
}

export function UploadSection({ documents, documentType, title }: UploadSectionProps) {
  const router = useRouter()

  function handleUploadSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <Dropzone onUploadSuccess={handleUploadSuccess} documentType={documentType} />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">{title}</h3>
        <DocumentList documents={documents} loading={false} />
      </div>
    </div>
  )
}
