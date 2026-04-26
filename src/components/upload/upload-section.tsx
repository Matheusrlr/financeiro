"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { Dropzone } from "./dropzone"
import { DocumentList } from "./document-list"

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
  investmentAccounts: InvestmentAccount[]
}

export function UploadSection({ documents, cards, investmentAccounts }: UploadSectionProps) {
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasProcessing = documents.some((d) => d.status === "processing")

  useEffect(() => {
    if (hasProcessing) {
      intervalRef.current = setInterval(() => {
        router.refresh()
      }, 2500)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [hasProcessing, router])

  function handleUploadSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <Dropzone onUploadSuccess={handleUploadSuccess} cards={cards} investmentAccounts={investmentAccounts} />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Documentos enviados</h3>
        <DocumentList documents={documents} loading={false} />
      </div>
    </div>
  )
}
