import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload</h2>
        <p className="text-muted-foreground">
          Envie faturas de cartao ou extratos de investimento em PDF.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Enviar documento</CardTitle>
          <CardDescription>
            Arraste um PDF ou clique para selecionar. A IA vai extrair e
            categorizar as transacoes automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground">
            Componente de upload sera implementado aqui.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
