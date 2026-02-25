export const moveCursorToEnd = (el: HTMLElement): void => {
    el.focus({ preventScroll: true });

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const end = el.value.length;
        el.setSelectionRange(end, end);
        return;
    }

    if (!el.isContentEditable) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
};
