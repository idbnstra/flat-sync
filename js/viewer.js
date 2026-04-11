/**
 * FlatViewer: A lightweight class for panning and zooming flat images.
 */
class FlatViewer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.img = null;
        this.options = {
            panorama: options.panorama || '',
            onViewChange: options.onViewChange || null,
            ...options
        };

        this.state = {
            zoom: 1,
            x: 0,
            y: 0,
            rotation: 0,
            isDragging: false,
            isInitialized: false,
            isViewModified: false,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0
        };

        this.init();
    }

    init() {
        this.container.style.overflow = 'hidden';
        this.container.style.position = 'relative';
        this.container.style.cursor = 'grab';

        const setupImg = (el) => {
            el.style.position = 'absolute';
            el.style.pointerEvents = 'none';
            el.style.userSelect = 'none';
            el.style.transformOrigin = 'center center';
            el.style.display = 'block';
        };

        this.img = document.createElement('img');
        setupImg(this.img);

        // Attach listeners BEFORE setting source to avoid race conditions
        this.img.onload = () => {
            console.log('FlatViewer: Image loaded:', this.options.panorama);
            if (this.options.wrapX && this.imgLeft && this.imgRight) {
                this.imgLeft.src = this.img.src;
                this.imgRight.src = this.img.src;
            }
            this.tryInitialReset();
        };

        this.img.onerror = () => {
            console.error('FlatViewer: Failed to load image', this.options.panorama);
            this.container.style.display = 'flex';
            this.container.style.alignItems = 'center';
            this.container.style.justifyContent = 'center';
            this.container.innerHTML = `<div style="color: #ef4444; font-size: 0.8rem; text-align: center;">Failed to load image:<br>${this.options.panorama}</div>`;
        };

        this.img.src = this.options.panorama;
        this.container.appendChild(this.img);

        if (this.options.wrapX) {
            this.imgLeft = document.createElement('img');
            this.imgRight = document.createElement('img');
            setupImg(this.imgLeft);
            setupImg(this.imgRight);
            this.container.appendChild(this.imgLeft);
            this.container.appendChild(this.imgRight);
        }

        this.addEventListeners();

        // Use ResizeObserver to handle container size changes (very robust for flex/absolute layouts)
        this.resizeObserver = new ResizeObserver(() => {
            console.log('FlatViewer: Resize observed');
            this.tryInitialReset();
            if (this.state.isInitialized) {
                this.updateTransform();
            }
        });
        this.resizeObserver.observe(this.container);
        
        this.createLoadingOverlay();
    }

    createLoadingOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'viewer-loading-overlay';
        this.overlay.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-text">Initializing View...</div>
            </div>
        `;
        this.container.appendChild(this.overlay);
    }

    tryInitialReset() {
        const rect = this.container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && this.img.complete && this.img.naturalWidth > 0) {
            // If the view hasn't been manually modified yet, we re-fit it to the container
            if (!this.state.isViewModified) {
                this.reset();
            }
            
            if (!this.state.isInitialized) {
                this.state.isInitialized = true;
                console.log('FlatViewer: Initialized (isViewModified:', this.state.isViewModified, ')');
                
                // Remove overlay
                if (this.overlay) {
                    this.overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (this.overlay && this.overlay.parentNode) {
                            this.overlay.parentNode.removeChild(this.overlay);
                            this.overlay = null;
                        }
                    }, 500);
                }

                if (this.options.onInit) this.options.onInit(this.getView());
            }
        }
    }

    reset() {
        if (!this.img || !this.img.naturalWidth) return;
        
        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const imgRatio = this.img.naturalWidth / this.img.naturalHeight;
        const contRatio = rect.width / rect.height;

        if (imgRatio > contRatio) {
            this.state.zoom = rect.width / this.img.naturalWidth;
        } else {
            this.state.zoom = rect.height / this.img.naturalHeight;
        }

        // Add a small safety margin to avoid zero zoom if possible
        if (this.state.zoom <= 0) this.state.zoom = 0.001;

        this.state.x = rect.width / 2;
        this.state.y = rect.height / 2;
        this.updateTransform();
        this.onViewChange();
    }

    addEventListeners() {
        this.container.addEventListener('mousedown', (e) => {
            this.state.isDragging = true;
            this.state.startX = e.clientX;
            this.state.startY = e.clientY;
            this.state.lastX = this.state.x;
            this.state.lastY = this.state.y;
            this.container.style.cursor = 'grabbing';
            this.notifyAction();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.state.isDragging) return;
            const dx = e.clientX - this.state.startX;
            const dy = e.clientY - this.state.startY;
            this.state.x = this.state.lastX + dx;
            this.state.y = this.state.lastY + dy;
            this.state.isViewModified = true;
            this.updateTransform();
            this.onViewChange();
        });

        window.addEventListener('mouseup', () => {
            if (this.state.isDragging) {
                this.state.isDragging = false;
                this.container.style.cursor = 'grab';
            }
        });

        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            if (rect.width === 0) return;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const delta = -e.deltaY;
            const zoomFactor = Math.pow(1.1, delta / 150);

            const oldZoom = this.state.zoom;
            this.state.zoom *= zoomFactor;

            // Clamp zoom to avoid disappearing
            if (this.state.zoom < 0.0001) this.state.zoom = 0.0001;

            // Zoom relative to mouse position
            this.state.x = mouseX - (mouseX - this.state.x) * (this.state.zoom / oldZoom);
            this.state.y = mouseY - (mouseY - this.state.y) * (this.state.zoom / oldZoom);
            this.state.isViewModified = true;

            this.updateTransform();
            this.onViewChange();
        }, { passive: false });
    }

    updateTransform() {
        if (!this.img || !this.img.naturalWidth) return;
        
        const w = this.img.naturalWidth;
        const h = this.img.naturalHeight;

        // For wrapping panoramas, we handle the offset visually without mutating state.x permanently in a way that breaks synchronization.
        let renderX = this.state.x;
        if (this.options.wrapX) {
            const wrapW = w * this.state.zoom;
            // Only normalize if we have a valid wrap width to avoid division by zero
            if (wrapW > 0) {
                renderX = ((this.state.x % wrapW) + wrapW) % wrapW;
            }
        }

        const left = renderX - w / 2;
        const top = this.state.y - h / 2;

        const transform = `translate(${left}px, ${top}px) scale(${this.state.zoom}) rotate(${this.state.rotation}deg)`;
        
        this.img.style.width = w + 'px';
        this.img.style.height = h + 'px';
        this.img.style.transform = transform;

        if (this.options.wrapX && this.imgLeft && this.imgRight) {
            this.imgLeft.style.width = w + 'px';
            this.imgLeft.style.height = h + 'px';
            this.imgLeft.style.transform = `${transform} translate(${-w}px, 0)`;
            
            this.imgRight.style.width = w + 'px';
            this.imgRight.style.height = h + 'px';
            this.imgRight.style.transform = `${transform} translate(${w}px, 0)`;
        }

        if (this.updateMarker) this.updateMarker();
    }

    getView() {
        return {
            zoom: this.state.zoom,
            x: this.state.x,
            y: this.state.y,
            rotation: this.state.rotation
        };
    }

    setView(view, silent = false) {
        if (view.zoom !== undefined && !isNaN(view.zoom)) this.state.zoom = view.zoom;
        if (view.x !== undefined && !isNaN(view.x)) this.state.x = view.x;
        if (view.y !== undefined && !isNaN(view.y)) this.state.y = view.y;
        if (view.rotation !== undefined && !isNaN(view.rotation)) this.state.rotation = view.rotation;
        this.state.isViewModified = true;
        this.updateTransform();
        if (!silent) this.onViewChange();
    }

    onViewChange() {
        if (this.options.onViewChange) {
            this.options.onViewChange(this.getView());
        }
    }

    notifyAction() {
        if (this.options.onAction) {
            this.options.onAction();
        }
    }

    containerToNatural(cx, cy) {
        if (!this.img || !this.img.naturalWidth) return { x: 0, y: 0 };
        const w = this.img.naturalWidth;
        const h = this.img.naturalHeight;
        
        let rx = cx;
        if (this.options.wrapX) {
            const wrapW = w * this.state.zoom;
            rx = ((this.state.x % wrapW) + wrapW) % wrapW;
            const dx = cx - this.state.x;
            rx = rx + dx;
        }

        const nx = (rx - this.state.x) / this.state.zoom;
        const ny = (cy - this.state.y) / this.state.zoom;
        return { x: nx, y: ny };
    }

    naturalToContainer(nx, ny) {
        if (!this.img || !this.img.naturalWidth) return { x: 0, y: 0 };
        return {
            x: this.state.x + nx * this.state.zoom,
            y: this.state.y + ny * this.state.zoom
        };
    }

    showMarker(point, color = 'red') {
        if (!this.marker) {
            this.marker = document.createElement('div');
            this.marker.style.position = 'absolute';
            this.marker.style.width = '12px';
            this.marker.style.height = '12px';
            this.marker.style.border = `2px solid ${color}`;
            this.marker.style.borderRadius = '50%';
            this.marker.style.transform = 'translate(-50%, -50%)';
            this.marker.style.pointerEvents = 'none';
            this.marker.style.zIndex = '100';
            this.marker.innerHTML = '<div style="position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:2px; height:2px; background:'+color+'"></div>';
            this.container.appendChild(this.marker);
        }
        this.markerPoint = point;
        this.updateMarker();
    }

    updateMarker() {
        if (this.marker && this.markerPoint) {
            const pos = this.naturalToContainer(this.markerPoint.x, this.markerPoint.y);
            this.marker.style.left = pos.x + 'px';
            this.marker.style.top = pos.y + 'px';
            this.marker.style.display = 'block';
        }
    }
}
