"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: { id: string; name: string; bankCode: string; color: string };
  onSuccess: () => void;
}

export function CardForm({ open, onOpenChange, card, onSuccess }: CardFormProps) {
  const [name, setName] = useState(card?.name ?? "");
  const [bankCode, setBankCode] = useState(card?.bankCode ?? "");
  const [color, setColor] = useState(card?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);

  // Reset fields when dialog opens with new card prop
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(card?.name ?? "");
      setBankCode(card?.bankCode ?? "");
      setColor(card?.color ?? "#6366f1");
    }
    onOpenChange(isOpen);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = card ? `/api/cards/${card.id}` : "/api/cards";
      const method = card ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bankCode, color }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar cartão");
      }

      toast.success(card ? "Cartão atualizado" : "Cartão criado com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cartão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Nubank"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bankCode">Banco</Label>
            <Input
              id="bankCode"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              placeholder="nubank"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color">Cor</Label>
            <div className="flex items-center gap-2">
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-input bg-background p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6366f1"
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
