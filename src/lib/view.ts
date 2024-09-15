export function useView(scope: paper.PaperScope) {
	const { view } = scope;
	return {
		zoomBy(factor: number) {
			view.zoom *= factor;
			view.zoom = Math.max(0.01, Math.min(view.zoom, 1000));
		},
		resetZoom() {
			view.zoom = 1;
		},
		resetPan() {
			view.center = new scope.Point(0, 0);
		},
		centerView() {
			view.center = scope.project.activeLayer.position;
		},
	};
}
