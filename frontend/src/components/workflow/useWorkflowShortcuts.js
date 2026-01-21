import { useEffect } from 'react';

function isEditableTarget(target) {
  if (!target) return false;
  const el = target;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useWorkflowShortcuts({
  enabled = true,
  onSave,
  onUndo,
  onRedo,
  onToggleLibrary,
  onDeleteSelection,
  onDuplicate,
  onFind,
}) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;

      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo?.();
        return;
      }

      if ((mod && e.shiftKey && e.key.toLowerCase() === 'z') || (!isMac && mod && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleLibrary?.();
        return;
      }

      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onFind?.();
        return;
      }

      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicate?.();
        return;
      }

      if (!mod && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        onDeleteSelection?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onSave, onUndo, onRedo, onToggleLibrary, onDeleteSelection, onDuplicate, onFind]);
}
