import { create } from "zustand";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Almost every real call site today is a delete/remove/revoke action, so
  // "destructive" is the default — pass "default" explicitly for a
  // non-destructive confirmation.
  variant?: "default" | "destructive";
};

type ConfirmState = {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  respond: (value: boolean) => void;
};

const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  options: null,
  resolve: null,
  respond: (value) => {
    set((state) => {
      state.resolve?.(value);
      return { isOpen: false, options: null, resolve: null };
    });
  },
}));

// The one-line drop-in replacement for `if (!confirm("...")) return;` —
// renders the app's own themed AlertDialog instead of an unstyled native
// browser prompt, via the single globally-mounted <ConfirmDialogHost/>
// (see components/shared/confirm-dialog-host.tsx). Usage:
//
//   async function handleDelete() {
//     if (!(await confirmAction({ title: "Delete this?" }))) return;
//     ...
//   }
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({ isOpen: true, options, resolve });
  });
}

export { useConfirmStore };
