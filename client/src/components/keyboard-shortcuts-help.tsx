import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Shortcut = {
  keys: string[];
  label: string;
  testId: string;
};

const SEARCH_AND_COMMAND: Shortcut[] = [
  { keys: ["⌘", "K"], label: "Open search", testId: "kbd-shortcut-cmd-k" },
  { keys: ["/"], label: "Open search", testId: "kbd-shortcut-slash" },
  { keys: ["?"], label: "Show this help", testId: "kbd-shortcut-question" },
  { keys: ["⌘", "?"], label: "Show this help (works while typing)", testId: "kbd-shortcut-cmd-question" },
  { keys: ["Left ⌘", "+", "Right ⌘"], label: "Open command center", testId: "kbd-shortcut-dual-cmd" },
  { keys: ["⌘", "⇧", "B"], label: "Open Lens", testId: "kbd-shortcut-lens" },
  { keys: ["⌘", "B"], label: "Toggle sidebar", testId: "kbd-shortcut-sidebar" },
];

const GOTO_SHORTCUTS: Shortcut[] = [
  { keys: ["g", "h"], label: "Home", testId: "kbd-shortcut-g-h" },
  { keys: ["g", "w"], label: "Wiki", testId: "kbd-shortcut-g-w" },
  { keys: ["g", "m"], label: "Music", testId: "kbd-shortcut-g-m" },
  { keys: ["g", "p"], label: "Projects", testId: "kbd-shortcut-g-p" },
  { keys: ["g", "v"], label: "Services", testId: "kbd-shortcut-g-v" },
  { keys: ["g", "j"], label: "Jobs", testId: "kbd-shortcut-g-j" },
  { keys: ["g", "r"], label: "Rewards", testId: "kbd-shortcut-g-r" },
  { keys: ["g", "f"], label: "Feed", testId: "kbd-shortcut-g-f" },
  { keys: ["g", "c"], label: "Command center", testId: "kbd-shortcut-g-c" },
  { keys: ["g", "s"], label: "Store (shop.sevco.us)", testId: "kbd-shortcut-g-s" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded border border-border bg-muted text-[11px] font-mono text-foreground">
      {children}
    </kbd>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5" data-testid={shortcut.testId}>
      <span className="text-sm text-foreground">{shortcut.label}</span>
      <span className="flex items-center gap-1">
        {shortcut.keys.map((k, i) =>
          k === "+" ? (
            <span key={i} className="text-xs text-muted-foreground">+</span>
          ) : (
            <Kbd key={i}>{k}</Kbd>
          )
        )}
      </span>
    </div>
  );
}

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-keyboard-shortcuts">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> any time to open this dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Search & Command
            </h3>
            <div className="divide-y divide-border">
              {SEARCH_AND_COMMAND.map((s) => (
                <ShortcutRow key={s.testId} shortcut={s} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Go to (press <Kbd>g</Kbd> then…)
            </h3>
            <div className="divide-y divide-border">
              {GOTO_SHORTCUTS.map((s) => (
                <ShortcutRow key={s.testId} shortcut={s} />
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
