# 1.4 — Upload de PDF com Supabase Storage — Tasks

**Spec**: `.specs/features/1.4-pdf-upload/spec.md`
**Status**: Draft

> **Nota sobre testes:** O projeto não tem infraestrutura de testes configurada. Todas as tasks têm `Tests: none`. Verificação via browser + Supabase Storage dashboard.

---

## Execution Plan

### Phase 1: Foundation (Sequential)

```
T1 → (sha256 utility — base para T2 e T3)
```

### Phase 2: Core (Parallel após T1)

```
T1 completo, então:
  ├── T2 [P] → API route POST /api/upload
  ├── T3 [P] → Dropzone component
  └── T4 [P] → DocumentList component (independente de T1, mas agrupa aqui)
```

### Phase 3: Integration (após T2, T3, T4)

```
T2, T3, T4 completos → T5 (página /upload)
```

---

## Task Breakdown

### T1: Utility sha256Hash — hash SHA-256 no browser

**What**: Criar função utilitária `sha256Hash(file: File): Promise<string>` usando Web Crypto API nativa do browser
**Where**: `src/lib/utils.ts` (adicionar à função existente `cn`)
**Depends on**: Nenhuma
**Reuses**: Arquivo existente `src/lib/utils.ts`

**Implementação**:
```ts
export async function sha256Hash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
```

**Done when**:

- [ ] Função exportada em `src/lib/utils.ts`
- [ ] Usa `crypto.subtle.digest` (disponível em browsers modernos e Node 18+)
- [ ] Retorna string hex de 64 caracteres para qualquer `File`
- [ ] TypeScript compila sem erros (`npx tsc --noEmit`)

**Verify**:
```ts
// No console do browser:
const file = new File(["hello"], "test.txt")
sha256Hash(file).then(console.log)
// → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
```

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T2: API route POST /api/upload [P]

**What**: Criar route handler que valida o PDF, verifica duplicata, faz upload no Supabase Storage e insere registro em `documents`
**Where**: `src/app/api/upload/route.ts`
**Depends on**: T1 (sha256Hash — importada aqui no server, reimplementada com Node crypto ou importada de utils)
**Reuses**: `src/db/index.ts`, `src/db/schema.ts` (documents table), `src/lib/supabase/server.ts`

> **Nota sobre hash no server:** `crypto.subtle` está disponível no Node 18+ (Next.js 14+). Reusar `sha256Hash` de `src/lib/utils.ts` é seguro em Route Handlers.

**Flow da API**:
```
1. Extrair user da session → createClient() → getUser() → 401 se não autenticado
2. Ler FormData → file = formData.get("file")
3. Validar: file.type === "application/pdf" → 400 se não
4. Validar: file.size ≤ 10 * 1024 * 1024 → 400 se exceder
5. Calcular SHA-256 do file (sha256Hash)
6. Checar duplicata: db.select().from(documents).where(and(eq(documents.fileHash, hash), eq(documents.userId, user.id)))
   → se existir: return 409 { error: "duplicate", documentId: existing.id }
7. Converter File para Buffer: Buffer.from(await file.arrayBuffer())
8. Upload Storage: supabaseAdmin.storage.from("documents").upload(`${user.id}/${hash}.pdf`, buffer, { contentType: "application/pdf", upsert: false })
   → se erro: return 500 { error: "storage_error" }
9. INSERT documents: db.insert(documents).values({ userId, type: "credit_card_statement", fileName: file.name, storagePath: `${user.id}/${hash}.pdf`, fileHash: hash, referenceMonth: currentMonth(), status: "processing" })
10. Return 201 { documentId: inserted.id, status: "processing" }
```

**Supabase Admin client** (service role para Storage):
```ts
// Criar em src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js"
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**currentMonth helper**:
```ts
// Adicionar em src/lib/utils.ts
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // "YYYY-MM"
}
```

**Done when**:

- [ ] `POST /api/upload` sem sessão retorna 401
- [ ] Arquivo não-PDF retorna 400 `{ error: "invalid_type" }`
- [ ] Arquivo > 10MB retorna 400 `{ error: "file_too_large" }`
- [ ] Segundo upload do mesmo arquivo pelo mesmo usuário retorna 409 `{ error: "duplicate", documentId }`
- [ ] Upload bem-sucedido cria arquivo no bucket `documents` no path `{userId}/{hash}.pdf`
- [ ] Upload bem-sucedido insere registro em `documents` com todos os campos
- [ ] Retorna 201 `{ documentId, status: "processing" }`
- [ ] `src/lib/supabase/admin.ts` criado com `supabaseAdmin`
- [ ] TypeScript compila sem erros

**Verify**:
```bash
# Com sessão válida:
curl -X POST http://localhost:3000/api/upload \
  -F "file=@fatura.pdf"
# → 201 { documentId: "uuid", status: "processing" }

# Segundo upload do mesmo arquivo:
# → 409 { error: "duplicate", documentId: "uuid" }

# Supabase Storage → bucket documents → ver arquivo
# Supabase Table Editor → documents → ver registro
```

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T3: Componente Dropzone (drag & drop UI) [P]

**What**: Criar componente de upload com suporte a drag & drop, validação client-side e progress indicator
**Where**: `src/components/upload/dropzone.tsx`
**Depends on**: T1 (sha256Hash — usada para exibir hash antes do upload, opcional) 
**Reuses**: `src/lib/utils.ts` (sha256Hash), `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`

**Props interface**:
```tsx
interface DropzoneProps {
  onUploadSuccess: (documentId: string) => void
}
```

**Estados internos**: `idle | dragging | validating | uploading | success | error`

**Done when**:

- [ ] Área de drop com borda dashed; ao arrastar arquivo sobre ela, borda muda de cor (estado `dragging`)
- [ ] Aceita arquivo via drag & drop E via clique (abre file picker nativo filtrado por `.pdf`)
- [ ] Validação client-side: tipo MIME `application/pdf` → erro "Apenas arquivos PDF são aceitos"
- [ ] Validação client-side: tamanho > 10MB → erro "Arquivo muito grande (máx 10MB)"
- [ ] Após validação OK: exibe nome e tamanho do arquivo com botão "Enviar fatura"
- [ ] Durante upload (estado `uploading`): spinner + texto "Enviando..." + botão desabilitado
- [ ] Resposta 201: `toast.success("Fatura enviada! Processamento iniciado.")`, chama `onUploadSuccess(documentId)`, reseta para estado `idle`
- [ ] Resposta 409: `toast.error("Esta fatura já foi enviada anteriormente.")`
- [ ] Resposta erro (400/500): `toast.error("Erro ao enviar fatura. Tente novamente.")`
- [ ] TypeScript compila sem erros

**Verify**: `npm run dev` → `/upload` → arrastar PDF → ver preview → clicar "Enviar" → ver spinner → ver toast de sucesso.

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T4: Componente DocumentList [P]

**What**: Criar componente que lista documentos enviados com status badge
**Where**: `src/components/upload/document-list.tsx`
**Depends on**: Nenhuma (recebe dados como props)
**Reuses**: `src/components/ui/badge.tsx`, `src/components/ui/skeleton.tsx`, `src/types/index.ts` (DocumentStatus)

**Props interface**:
```tsx
interface DocumentListProps {
  documents: Array<{
    id: string
    fileName: string
    referenceMonth: string
    status: "processing" | "completed" | "error"
    createdAt: string
  }>
  loading: boolean
}
```

**Status badge mapping**:
- `processing` → Badge variante `outline` + texto "Processando..." (amarelo/warning)
- `completed` → Badge variante `default` + texto "Concluído" (verde)
- `error` → Badge variante `destructive` + texto "Erro" (vermelho)

**Done when**:

- [ ] Quando `loading=true`: exibe 3 skeletons
- [ ] Quando `documents` é vazio (e não loading): exibe "Nenhum documento enviado ainda."
- [ ] Cada item exibe: nome do arquivo, mês de referência (`referenceMonth`), data de envio formatada (pt-BR), badge de status
- [ ] TypeScript compila sem erros

**Verify**: Renderizar com array de 3 documentos mock com statuses diferentes → ver badges corretos.

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T5: Página /upload — integração completa

**What**: Substituir o placeholder da página `/upload` com a UI real integrando Dropzone e DocumentList
**Where**: `src/app/(auth)/upload/page.tsx`
**Depends on**: T2 (API /api/upload), T3 (Dropzone), T4 (DocumentList)
**Reuses**: `src/db/index.ts`, `src/db/schema.ts`, padrão de Server Component do `(auth)/dashboard/page.tsx`

**Estratégia (Server Component + Client islands)**:
```
Page (Server Component)
├── busca documentos do usuário via Drizzle diretamente
├── passa para UploadSection (Client Component) que contém:
│   ├── Dropzone (upload + onUploadSuccess)
│   └── DocumentList (lista reativa via router.refresh())
```

**Done when**:

- [ ] Página busca documentos do usuário com `db.select().from(documents).where(eq(documents.userId, user.id)).orderBy(desc(documents.createdAt))`
- [ ] `DocumentList` recebe documentos do servidor como prop inicial
- [ ] Após upload bem-sucedido (`onUploadSuccess`): chama `router.refresh()` para re-renderizar o Server Component e atualizar a lista
- [ ] Título "Upload" e subtítulo "Envie faturas de cartão em PDF" (substituindo placeholder)
- [ ] TypeScript compila sem erros

**Verify**:
```
npm run dev → /upload
→ ver área de drop vazia + "Nenhum documento enviado ainda."
→ enviar PDF → ver toast de sucesso → lista atualiza com novo documento (status "Processando...")
→ Supabase Storage → confirmar arquivo em documents/{userId}/{hash}.pdf
→ Supabase Table Editor → documents → confirmar registro
```

**Tests**: none
**Gate**: `npx tsc --noEmit`

**Commit**: `feat(upload): implement PDF upload with Supabase Storage and deduplication`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 → sha256Hash utility

Phase 2 (Parallel após T1):
  T1 completo, então:
    ├── T2 [P] → API route /api/upload
    ├── T3 [P] → Dropzone component
    └── T4 [P] → DocumentList component

Phase 3 (Sequential após T2, T3, T4):
  T5 → Página /upload (integração final)
```

---

## Task Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: sha256Hash utility | 1 função em arquivo existente | ✅ Granular |
| T2: API POST /api/upload | 1 arquivo, 1 endpoint + helper admin | ✅ Granular |
| T3: Dropzone component | 1 componente com estados | ✅ Granular |
| T4: DocumentList component | 1 componente de listagem | ✅ Granular |
| T5: Página /upload | 1 arquivo de integração final | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagrama Mostra | Status |
|------|-------------------|-----------------|--------|
| T1 | Nenhuma | Phase 1 solo | ✅ |
| T2 | T1 | Após T1, paralelo com T3/T4 | ✅ |
| T3 | T1 | Após T1, paralelo com T2/T4 | ✅ |
| T4 | Nenhuma* | Phase 2 paralelo (agrupa com T2/T3) | ✅ |
| T5 | T2, T3, T4 | Após T2, T3 e T4 | ✅ |

> *T4 é independente de T1 mas agrupa na Phase 2 pois só faz sentido executar junto com as outras tasks de UI.

---

## Test Co-location Validation

> Sem TESTING.md — nenhum framework configurado.

| Task | Camada criada | Matriz requer | Task diz | Status |
|------|---------------|--------------|----------|--------|
| T1 | Utility | none | none | ✅ |
| T2 | API Route | none | none | ✅ |
| T3 | UI Component | none | none | ✅ |
| T4 | UI Component | none | none | ✅ |
| T5 | Page | none | none | ✅ |

---

## Requirement Traceability

| Req ID | Task | Status |
|--------|------|--------|
| UPLOAD-01 (drag & drop highlight) | T3 | Pending |
| UPLOAD-02 (validação MIME + extensão) | T3 (client) + T2 (server) | Pending |
| UPLOAD-03 (validação tamanho ≤ 10MB) | T3 (client) + T2 (server) | Pending |
| UPLOAD-04 (hash SHA-256 no browser) | T1, T3 | Pending |
| UPLOAD-05 (dedup check antes do upload) | T2 (server-side check) | Pending |
| UPLOAD-06 (upload para Supabase Storage) | T2 | Pending |
| UPLOAD-07 (INSERT documents processing) | T2 | Pending |
| UPLOAD-08 (progress indicator) | T3 (spinner + disabled state) | Pending |
| UPLOAD-09 (toast sucesso/erro) | T3 | Pending |
| UPLOAD-10 (atomicidade Storage → INSERT) | T2 (storage first, insert only on success) | Pending |
| UPLOAD-11 (lista de documentos com badges) | T4, T5 | Pending |

---

## Arquivos a criar/modificar (resumo)

| Arquivo | Ação |
|---------|------|
| `src/lib/utils.ts` | Modificar — adicionar `sha256Hash` e `currentMonth` |
| `src/lib/supabase/admin.ts` | Criar — cliente com service role key |
| `src/app/api/upload/route.ts` | Criar — POST handler |
| `src/components/upload/dropzone.tsx` | Criar |
| `src/components/upload/document-list.tsx` | Criar |
| `src/app/(auth)/upload/page.tsx` | Modificar — substituir placeholder |
