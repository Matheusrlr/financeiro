import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function InvestimentosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Investimentos</h2>
          <p className="text-muted-foreground">
            Acompanhe a evolução do seu patrimônio.
          </p>
        </div>
        <Select defaultValue="todos">
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="brasileiro">Brasileiro</SelectItem>
            <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa Selic</CardDescription>
            <CardTitle className="text-2xl">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Taxa básica de juros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ganhos / Perdas</CardDescription>
            <CardTitle className="text-2xl">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Resultado do período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Crescimento patrimonial</CardDescription>
            <CardTitle className="text-2xl">0,00 / 0%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Evolução acumulada</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart placeholders */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do patrimônio</CardTitle>
            <CardDescription>Patrimônio total ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-center text-muted-foreground text-sm">
            Faça upload de extratos de investimento para ver seus dados
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alocação de ativos</CardTitle>
            <CardDescription>Distribuição por tipo de ativo</CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-center text-muted-foreground text-sm">
            Faça upload de extratos de investimento para ver seus dados
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
