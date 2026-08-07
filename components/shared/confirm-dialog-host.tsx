"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { useConfirmStore } from "@/store/confirm-store";

// The single globally-mounted target for every confirmAction() call in the
// app — mounted once each in AppShell and PlatformShell (mirrors how
// CommandPalette/PlatformCommandPalette are each mounted once per shell).
export function ConfirmDialogHost() {
  const isOpen = useConfirmStore((state) => state.isOpen);
  const options = useConfirmStore((state) => state.options);
  const respond = useConfirmStore((state) => state.respond);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && respond(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => respond(false)}>
            {options?.cancelLabel ?? "Cancel"}
          </Button>
          <Button variant={options?.variant === "default" ? "default" : "destructive"} onClick={() => respond(true)}>
            {options?.confirmLabel ?? "Confirm"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
