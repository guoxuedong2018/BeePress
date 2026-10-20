import { Button } from "beepress/ui";

import { ROUTES } from "../router";
import { Icon } from "./Icons";

const TITLES = {
  [ROUTES.overview]: ["Workspace", "Overview"],
  [ROUTES.experiments]: ["Workspace", "Experiments"],
  [ROUTES.reviews]: ["Workspace", "Review queue"],
  [ROUTES.uiSpec]: ["Workspace", "UI spec"],
};

/** UI: surface-1 / hairline-b / caption / ghost controls */
export function Topbar({ path, theme, onTheme, onCommand, onNew }) {
  const [section, title] = TITLES[path] ?? TITLES[ROUTES.overview];

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-subtle bg-surface-1 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 text-footnote">
        <span className="hidden text-tertiary sm:inline">{section}</span>
        <span className="hidden text-tertiary sm:inline" aria-hidden="true">
          /
        </span>
        <span className="truncate font-medium text-primary">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCommand}
          className="group flex h-8 items-center gap-2 rounded-lg border border-default bg-surface-2 px-2.5 text-footnote text-tertiary transition-colors duration-fast ease-out hover:border-strong hover:text-secondary"
          aria-label="Search commands"
        >
          <Icon name="search" size={15} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="tnum hidden h-5 items-center rounded-sm border border-subtle bg-surface-3 px-1.5 font-mono text-caption text-tertiary sm:flex">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="ghost"
          size="md"
          iconOnly
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={onTheme}
          className="text-tertiary"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </Button>

        <Button variant="primary" size="md" onClick={onNew}>
          <Icon name="plus" size={15} />
          <span className="hidden sm:inline">New experiment</span>
          <span className="sm:hidden">New</span>
        </Button>

        <button
          type="button"
          className="ml-1 flex size-8 items-center justify-center rounded-pill bg-surface-active text-footnote font-semibold text-secondary transition-colors duration-fast ease-out hover:bg-surface-hover"
          aria-label="Open account menu for Ada Chen"
        >
          AC
        </button>
      </div>
    </header>
  );
}
