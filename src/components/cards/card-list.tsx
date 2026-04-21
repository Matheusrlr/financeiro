"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CardForm } from "@/components/cards/card-form";
import { DeleteConfirmDialog } from "@/components/cards/delete-confirm-dialog";

interface CardItem {
  id: string;
  name: string;
  bankCode: string;
  color: string;
  createdAt: string;
}

interface CardListProps {
  cards: CardItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function CardList({ cards, loading, onRefresh }: CardListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardItem | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCard, setDeletingCard] = useState<CardItem | undefined>();

  function openCreate() {
    setEditingCard(undefined);
    setFormOpen(true);
  }

  function openEdit(card: CardItem) {
    setEditingCard(card);
    setFormOpen(true);
  }

  function openDelete(card: CardItem) {
    setDeletingCard(card);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingCard) return;
    const res = await fetch(`/api/cards/${deletingCard.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Erro ao remover cartão");
      throw new Error("delete failed");
    }
    toast.success("Cartão removido");
    onRefresh();
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}>Adicionar cartão</Button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-4">
          <p className="text-lg">Nenhum cartão cadastrado</p>
          <Button onClick={openCreate}>Adicionar cartão</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{card.name}</CardTitle>
                <Badge
                  style={{ backgroundColor: card.color, color: "#fff", borderColor: card.color }}
                >
                  {card.bankCode}
                </Badge>
              </CardHeader>
              <CardContent className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(card)}>
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => openDelete(card)}>
                  Remover
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CardForm
        open={formOpen}
        onOpenChange={setFormOpen}
        card={editingCard}
        onSuccess={onRefresh}
      />

      {deletingCard && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          cardName={deletingCard.name}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
