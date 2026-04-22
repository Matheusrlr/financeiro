# Plano: Substituir LLM por Parsers Regex para PDFs

## Contexto

O processamento de PDFs depende de um LLM local (Ollama) que falha frequentemente, travando todo o fluxo de upload. A solucao e substituir o LLM por **parsers deterministicos com regex** para Inter e Nubank, e categorizar transacoes por **keywords**. O dashboard e transacoes ja funcionam -- so precisam de dados reais no banco.

## Arquivos a Criar

### 1. `src/lib/parsers/types.ts`
Tipos compartilhados:
```ts
type Category = "necessario" | "superfluo" | "investimento"
interface ParsedTransaction {
  date: string       // "YYYY-MM-DD"
  description: string
  amount: number     // positivo = despesa
  category: Category
  cardSuffix?: string // ultimos 4 digitos
}
interface ParseResult {
  bank: "inter" | "nubank"
  referenceMonth: string // "YYYY-MM"
  transactions: ParsedTransaction[]
}
```

### 2. `src/lib/parsers/categorize.ts`
Mapa de keywords -> categoria:
- **superfluo**: IFOOD, IFD*, UBER, RAPPI, YOUTUBE, APPLE, DISCORD, SPOTIFY, NETFLIX, AMAZON, AIRBNB, RESTAURANTE, HAMBURGUERIA, CHURRASC, BURGUER, PADOCA, DECATHLON, LOTERIA, LINKEDIN, GYMPASS, WELLHUB, PAYPAL, NUVIAGENS
- **necessario**: SUPERMERCADO, COMERCIAL, FARMACIA, ARAUJO, POSTO, SEGURO, MAPFRE, PRUDENTIAL, FIBER, VIVOEASY, VIACAOPASSARO, EXPRESSO, DISTRIBUIDOR
- **default**: "necessario"

### 3. `src/lib/parsers/inter.ts`
Parser para faturas Inter. Padroes identificados no PDF real:
- **Secoes por cartao**: `CARTAO XXXX****XXXX`
- **Linha de transacao**: `DD de MMM. YYYY    DESCRICAO    -    R$ XX,XX`
- **Regex**: `/(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.\s+(\d{4})\s+(.+?)\s+-\s+(\+?\s*R\$\s*[\d.,]+)/gi`
- **Mes referencia**: extrair de `Vencimento` -> `DD/MM/YYYY` -> `YYYY-MM`
- **Ignorar**: linhas com "PAGAMENTO ON LINE" (creditos), secao "Proxima fatura", valores com `+`

### 4. `src/lib/parsers/nubank.ts`
Parser para faturas Nubank. Padroes identificados:
- **Transacoes**: `DD MMM    **** XXXX    Descricao    R$ XX,XX`
- **Regex**: `/(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:.*?(\d{4})\s+)?(.+?)\s+([\u2212\-]?\s*R\$\s*[\d.,]+)/gi`
- **Mes referencia**: `FATURA DD MMM YYYY` -> `YYYY-MM`
- **Inferir ano**: transacoes sao DD MMM sem ano. Usar ano da fatura; se mes da transacao > mes da fatura, ano anterior
- **Ignorar**: secao "Pagamentos", linhas "IOF de", "Ajuste a credito", valores negativos (U+2212)
- **Importante**: Nubank usa `\u2212` (MINUS SIGN) nao `-` (HYPHEN) para creditos

### 5. `src/lib/parsers/index.ts`
Orquestrador:
- `detectBank(text)`: "inter" se contem "CARTAO" + "****" + padrao Inter; "nubank" se contem "nubank"/"Nu "/"••••"
- `parseDocument(text, options?)`: detecta banco, chama parser, aplica categorize, retorna ParseResult

## Arquivos a Modificar

### 6. `src/app/api/process/[id]/route.ts`
- **Remover**: imports de `extractTransactionsFromPdf`, `categorizeTransactions` (linhas 7)
- **Adicionar**: import de `parseDocument` de `@/lib/parsers`
- **Substituir linhas 78-123** (LLM extraction + categorization + row building) por:
  ```ts
  const parseResult = parseDocument(pdfText)
  const refMonth = doc.referenceMonth !== currentMonth() ? doc.referenceMonth : parseResult.referenceMonth
  const rows = parseResult.transactions.map(t => ({
    userId: user.id, documentId: id,
    cardId: (doc.metadata as any)?.cardId ?? null,
    referenceMonth: refMonth,
    txnDate: t.date, description: t.description,
    amount: String(t.amount), category: t.category,
  }))
  ```
- Atualizar update do document com `referenceMonth: refMonth`

### 7. `src/app/api/upload/route.ts`
- Ler `cardId` e `referenceMonth` do formData (linhas ~17-18)
- Salvar `referenceMonth` fornecido (se valido YYYY-MM) ao inves de `currentMonth()`
- Guardar `cardId` no campo `metadata` (JSONB): `{ cardId: "uuid" }`
- **Sem migracao de banco** -- metadata ja existe no schema

### 8. `src/app/(auth)/upload/page.tsx`
- Consultar cards do usuario (mesmo padrao do dashboard)
- Passar `cards` para `<UploadSection>`

### 9. `src/components/upload/upload-section.tsx`
- Aceitar prop `cards` e repassar para `<Dropzone>`

### 10. `src/components/upload/dropzone.tsx`
- Receber prop `cards: { id, name, bankCode }[]`
- Apos selecao do arquivo, mostrar:
  - **Select de cartao**: lista de cartoes do usuario + opcao "Auto-detectar"
  - **Input de mes**: `<input type="month">` com default do mes atual
- Auto-detect: se filename contem "inter"/"nubank", pre-selecionar cartao correspondente
- Incluir `cardId` e `referenceMonth` no FormData

## O Que NAO Muda
- `src/lib/ai/` -- manter intacto (generateConsulting ainda pode ser usado depois)
- Dashboard e Transactions pages -- ja leem da tabela transactions normalmente
- DB schema -- sem migracoes necessarias

## Sequencia de Implementacao
1. Criar `src/lib/parsers/` (types, categorize, inter, nubank, index) -- 5 arquivos novos
2. Modificar `src/app/api/process/[id]/route.ts` -- trocar LLM por parser
3. Modificar `src/app/api/upload/route.ts` -- aceitar cardId + referenceMonth
4. Modificar upload page + components -- adicionar selecao de cartao/mes

## Verificacao
1. Subir o dev server (`npm run dev`)
2. Criar cartoes Inter e Nubank na tela de dashboard (se nao existirem)
3. Fazer upload dos PDFs em `pdfs/` selecionando cartao e mes
4. Verificar que documentos passam de "Processando" para "Concluido"
5. Checar pagina de transacoes -- deve mostrar todas as transacoes extraidas com categorias
6. Checar dashboard -- graficos e metricas devem refletir os dados reais
