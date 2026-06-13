export const REPLY_KEY_ATTR = 'data-active-reply-key';
export const REPLY_SLOT_ATTR = 'data-reply-key';
export const REPLY_DRAFT_ATTR = 'data-reply-draft';
export const REPLY_COMPOSER_ATTR = 'data-reply-composer';
export const REPLY_OPEN_ATTR = 'data-reply-open';
export const REPLY_PREFILL_ATTR = 'data-reply-prefill';

const REPLY_TEXTAREA_SELECTOR = '[data-reply-composer] .gprv-review-composer-input';

const draftByReplyKey = new Map<string, string>();

function getReplySlot(modal: HTMLElement, replyKey: string): HTMLElement | null {
  return modal.querySelector<HTMLElement>(`[${REPLY_SLOT_ATTR}="${CSS.escape(replyKey)}"]`);
}

function getReplyComposer(slot: HTMLElement): HTMLElement | null {
  return slot.querySelector<HTMLElement>(`[${REPLY_COMPOSER_ATTR}]`);
}

function getReplyTextarea(slot: HTMLElement): HTMLTextAreaElement | null {
  return slot.querySelector<HTMLTextAreaElement>(REPLY_TEXTAREA_SELECTOR);
}

function readDraft(replyKey: string, slot: HTMLElement | null): string {
  const fromMap = draftByReplyKey.get(replyKey);
  if (fromMap != null) {
    return fromMap;
  }

  return slot?.getAttribute(REPLY_DRAFT_ATTR) ?? '';
}

function writeDraft(replyKey: string, slot: HTMLElement | null, value: string): void {
  if (value.length > 0) {
    draftByReplyKey.set(replyKey, value);
    slot?.setAttribute(REPLY_DRAFT_ATTR, value);
    return;
  }

  draftByReplyKey.delete(replyKey);
  slot?.removeAttribute(REPLY_DRAFT_ATTR);
}

function isComposerOpen(composer: HTMLElement): boolean {
  return !composer.hidden;
}

export function getActiveReplyKey(modal: HTMLElement | null): string | null {
  return modal?.getAttribute(REPLY_KEY_ATTR) ?? null;
}

export function bindReplySession(modal: HTMLElement): () => void {
  const handleInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (!target.matches(REPLY_TEXTAREA_SELECTOR)) {
      return;
    }

    const slot = target.closest<HTMLElement>(`[${REPLY_SLOT_ATTR}]`);
    if (!slot || !modal.contains(slot)) {
      return;
    }

    const replyKey = slot.getAttribute(REPLY_SLOT_ATTR);
    if (!replyKey) {
      return;
    }

    writeDraft(replyKey, slot, target.value);
  };

  modal.addEventListener('input', handleInput);
  return () => {
    modal.removeEventListener('input', handleInput);
  };
}

export function openReplySession(modal: HTMLElement, replyKey: string): void {
  const slot = getReplySlot(modal, replyKey);
  const composer = slot ? getReplyComposer(slot) : null;
  const textarea = slot ? getReplyTextarea(slot) : null;

  if (!composer || !textarea || !slot) {
    return;
  }

  const wasHidden = !isComposerOpen(composer);
  composer.hidden = false;
  slot.setAttribute(REPLY_OPEN_ATTR, '');

  if (wasHidden) {
    const draft = readDraft(replyKey, slot);
    textarea.value = draft.length > 0 ? draft : (slot.getAttribute(REPLY_PREFILL_ATTR) ?? '');
  }

  modal.setAttribute(REPLY_KEY_ATTR, replyKey);
  textarea.focus({ preventScroll: true });
}

export function closeReplyComposer(
  modal: HTMLElement,
  replyKey: string,
  options?: { clearDraft?: boolean },
): void {
  const slot = getReplySlot(modal, replyKey);
  const composer = slot ? getReplyComposer(slot) : null;
  const textarea = slot ? getReplyTextarea(slot) : null;

  if (!composer || !slot) {
    return;
  }

  if (options?.clearDraft) {
    clearReplyDraft(modal, replyKey);
  } else if (textarea) {
    writeDraft(replyKey, slot, textarea.value);
  }

  composer.hidden = true;
  slot.removeAttribute(REPLY_OPEN_ATTR);

  if (modal.getAttribute(REPLY_KEY_ATTR) === replyKey) {
    modal.removeAttribute(REPLY_KEY_ATTR);
  }
}

export function closeAllReplyComposers(modal: HTMLElement): void {
  for (const slot of modal.querySelectorAll<HTMLElement>(`[${REPLY_SLOT_ATTR}]`)) {
    const replyKey = slot.getAttribute(REPLY_SLOT_ATTR);
    const composer = getReplyComposer(slot);
    if (!replyKey || !composer || !isComposerOpen(composer)) {
      continue;
    }

    const textarea = getReplyTextarea(slot);
    if (textarea) {
      writeDraft(replyKey, slot, textarea.value);
    }

    composer.hidden = true;
    slot.removeAttribute(REPLY_OPEN_ATTR);
  }

  modal.removeAttribute(REPLY_KEY_ATTR);
}

export function clearReplyDraft(modal: HTMLElement, replyKey: string): void {
  const slot = getReplySlot(modal, replyKey);
  const textarea = slot ? getReplyTextarea(slot) : null;

  writeDraft(replyKey, slot, '');

  if (textarea) {
    textarea.value = '';
  }
}
