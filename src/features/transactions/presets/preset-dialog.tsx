"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPresetAction, updatePresetAction } from "./actions";
import { PresetForm, type PresetFormDefaults } from "./preset-form";

interface PresetDialogProps {
  mode: "create" | "edit";
  presetId?: string;
  defaultValues?: PresetFormDefaults;
  trigger: ReactNode;
}

export function PresetDialog({ mode, presetId, defaultValues, trigger }: PresetDialogProps) {
  const [open, setOpen] = useState(false);

  const action =
    mode === "edit" && presetId ? updatePresetAction.bind(null, presetId) : createPresetAction;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit preset" : "New preset"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update this reusable transaction template."
              : "Create a reusable template for a recurring transaction."}
          </DialogDescription>
        </DialogHeader>
        <PresetForm
          key={open ? "open" : "closed"}
          action={action}
          defaultValues={defaultValues}
          submitLabel={mode === "edit" ? "Save changes" : "Create preset"}
          pendingLabel={mode === "edit" ? "Saving…" : "Creating…"}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
