"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Braces, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { KNOWN_TEMPLATE_VARIABLES } from "@/constants/document-variables";

// Reference/copy panel only — documents are edited in Word, not in-browser,
// so there's no "insert into the document" action here, just {{key}} tags
// to copy while typing them in Word. See constants/document-variables.ts.
export function VariablePicker({ customKeys }: { customKeys: string[] }) {
  const [open, setOpen] = useState(false);

  function copy(key: string) {
    navigator.clipboard.writeText(`{{${key}}}`);
    toast.success(`Copied {{${key}}} to clipboard`);
    setOpen(false);
  }

  const groups = new Map<string, Array<{ key: string; label: string }>>();
  for (const variable of KNOWN_TEMPLATE_VARIABLES) {
    if (!groups.has(variable.group)) groups.set(variable.group, []);
    groups.get(variable.group)!.push(variable);
  }
  const uniqueCustomKeys = customKeys.filter(Boolean);
  if (uniqueCustomKeys.length > 0) {
    groups.set(
      "This Template's Fields",
      uniqueCustomKeys.map((key) => ({ key, label: key })),
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Braces className="size-4" />
        Browse Variables
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList>
            <CommandEmpty>No variables found.</CommandEmpty>
            {Array.from(groups.entries()).map(([group, items], idx) => (
              <div key={group}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={group}>
                  {items.map((item) => (
                    <CommandItem key={item.key} onSelect={() => copy(item.key)}>
                      <Copy className="opacity-60" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <code className="text-xs text-muted-foreground">{`{{${item.key}}}`}</code>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
