# 1.4 — Upload de PDF com Supabase Storage — Especificação

**Complexidade:** Large
**Auto-sizing decision:** Multi-componente com UI de drag & drop, hash SHA-256 no browser, upload para Supabase Storage, API route de processamento, criação de registro `documents`, dedup por hash, e progress indicator. Requer design + tasks antes de executar.

## Problem Statement

A página `/upload` existe como placeholder vazio. O usuário precisa enviar faturas de cartão de crédito em PDF para o sistema processar (extração de transações via IA — feature 1.5). O fluxo envolve: selecionar/arrastar o arquivo, calcular hash para dedup, fazer upload para Supabase Storage, criar registro na tabela `documents`, e mostrar progresso. Sem isso, toda a pipeline de IA e dashboard fica bloqueada.

## Goals

- [ ] Usuário pode selecionar PDF via drag & drop ou clique
- [ ] Arquivo é armazenado no Supabase Storage bucket `documents` (path: `{user_id}/{file_hash}.pdf`)
- [ ] Registro criado em `documents` com status `processing`
- [ ] Duplicatas detectadas por SHA-256 hash (mesmo arquivo → bloqueado com mensagem)
- [ ] Progress indicator durante upload
- [ ] Apenas PDFs aceitos (validação de tipo MIME + extensão)
- [ ] Tamanho máximo: 10MB

## Out of Scope

| Feature | Reason |
|---------|--------|
| Extração de transações via IA | Feature 1.5 — processamento assíncrono posterior |
| Detecção automática de banco (banco, mês) | Feature 1.5 — requer Claude |
| Múltiplos uploads simultâneos | Complexidade desnecessária para MVP |
| Preview do PDF no browser | Não agrega valor para o fluxo |
| Progresso granular (bytes uploaded) | `fetch` nativo não expõe isso facilmente; spinner é suficiente |

---

## User Stories

### P1: Selecionar e validar PDF ⭐ MVP

**User Story:** Como usuário, quero selecionar um arquivo PDF da minha fatura de cartão (via clique ou drag & drop) para enviá-lo ao sistema.

**Why P1:** Ponto de entrada de toda a pipeline. Sem upload não há dados.

**Acceptance Criteria:**

1. WHEN usuário arrasta PDF sobre a área de drop THEN sistema SHALL destacar visualmente a área (borda colorida)
2. WHEN usuário solta o arquivo THEN sistema SHALL validar: tipo MIME `application/pdf` e extensão `.pdf`
3. WHEN arquivo é válido THEN sistema SHALL exibir nome do arquivo e tamanho (ex: "fatura-nubank.pdf — 2.3 MB")
4. WHEN arquivo não é PDF THEN sistema SHALL mostrar erro "Apenas arquivos PDF são aceitos" sem iniciar upload
5. WHEN arquivo excede 10MB THEN sistema SHALL mostrar erro "Arquivo muito grande (máx 10MB)"
6. WHEN usuário clica na área THEN sistema SHALL abrir file picker nativo filtrado por `.pdf`

**Independent Test:** Arrastar um PDF → ver preview do nome. Arrastar um JPG → ver mensagem de erro.

---

### P1: Hash SHA-256 e deduplicação ⭐ MVP

**User Story:** Como usuário, quero que o sistema detecte se já enviei esta fatura antes para evitar processar duplicatas.

**Why P1:** Sem dedup, o usuário pode processar a mesma fatura duas vezes gerando transações duplicadas no banco.

**Acceptance Criteria:**

1. WHEN arquivo é selecionado e válido THEN sistema SHALL calcular hash SHA-256 do conteúdo do arquivo (no browser, antes do upload)
2. WHEN hash é calculado THEN sistema SHALL consultar `POST /api/upload` que verifica se existe `documents` com `file_hash = hash` e `user_id = uid`
3. WHEN duplicata é detectada THEN sistema SHALL exibir mensagem "Esta fatura já foi enviada anteriormente" e bloquear upload
4. WHEN hash é único THEN sistema SHALL prosseguir com upload

**Independent Test:** Fazer upload de uma fatura → depois tentar fazer upload do mesmo arquivo → ver mensagem de duplicata.

---

### P1: Upload para Supabase Storage ⭐ MVP

**User Story:** Como usuário, quero que minha fatura seja armazenada com segurança no servidor para que a IA possa processá-la.

**Why P1:** O arquivo precisa estar no Storage para que o processamento assíncrono da IA (feature 1.5) possa acessá-lo.

**Acceptance Criteria:**

1. WHEN upload inicia THEN sistema SHALL mostrar spinner/progress indicator e desabilitar botão de submit
2. WHEN arquivo é enviado para `POST /api/upload` THEN API SHALL fazer upload para Supabase Storage no path `{user_id}/{file_hash}.pdf` usando `SUPABASE_SERVICE_ROLE_KEY`
3. WHEN upload no Storage é bem-sucedido THEN API SHALL criar registro em `documents` com: `userId`, `type: 'credit_card_statement'`, `fileName`, `storagePath`, `fileHash`, `referenceMonth: 'YYYY-MM'` (placeholder até IA detectar), `status: 'processing'`
4. WHEN tudo ocorre sem erros THEN API SHALL retornar `{ documentId, status: 'processing' }` e UI SHALL mostrar toast "Fatura enviada! Processamento iniciado."
5. WHEN upload no Storage falha THEN API SHALL retornar erro 500 e UI SHALL mostrar toast "Erro ao enviar fatura. Tente novamente."

**Independent Test:** Selecionar PDF válido → clicar "Enviar" → ver spinner → ver toast de sucesso → verificar arquivo no Supabase Storage e registro em `documents`.

---

### P2: Lista de documentos enviados

**User Story:** Como usuário, quero ver os documentos que já enviei e o status de processamento de cada um.

**Why P2:** Importante para acompanhar o pipeline, mas o upload em si já é demonstrável sem a lista.

**Acceptance Criteria:**

1. WHEN upload é concluído THEN lista na página `/upload` SHALL atualizar com novo documento (nome, data, status)
2. WHEN documento tem `status: 'processing'` THEN badge SHALL mostrar "Processando..." em amarelo
3. WHEN documento tem `status: 'completed'` THEN badge SHALL mostrar "Concluído" em verde
4. WHEN documento tem `status: 'error'` THEN badge SHALL mostrar "Erro" em vermelho

**Independent Test:** Enviar fatura → ver ela na lista com status "Processando...".

---

## Edge Cases

- WHEN arquivo PDF está corrompido (cabeçalho inválido) THEN validação de MIME no server SHALL rejeitar com 400 antes de fazer upload
- WHEN usuário recarrega a página durante upload THEN upload é cancelado — o arquivo não deve ficar em estado parcial no Storage (usar transação: Storage upload primeiro, só criar registro `documents` se upload OK)
- WHEN dois usuários enviam o mesmo PDF THEN hashes são iguais mas `user_id` diferentes — ambos são aceitos (unique index é `file_hash + user_id`)
- WHEN Storage retorna erro de quota/permissions THEN API deve logar erro completo e retornar mensagem genérica ao cliente (não expor detalhes internos)

---

## API Design

```
POST /api/upload
  Body: FormData { file: File }
  Headers: Cookie (session Supabase)

  Flow:
  1. Extrair user da session (createClient server)
  2. Validar: tipo MIME = application/pdf, tamanho ≤ 10MB
  3. Calcular SHA-256 do buffer
  4. Checar duplicata: SELECT FROM documents WHERE file_hash = ? AND user_id = ?
  5. Se duplicata: return 409 { error: 'duplicate', documentId: existingId }
  6. Upload Storage: supabase.storage.from('documents').upload(`${userId}/${hash}.pdf`, buffer)
  7. INSERT INTO documents { userId, type, fileName, storagePath, fileHash, referenceMonth, status: 'processing' }
  8. Return 201 { documentId, status: 'processing' }
```

**Auth:** Service role key para o Storage upload (anon key tem permissões mais restritas). User extraído da session cookie — nunca do body.

**referenceMonth:** Por enquanto usar mês atual `YYYY-MM` como placeholder. Feature 1.5 (IA) vai atualizar com o mês real detectado do PDF.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/app/api/upload/route.ts` | Criar — POST handler |
| `src/app/(auth)/upload/page.tsx` | Modificar — implementar UI real |
| `src/components/upload/dropzone.tsx` | Criar — drag & drop component |
| `src/components/upload/document-list.tsx` | Criar — lista de documentos enviados |
| `src/lib/supabase/server.ts` | Verificar — garantir suporte a service role |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| UPLOAD-01 | P1: Drag & drop com highlight visual | Design | Pending |
| UPLOAD-02 | P1: Validação de tipo MIME e extensão | Design | Pending |
| UPLOAD-03 | P1: Validação de tamanho (≤ 10MB) | Design | Pending |
| UPLOAD-04 | P1: Hash SHA-256 no browser | Design | Pending |
| UPLOAD-05 | P1: Dedup check antes do upload | Design | Pending |
| UPLOAD-06 | P1: Upload para Supabase Storage via API | Design | Pending |
| UPLOAD-07 | P1: Criar registro `documents` com status 'processing' | Design | Pending |
| UPLOAD-08 | P1: Progress indicator durante upload | Design | Pending |
| UPLOAD-09 | P1: Toast de sucesso/erro | Design | Pending |
| UPLOAD-10 | P1: Upload no Storage antes de INSERT (atomicidade) | Design | Pending |
| UPLOAD-11 | P2: Lista de documentos com status badge | Design | Pending |

**Coverage:** 11 total, 0 mapeados em tasks ⚠️

---

## Success Criteria

- [ ] Upload de PDF de 5MB completa em < 10s em conexão normal
- [ ] Segundo upload do mesmo arquivo mostra "já enviada" sem criar registro duplicado
- [ ] Arquivo aparece no Supabase Storage no path correto após upload
- [ ] Registro em `documents` tem todos os campos obrigatórios preenchidos
- [ ] Arquivo inválido (não-PDF) é rejeitado antes de qualquer chamada ao servidor
