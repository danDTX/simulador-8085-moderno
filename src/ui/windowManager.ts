export interface WindowOptions {
  id: string;
  title: string;
  icon?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  content: HTMLElement;
  isClosable?: boolean;
  isMinimizable?: boolean;
  isMaximizable?: boolean;
  onClose?: () => void;
}

export class MDIWindowManager {
  private container: HTMLElement;
  private taskbarContainer: HTMLElement;
  private windows: Map<string, {
    elem: HTMLElement;
    taskbarBtn: HTMLElement;
    opts: WindowOptions;
    isMinimized: boolean;
    isMaximized: boolean;
    prevRect?: { x: number; y: number; w: number; h: number };
  }> = new Map();

  private topZIndex = 100;

  constructor(container: HTMLElement, taskbarContainer: HTMLElement) {
    this.container = container;
    this.taskbarContainer = taskbarContainer;
  }

  public createWindow(opts: WindowOptions): HTMLElement {
    if (this.windows.has(opts.id)) {
      this.bringToFront(opts.id);
      this.restoreWindow(opts.id);
      return this.windows.get(opts.id)!.elem;
    }

    const win = document.createElement('div');
    win.className = 'mdi-window';
    win.id = `mdi-win-${opts.id}`;

    const initialX = opts.x ?? (50 + (this.windows.size * 25) % 200);
    const initialY = opts.y ?? (50 + (this.windows.size * 25) % 150);
    const initialW = opts.width ?? 420;
    const initialH = opts.height ?? 320;

    win.style.left = `${initialX}px`;
    win.style.top = `${initialY}px`;
    win.style.width = `${initialW}px`;
    win.style.height = `${initialH}px`;
    win.style.zIndex = `${++this.topZIndex}`;

    // Header
    const header = document.createElement('div');
    header.className = 'mdi-header';

    const titleBox = document.createElement('div');
    titleBox.className = 'mdi-title-box';
    if (opts.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'mdi-icon';
      iconSpan.innerHTML = opts.icon;
      titleBox.appendChild(iconSpan);
    }
    const titleSpan = document.createElement('span');
    titleSpan.className = 'mdi-title';
    titleSpan.textContent = opts.title;
    titleBox.appendChild(titleSpan);
    header.appendChild(titleBox);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'mdi-controls';

    if (opts.isMinimizable !== false) {
      const minBtn = document.createElement('button');
      minBtn.className = 'mdi-btn mdi-btn-min';
      minBtn.innerHTML = '&#8722;'; // Minus
      minBtn.title = 'Minimizar';
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.minimizeWindow(opts.id);
      });
      controls.appendChild(minBtn);
    }

    if (opts.isMaximizable !== false) {
      const maxBtn = document.createElement('button');
      maxBtn.className = 'mdi-btn mdi-btn-max';
      maxBtn.innerHTML = '&#9633;'; // Square
      maxBtn.title = 'Maximizar / Restaurar';
      maxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMaximize(opts.id);
      });
      controls.appendChild(maxBtn);
    }

    if (opts.isClosable !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'mdi-btn mdi-btn-close';
      closeBtn.innerHTML = '&#10005;'; // X
      closeBtn.title = 'Cerrar';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeWindow(opts.id);
      });
      controls.appendChild(closeBtn);
    }

    header.appendChild(controls);
    win.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'mdi-body';
    body.appendChild(opts.content);
    win.appendChild(body);

    // Resize handles
    const handles = ['se', 'e', 's', 'sw', 'w', 'nw', 'n', 'ne'];
    handles.forEach(h => {
      const resizeElem = document.createElement('div');
      resizeElem.className = `mdi-resizer mdi-resizer-${h}`;
      win.appendChild(resizeElem);
      this.initResize(win, resizeElem, h, opts);
    });

    // Make Draggable
    this.initDrag(win, header);

    // Bring to front on click
    win.addEventListener('pointerdown', () => this.bringToFront(opts.id));

    this.container.appendChild(win);

    // Taskbar Button
    const taskbarBtn = document.createElement('button');
    taskbarBtn.className = 'mdi-taskbar-item active';
    taskbarBtn.innerHTML = `${opts.icon ? opts.icon + ' ' : ''}${opts.title}`;
    taskbarBtn.addEventListener('click', () => {
      const w = this.windows.get(opts.id);
      if (!w) return;
      if (w.isMinimized) {
        this.restoreWindow(opts.id);
        this.bringToFront(opts.id);
      } else if (win.style.zIndex === `${this.topZIndex}`) {
        this.minimizeWindow(opts.id);
      } else {
        this.bringToFront(opts.id);
      }
    });
    this.taskbarContainer.appendChild(taskbarBtn);

    this.windows.set(opts.id, {
      elem: win,
      taskbarBtn,
      opts,
      isMinimized: false,
      isMaximized: false
    });

    return win;
  }

  public bringToFront(id: string): void {
    const w = this.windows.get(id);
    if (!w) return;
    w.elem.style.zIndex = `${++this.topZIndex}`;
    this.windows.forEach(item => {
      item.elem.classList.remove('active');
      item.taskbarBtn.classList.remove('active');
    });
    w.elem.classList.add('active');
    w.taskbarBtn.classList.add('active');
  }

  public minimizeWindow(id: string): void {
    const w = this.windows.get(id);
    if (!w) return;
    w.isMinimized = true;
    w.elem.style.display = 'none';
    w.taskbarBtn.classList.remove('active');
    w.taskbarBtn.classList.add('minimized');
  }

  public restoreWindow(id: string): void {
    const w = this.windows.get(id);
    if (!w) return;
    w.isMinimized = false;
    w.elem.style.display = 'flex';
    w.taskbarBtn.classList.remove('minimized');
    w.taskbarBtn.classList.add('active');
  }

  public toggleMaximize(id: string): void {
    const w = this.windows.get(id);
    if (!w) return;

    if (w.isMaximized) {
      // Restore
      if (w.prevRect) {
        w.elem.style.left = `${w.prevRect.x}px`;
        w.elem.style.top = `${w.prevRect.y}px`;
        w.elem.style.width = `${w.prevRect.w}px`;
        w.elem.style.height = `${w.prevRect.h}px`;
      }
      w.elem.classList.remove('maximized');
      w.isMaximized = false;
    } else {
      // Maximize
      w.prevRect = {
        x: parseInt(w.elem.style.left, 10),
        y: parseInt(w.elem.style.top, 10),
        w: parseInt(w.elem.style.width, 10),
        h: parseInt(w.elem.style.height, 10)
      };
      w.elem.style.left = '0px';
      w.elem.style.top = '0px';
      w.elem.style.width = '100%';
      w.elem.style.height = '100%';
      w.elem.classList.add('maximized');
      w.isMaximized = true;
    }
  }

  public closeWindow(id: string): void {
    const w = this.windows.get(id);
    if (!w) return;
    if (w.opts.onClose) w.opts.onClose();
    w.elem.remove();
    w.taskbarBtn.remove();
    this.windows.delete(id);
  }

  public setWindowTitle(id: string, title: string): void {
    const w = this.windows.get(id);
    if (!w) return;
    w.opts.title = title;
    const titleSpan = w.elem.querySelector('.mdi-title');
    if (titleSpan) titleSpan.textContent = title;
    if (w.taskbarBtn) {
      w.taskbarBtn.innerHTML = `${w.opts.icon ? w.opts.icon + ' ' : ''}${title}`;
    }
  }

  public getWindow(id: string): HTMLElement | undefined {
    return this.windows.get(id)?.elem;
  }

  public hasWindow(id: string): boolean {
    return this.windows.has(id);
  }

  private initDrag(win: HTMLElement, handle: HTMLElement): void {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = Math.max(0, initialLeft + dx);
      const newTop = Math.max(0, initialTop + dy);
      win.style.left = `${newLeft}px`;
      win.style.top = `${newTop}px`;
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = win.offsetLeft;
      initialTop = win.offsetTop;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  private initResize(win: HTMLElement, resizer: HTMLElement, dir: string, opts: WindowOptions): void {
    let startX = 0, startY = 0, startW = 0, startH = 0, startLeft = 0, startTop = 0;
    const minW = opts.minWidth ?? 200;
    const minH = opts.minHeight ?? 140;

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (dir.includes('e')) {
        win.style.width = `${Math.max(minW, startW + dx)}px`;
      }
      if (dir.includes('s')) {
        win.style.height = `${Math.max(minH, startH + dy)}px`;
      }
      if (dir.includes('w')) {
        const newW = Math.max(minW, startW - dx);
        if (newW > minW) {
          win.style.width = `${newW}px`;
          win.style.left = `${startLeft + dx}px`;
        }
      }
      if (dir.includes('n')) {
        const newH = Math.max(minH, startH - dy);
        if (newH > minH) {
          win.style.height = `${newH}px`;
          win.style.top = `${startTop + dy}px`;
        }
      }
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    resizer.addEventListener('pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      startW = win.offsetWidth;
      startH = win.offsetHeight;
      startLeft = win.offsetLeft;
      startTop = win.offsetTop;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }
}
