/**
 * Tabcove — windowed list renderer.
 *
 * What keeps a 20,000-tab library feeling identical to a 20-tab one. Only the
 * visible rows plus a small overscan exist in the DOM; a single spacer element
 * gives the scrollbar the right height.
 *
 * The accessibility detail that most virtual lists get wrong, and this one does
 * not: `aria-setsize` and `aria-posinset` are set on every rendered row, so a
 * screen reader announces "item 412 of 1,284" correctly even though only ~30
 * rows exist. Without this, a virtualised list is unusable with assistive tech.
 */

export class VirtualList {
  /**
   * @param {Object} options
   *   - container   {HTMLElement} the scrolling element
   *   - rowHeight   {number} fixed row height in px
   *   - overscan    {number} rows rendered beyond the viewport
   *   - renderRow   {(item, index) => HTMLElement}
   *   - getKey      {(item, index) => string} for node reuse
   */
  constructor({ container, rowHeight = 36, overscan = 8, renderRow, getKey = null }) {
    this.container = container;
    this.rowHeight = rowHeight;
    this.overscan = overscan;
    this.renderRow = renderRow;
    this.getKey = getKey || ((_, i) => String(i));

    this.items = [];
    this.rendered = new Map(); // key -> HTMLElement
    this.frame = null;

    this.viewport = document.createElement('div');
    this.viewport.className = 'vlist__viewport';
    this.viewport.style.position = 'relative';

    this.container.appendChild(this.viewport);
    this.container.classList.add('vlist');

    this.onScroll = this.onScroll.bind(this);
    this.container.addEventListener('scroll', this.onScroll, { passive: true });

    // Re-render on resize: a wider window shows more rows.
    this.resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => this.schedule())
        : null;
    this.resizeObserver?.observe(this.container);
  }

  /** Replace the data set and re-render from the top of the current scroll. */
  setItems(items) {
    this.items = items || [];
    this.viewport.style.height = `${this.items.length * this.rowHeight}px`;
    this.clearRendered();
    this.render();
  }

  /** Change the row height (density switch) without rebuilding the data. */
  setRowHeight(height) {
    if (height === this.rowHeight) return;
    this.rowHeight = height;
    this.viewport.style.height = `${this.items.length * this.rowHeight}px`;
    this.clearRendered();
    this.render();
  }

  onScroll() {
    this.schedule();
  }

  /** Coalesce scroll events into one render per animation frame. */
  schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }

  render() {
    const total = this.items.length;
    if (!total) {
      this.clearRendered();
      return;
    }

    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight || 600;

    const first = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.overscan);
    const visible = Math.ceil(viewportHeight / this.rowHeight) + this.overscan * 2;
    const last = Math.min(total, first + visible);

    const wanted = new Set();

    for (let i = first; i < last; i++) {
      const item = this.items[i];
      const key = this.getKey(item, i);
      wanted.add(key);

      let node = this.rendered.get(key);
      if (!node) {
        node = this.renderRow(item, i);
        if (!node) continue;
        node.style.position = 'absolute';
        node.style.left = '0';
        node.style.right = '0';
        node.style.height = `${this.rowHeight}px`;
        this.viewport.appendChild(node);
        this.rendered.set(key, node);
      }

      node.style.transform = `translateY(${i * this.rowHeight}px)`;

      // The part that makes this usable with a screen reader.
      node.setAttribute('aria-setsize', String(total));
      node.setAttribute('aria-posinset', String(i + 1));
    }

    // Recycle anything that scrolled out of range.
    for (const [key, node] of this.rendered) {
      if (!wanted.has(key)) {
        node.remove();
        this.rendered.delete(key);
      }
    }
  }

  /** Scroll a specific index into view — used by keyboard navigation and search. */
  scrollToIndex(index, { block = 'nearest' } = {}) {
    const top = index * this.rowHeight;
    const viewTop = this.container.scrollTop;
    const viewBottom = viewTop + this.container.clientHeight;

    if (block === 'center') {
      this.container.scrollTop = top - this.container.clientHeight / 2 + this.rowHeight / 2;
    } else if (top < viewTop) {
      this.container.scrollTop = top;
    } else if (top + this.rowHeight > viewBottom) {
      this.container.scrollTop = top + this.rowHeight - this.container.clientHeight;
    }
    this.render();
  }

  clearRendered() {
    for (const node of this.rendered.values()) node.remove();
    this.rendered.clear();
  }

  destroy() {
    this.container.removeEventListener('scroll', this.onScroll);
    this.resizeObserver?.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.clearRendered();
    this.viewport.remove();
    this.container.classList.remove('vlist');
  }
}
