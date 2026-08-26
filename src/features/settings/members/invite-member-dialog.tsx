"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InviteMemberForm } from "./invite-member-form";

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            They&apos;ll join this organization with the selected role the next time they sign up
            or sign in with this email.
          </DialogDescription>
        </DialogHeader>
        <InviteMemberForm key={open ? "open" : "closed"} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
