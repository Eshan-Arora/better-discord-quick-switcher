export const styles = `
/* The UI is intentionally self-contained so Discord class-name changes do not affect it. */
.bqs-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: min(15vh, 132px);
  background: rgb(0 0 0 / 0.46);
  backdrop-filter: blur(2px);
}

.bqs-dialog {
  width: min(680px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid var(--border-subtle, rgb(255 255 255 / 0.1));
  border-radius: 12px;
  background: var(--background-base-lowest, #111214);
  color: var(--text-normal, #f2f3f5);
  box-shadow: 0 22px 70px rgb(0 0 0 / 0.48);
}

.bqs-search-wrap {
  padding: 12px;
  border-bottom: 1px solid var(--border-subtle, rgb(255 255 255 / 0.08));
}

.bqs-search {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 8px;
  outline: none;
  padding: 0 13px;
  background: var(--input-background, #1e1f22);
  color: var(--text-normal, #f2f3f5);
  font: 500 16px/1.2 var(--font-primary, system-ui, sans-serif);
}

.bqs-search::placeholder { color: var(--text-muted, #949ba4); }

.bqs-list {
  max-height: min(57vh, 520px);
  overflow-y: auto;
  padding: 7px;
}

.bqs-result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 14px;
  min-height: 50px;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: default;
}

.bqs-result[aria-selected="true"] { background: var(--background-modifier-selected, #404249); }
.bqs-result:hover { background: var(--background-modifier-hover, #35373c); }

.bqs-name {
  overflow: hidden;
  color: var(--header-primary, #f2f3f5);
  font: 550 15px/20px var(--font-primary, system-ui, sans-serif);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bqs-meta {
  grid-column: 1;
  overflow: hidden;
  color: var(--text-muted, #949ba4);
  font: 400 12px/16px var(--font-primary, system-ui, sans-serif);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bqs-badges {
  grid-column: 2;
  grid-row: 1 / span 2;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted, #949ba4);
  font: 500 12px/16px var(--font-primary, system-ui, sans-serif);
}

.bqs-mention {
  min-width: 16px;
  box-sizing: border-box;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--status-danger, #da373c);
  color: white;
  text-align: center;
}

.bqs-empty {
  padding: 38px 16px;
  color: var(--text-muted, #949ba4);
  text-align: center;
  font: 400 14px/20px var(--font-primary, system-ui, sans-serif);
}

.bqs-footer {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--border-subtle, rgb(255 255 255 / 0.08));
  color: var(--text-muted, #949ba4);
  font: 400 11px/16px var(--font-primary, system-ui, sans-serif);
}
`;
