import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { getApiErrorMessage, type Course } from "../../lib/courses-api";
import type { Lesson, Module } from "../../lib/modules-api";

function Dialog({
  open,
  title,
  children,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = () => dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [];
    const first = focusable()[0];
    (first ?? dialog)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCancelRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialog?.focus(); return; }
      const firstItem = items[0]; const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        {children}
      </section>
    </div>
  );
}

function ErrorMessage({ error }: { error: unknown }) {
  return error ? <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(error)}</p> : null;
}

export function CourseEditorDialog({
  open,
  course,
  isSaving,
  error,
  onCancel,
  onSave,
}: {
  open: boolean;
  course: Course;
  isSaving: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (values: { title: string; description: string; isPublished: boolean }) => void;
}) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [isPublished, setIsPublished] = useState(course.isPublished);
  useEffect(() => { if (open) { setTitle(course.title); setDescription(course.description); setIsPublished(course.isPublished); } }, [open, course]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onSave({ title: title.trim(), description: description.trim(), isPublished }); };
  return <Dialog open={open} title="Edit Course" onCancel={onCancel}><form onSubmit={submit} className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="course-title">Title</Label><Input id="course-title" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={isSaving} /></div><div className="space-y-2"><Label htmlFor="course-description">Description</Label><Textarea id="course-description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSaving} /></div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} disabled={isSaving} /> Published</label><ErrorMessage error={error} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving || !title.trim()}>{isSaving ? "Saving..." : "Save Course"}</Button></div></form></Dialog>;
}

export function ModuleEditorDialog({
  open,
  module,
  isSaving,
  error,
  onCancel,
  onSave,
}: {
  open: boolean;
  module?: Module;
  isSaving: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (values: { title: string; order: number }) => void;
}) {
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("0");
  useEffect(() => { if (open) { setTitle(module?.title ?? ""); setOrder(String(module?.order ?? 0)); } }, [open, module]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onSave({ title: title.trim(), order: Number(order) || 0 }); };
  return <Dialog open={open} title={module ? "Edit Module" : "Add Module"} onCancel={onCancel}><form onSubmit={submit} className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="module-title">Title</Label><Input id="module-title" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={isSaving} /></div><div className="space-y-2"><Label htmlFor="module-order">Order</Label><Input id="module-order" type="number" value={order} onChange={(event) => setOrder(event.target.value)} disabled={isSaving} /></div><ErrorMessage error={error} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving || !title.trim()}>{isSaving ? "Saving..." : "Save Module"}</Button></div></form></Dialog>;
}

export function LessonEditorDialog({
  open,
  lesson,
  modules,
  isSaving,
  error,
  onCancel,
  onSave,
}: {
  open: boolean;
  lesson?: Lesson;
  modules: Module[];
  isSaving: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (values: { title: string; content: string; videoUrl: string | null; starterCodeUrl: string | null; order: number; moduleId?: string }) => void;
}) {
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [videoUrl, setVideoUrl] = useState(""); const [starterCodeUrl, setStarterCodeUrl] = useState(""); const [order, setOrder] = useState("0"); const [moduleId, setModuleId] = useState("");
  useEffect(() => { if (open) { setTitle(lesson?.title ?? ""); setContent(lesson?.content ?? ""); setVideoUrl(lesson?.videoUrl ?? ""); setStarterCodeUrl(lesson?.starterCodeUrl ?? ""); setOrder(String(lesson?.order ?? 0)); setModuleId(lesson?.moduleId ?? modules[0]?.id ?? ""); } }, [open, lesson]);
  useEffect(() => {
    if (open && !lesson && !moduleId && modules[0]) setModuleId(modules[0].id);
  }, [open, lesson, moduleId, modules]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onSave({ title: title.trim(), content, videoUrl: videoUrl.trim() || null, starterCodeUrl: starterCodeUrl.trim() || null, order: Number(order) || 0, ...(lesson ? { moduleId } : {}) }); };
  return <Dialog open={open} title={lesson ? "Edit Lesson" : "Add Lesson"} onCancel={onCancel}><form onSubmit={submit} className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="lesson-title">Title</Label><Input id="lesson-title" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={isSaving} /></div>{lesson && <div className="space-y-2"><Label htmlFor="lesson-module">Module</Label><select id="lesson-module" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={moduleId} onChange={(event) => setModuleId(event.target.value)} disabled={isSaving}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></div>}<div className="space-y-2"><Label htmlFor="lesson-content">Content</Label><Textarea id="lesson-content" value={content} onChange={(event) => setContent(event.target.value)} disabled={isSaving} /></div><div className="space-y-2"><Label htmlFor="lesson-video">Video URL</Label><Input id="lesson-video" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} disabled={isSaving} /></div><div className="space-y-2"><Label htmlFor="lesson-starter-code">Starter-code URL</Label><Input id="lesson-starter-code" type="url" value={starterCodeUrl} onChange={(event) => setStarterCodeUrl(event.target.value)} disabled={isSaving} /></div><div className="space-y-2"><Label htmlFor="lesson-order">Order</Label><Input id="lesson-order" type="number" value={order} onChange={(event) => setOrder(event.target.value)} disabled={isSaving} /></div><ErrorMessage error={error} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving || !title.trim()}>{isSaving ? "Saving..." : "Save Lesson"}</Button></div></form></Dialog>;
}

export function DeleteConfirmationDialog({ open, entityName, isDeleting, error, onCancel, onConfirm }: { open: boolean; entityName: string; isDeleting: boolean; error: unknown; onCancel: () => void; onConfirm: () => void; }) {
  return <Dialog open={open} title={`Delete ${entityName}`} onCancel={onCancel}><div className="mt-5 space-y-4"><p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{entityName}</strong>? This action cannot be undone.</p><ErrorMessage error={error} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={isDeleting}>Cancel</Button><Button type="button" variant="destructive" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</Button></div></div></Dialog>;
}
