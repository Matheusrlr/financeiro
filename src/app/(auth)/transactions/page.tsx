import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transacoes</h2>
        <p className="text-muted-foreground">
          Todas as transacoes extraidas das suas faturas e extratos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacoes do mes</CardTitle>
          <CardDescription>
            Filtre por categoria, cartao ou busque por descricao.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Nenhuma transacao encontrada. Faca upload de uma fatura primeiro.
        </CardContent>
      </Card>
    </div>
  );
}
