import type { WtTool } from "./tools";

type CustomRendererConfig = {
	scope: paper.PaperScope;
	cullingFrequency?: number;
	renderCallback?: (items: paper.Item[], context: CanvasRenderingContext2D) => void;
	getActiveTool?: () => WtTool | undefined;
};

export function createCustomRenderer(config: CustomRendererConfig) {
	const { view } = config.scope;
	const originalUpdate = view.update.bind(view);
	view.update = () => {
		const updated = originalUpdate();
		if (updated) render();
		return updated;
	};

	const context = view.element.getContext("2d");
	if (context == null) return;
	context.lineWidth = 1;

	let itemsToDraw: paper.Item[] = [];
	const frequency = config.cullingFrequency ?? 20;

	view.on("frame", (event: any) => {
		if (event.count % frequency !== 0) return;
		itemsToDraw = config.scope.project.getItems({
			recursive: true,
			match: (item: paper.Item) => item.layer?.visible && item.data?.customRenderStyle != null,
			overlapping: view.bounds
		});
	});

	const render = () => {
		view.matrix.applyToContext(context);
		config.renderCallback?.(itemsToDraw, context);
		config.getActiveTool?.()?.emit("drawImmediate", { context, items: itemsToDraw });
		context.resetTransform();
	};
}

export function notifyViewChanged(scope: paper.PaperScope): void {
	(scope.project as any)._changed(1);
}