import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Field, Input } from "builder-kit/ui";

import { Icon } from "./Icons";

const DRAFT_KEY = "helix:new-experiment-draft";

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") ?? { name: "", description: "" };
  } catch {
    return { name: "", description: "" };
  }
}

/** UI: surface-2 / radius-2xl / shadow-popover / body / caption / danger */
export function NewExperimentDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const submitSeq = useRef(0);

  useEffect(() => {
    submitSeq.current += 1;
    if (!open) return;
    const draft = readDraft();
    setName(draft.name ?? "");
    setDescription(draft.description ?? "");
    setState("idle");
    setError("");
  }, [open]);

  useEffect(() => {
    try {
      if (name || description) localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, description }));
    } catch {
      // storage unavailable: the form still works
    }
  }, [name, description]);

  const submit = async () => {
    if (state === "loading") return;
    if (!name.trim()) {
      setError("Give the experiment a name so the team can find it later.");
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    const seq = ++submitSeq.current;
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    if (seq !== submitSeq.current) return;
    // Deterministic demo failure path: type "fail" to exercise the error state.
    if (/fail/i.test(name)) {
      setState("error");
      setError("The experiment service rejected this name. Rename it and retry.");
      return;
    }
    setState("success");
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    onCreated(name.trim());
    window.setTimeout(() => onOpenChange(false), 450);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New experiment"
      description="Create a workspace for a model, prompt or retrieval change. You can add runs after it exists."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={state === "loading"}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={state === "loading" || state === "success"}>
            {state === "loading" ? "Creating…" : state === "success" ? "Created" : state === "error" ? "Retry" : "Create experiment"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" htmlFor="experiment-name" hint="Use a name people can scan in a list." error={state === "error" ? error : undefined}>
          <Input
            id="experiment-name"
            value={name}
            invalid={state === "error"}
            disabled={state === "loading" || state === "success"}
            onChange={(e) => {
              setName(e.target.value);
              if (state === "error") setState("idle");
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="e.g. Hybrid rerank · v3"
            autoComplete="off"
          />
        </Field>

        <Field label="Description" htmlFor="experiment-description" hint="Optional. What question is this experiment answering?">
          <textarea
            id="experiment-description"
            value={description}
            disabled={state === "loading" || state === "success"}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-default bg-surface-3 px-3 py-2 text-body text-primary outline-none transition-[box-shadow,border-color] duration-fast ease-out placeholder:text-tertiary focus-visible:border-transparent focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-45"
            placeholder="Does reranking improve multi-hop retrieval without hurting latency?"
          />
        </Field>

        <div className="flex items-center gap-2 rounded-lg bg-surface-3 px-3 py-2 text-caption text-tertiary" aria-live="polite">
          {state === "loading" && <span className="size-2 animate-pulse rounded-pill bg-accent" aria-hidden="true" />}
          {state === "success" && <Icon name="check" size={14} className="text-success" />}
          {state === "error" && <Icon name="alert" size={14} className="text-danger" />}
          <span>
            {state === "loading"
              ? "Creating the experiment and reserving its first run slot…"
              : state === "success"
                ? "Experiment created. Opening the workspace…"
                : state === "error"
                  ? "Nothing was lost. Fix the name and retry."
                  : "Drafts are saved locally; a refresh will not lose your text."}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
