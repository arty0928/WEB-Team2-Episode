import { Bounds, Rect } from "@/shared/types/spatial";
import { clientToWorld } from "@/utils/worldScreenTransform";

const BASE_MIN_ZOOM = 0.1;
const BASE_MAX_ZOOM = 5;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export class ViewportController {
    private canvas: SVGSVGElement;
    private panX = 0;
    private panY = 0;
    private zoom = 1;
    private rafId: number | null = null;
    private softMinZoom = BASE_MIN_ZOOM;

    constructor(
        canvas: SVGSVGElement,
        private getWorldBounds: () => Rect | null, // 쿼드 트리 월드 영역
        private getContentBounds: () => Bounds | null, // fit을 위한 컨텐츠 bounds
        private onChange?: () => void,
    ) {
        this.canvas = canvas;
        this.applyViewBox();
    }

    private cancelAnimation() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private animateTo(targetPanX: number, targetPanY: number, targetZoom: number, duration: number = 320) {
        this.cancelAnimation(); // 이전 애니메이션이 있다면 중단

        const startPanX = this.panX;
        const startPanY = this.panY;
        const startZoom = this.zoom;
        const startTime = performance.now();

        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const k = easeOutCubic(progress);

            // 보간법(Interpolation) 적용
            this.panX = startPanX + (targetPanX - startPanX) * k;
            this.panY = startPanY + (targetPanY - startPanY) * k;
            this.zoom = startZoom + (targetZoom - startZoom) * k;

            const minZoom = this.getMinZoomToFitWorldBounds();
            if (this.zoom < minZoom) this.zoom = minZoom;

            this.applyViewBox();

            if (progress < 1) {
                this.rafId = requestAnimationFrame(step);
            } else {
                this.rafId = null;
            }
        };

        this.rafId = requestAnimationFrame(step);
    }

    /**
     * 줌아웃 최소값을 동적으로 계산
     * - “쿼드트리 월드가 화면에 다 보이는” zoom 값을 minZoom으로 삼는다.
     * - 월드가 작아 fitZoom이 1보다 커지는 케이스에서 "강제 줌인"은 피하려고 1로 캡(=줌아웃만 제한)
     */
    private getMinZoomToFitWorldBounds(): number {
        const world = this.getWorldBounds();
        const rect = this.canvas.getBoundingClientRect();

        if (!world || rect.width <= 0 || rect.height <= 0) return BASE_MIN_ZOOM;

        const worldWidth = world.maxX - world.minX;
        const worldHeight = world.maxY - world.minY;

        if (worldWidth <= 0 || worldHeight <= 0) return BASE_MIN_ZOOM;

        const zoomX = rect.width / worldWidth;
        const zoomY = rect.height / worldHeight;

        const fitZoom = Math.min(zoomX, zoomY);
        if (!Number.isFinite(fitZoom) || fitZoom <= 0) return BASE_MIN_ZOOM;

        return Math.min(fitZoom, 1);
    }

    /** 리사이즈 반영 */
    handleResize(): void {
        const minZoom = this.getMinZoomToFitWorldBounds();
        if (this.zoom < minZoom) this.zoom = minZoom;

        this.applyViewBox();
    }

    resetView(): void {
        this.animateTo(0, 0, 1);
    }

    getSnapshot() {
        return { x: this.panX, y: this.panY, scale: this.zoom };
    }

    setViewport(x: number, y: number, scale: number): void {
        this.cancelAnimation();

        const minZoom = this.getMinZoomToFitWorldBounds();
        this.panX = x;
        this.panY = y;
        this.zoom = Math.min(BASE_MAX_ZOOM, Math.max(scale, minZoom));

        this.applyViewBox();
    }

    getCurrentTransform() {
        return { x: this.panX, y: this.panY, scale: this.zoom };
    }

    zoomByWheel(deltaY: number, clientX: number, clientY: number) {
        this.cancelAnimation();
        const rect = this.canvas.getBoundingClientRect();

        // 줌 전 마우스 월드 좌표
        const beforeZoomMouseX = this.panX + (clientX - rect.left - rect.width / 2) / this.zoom;
        const beforeZoomMouseY = this.panY + (clientY - rect.top - rect.height / 2) / this.zoom;

        const zoomSpeed = 0.001;
        const scaleChange = Math.exp(-deltaY * zoomSpeed);
        const rawZoom = this.zoom * scaleChange;

        const minZoom = this.getMinZoomToFitWorldBounds();
        const nextZoom = Math.min(BASE_MAX_ZOOM, Math.max(rawZoom, minZoom)); // 🟡 (기존 softMinZoom → 동적 minZoom)

        this.zoom = nextZoom;

        // 마우스 아래 월드 좌표 고정되도록 pan 보정
        this.panX = beforeZoomMouseX - (clientX - rect.left - rect.width / 2) / this.zoom;
        this.panY = beforeZoomMouseY - (clientY - rect.top - rect.height / 2) / this.zoom;

        this.applyViewBox();
    }

    screenToWorld(clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();

        const world = clientToWorld(
            { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            { x: clientX, y: clientY },
            { x: this.panX, y: this.panY, scale: this.zoom },
        );

        return world ?? { x: this.panX, y: this.panY };
    }

    panningHandler(dx: number, dy: number): void {
        this.cancelAnimation();
        // 현재 줌 배율에 맞춰 마우스 픽셀 이동량을 World 좌표 이동량으로 변환
        this.panX -= dx / this.zoom;
        this.panY -= dy / this.zoom;

        this.applyViewBox();
    }

    fitToWorldRect() {
        const bounds = this.getContentBounds();
        const cw = this.canvas.clientWidth;
        const ch = this.canvas.clientHeight;

        // 1. 가드 클로즈: 필요한 데이터가 없으면 즉시 종료
        if (!bounds || cw === 0 || ch === 0) return;

        // 2. 패딩을 포함한 실제 타겟 영역 크기 (의미 단위 분리)
        const targetWidth = bounds.width * 1.1;
        const targetHeight = bounds.height * 1.1;

        // 3. 가로/세로 각각의 적정 배율 계산
        const zoomX = cw / targetWidth;
        const zoomY = ch / targetHeight;

        const rawZoom = Math.min(zoomX, zoomY);
        const minZoom = this.getMinZoomToFitWorldBounds();

        // 4. 최종 줌 결정 (둘 중 작은 값을 선택해야 영역이 잘리지 않음)
        const newZoom = Math.min(BASE_MAX_ZOOM, Math.max(rawZoom, minZoom));

        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;

        this.animateTo(centerX, centerY, newZoom, 400);
    }

    private applyViewBox() {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0) return;

        const viewWidth = rect.width / this.zoom;
        const viewHeight = rect.height / this.zoom;

        const minX = this.panX - viewWidth / 2;
        const minY = this.panY - viewHeight / 2;

        this.canvas.setAttribute("viewBox", `${minX} ${minY} ${viewWidth} ${viewHeight}`);

        this.onChange?.();
    }
}
