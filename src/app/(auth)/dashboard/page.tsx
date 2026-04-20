import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visao geral das suas financas pessoais.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto total</CardDescription>
            <CardTitle className="text-2xl">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Nenhum dado ainda. Faca upload de uma fatura.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Necessario</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              R$ 0,00
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Despesas essenciais
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Superfluo</CardDescription>
            <CardTitle className="text-2xl text-amber-600">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Gastos nao essenciais
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Investimento</CardDescription>
            <CardTitle className="text-2xl text-blue-600">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aportes do mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolucao mensal</CardTitle>
            <CardDescription>Gastos totais mes a mes</CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            Graficos serao exibidos quando houver dados.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por categoria</CardTitle>
            <CardDescription>
              Necessario vs superfluo vs investimento
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            Graficos serao exibidos quando houver dados.
          </CardContent>
        </Card>
      </div>

      {/* AI Insights placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Insights com IA</CardTitle>
          <CardDescription>
            Analise mensal gerada automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Faca upload de faturas para receber insights personalizados.
        </CardContent>
      </Card>
    </div>
  );
}
