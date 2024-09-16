import { defineTool } from "../../src/lib/tools";
import useSelection from "../../src/lib/selection";
import paper from "paper";
import { notifyViewChanged } from "../../src/lib/render";
import { triggers } from "../../src/lib/triggers";
import { useBounds, useMoving, useRectangularSelection, useRotatation, useScaling } from "../../src/lib/interactions";

const selection = useSelection(paper, () => {}, JSON.parse);

const guideColor = "#9257f7";

export const select = defineTool({
	definition: {
		id: 'select',
		name: 'tools.itemSelect',
		actions: [
			{
				name: "delete",
				callback: () => selection.deleteItemSelection(),
				category: "menu.edit",
				defaultKey: "delete",
			}
		],
	},
	setup(on) {
		const moving = useMoving();
		const scaling = useScaling(paper);
		const rotation = useRotatation({ snapAngle: 45 });
		const rectSelection = useRectangularSelection(paper);
		const bounds = useBounds({ rotationHandleDistance: 10 });

		let mode: "none" | "scale" | "rotate" | "move" | "cloneMove" | "rectSelection" = 'none';

		let tolerance = 0;

		const hideBounds = () => bounds.hide();
		on("activate", () => {
			showBounds();
			tolerance = 8 / paper.view.zoom;
			triggers.on("DeleteItems", hideBounds);
		});

		on("deactivate", () => {
			triggers.off("DeleteItems", hideBounds);
		});

		on("mousedown", event => {
			if (event.event.button > 0) return;
			
			if (bounds.state) {
				if (bounds.state.rotPoint.isClose(event.point, tolerance)) {
					mode = "rotate";
					rotation.start(selection.getSelectedItems(), bounds.state.rect.center, event.point);
					bounds.hide();
					return;
				}
				for (const point of bounds.state.scalePoints) {
					if (point.isClose(event.point, tolerance)) {
						mode = "scale";
	
						scaling.start(selection.getSelectedItems(), bounds.state.rect.center, point);
						bounds.hide();
						return;
					}
				}
			}

			const hitResult = paper.project.hitTest(event.point, {
				segments: true,
				stroke: true,
				curves: true,
				fill: true,
				guides: false,
				tolerance
			});

			if (hitResult) {
				if (!event.modifiers.shift) {
					if (!hitResult.item.selected) {
						selection.clearSelection();
					}
				}
				if (event.modifiers.shift && hitResult.item.selected) {
					selection.setItemSelection(hitResult.item, false);
				} else {
					selection.setItemSelection(hitResult.item, true);
					if (event.modifiers.alt) {
						mode = 'cloneMove';
						selection.cloneSelection();
					} else {
						mode = 'move';
					}
				}
				bounds.hide();
				return;
			}

			if (!event.modifiers.shift) {
				bounds.hide();
				selection.clearSelection();
			}
			mode = 'rectSelection';
		});

		
		on("mousedrag", event => {
			if (event.event.button > 0) return;
			
			switch (mode) {
				case 'rectSelection':
					if (!rectSelection.rect) {
						rectSelection.start(event.downPoint);
					} else {
						rectSelection.update(event.point, event.downPoint);
					}
					notifyViewChanged(paper);
					break;
				case 'scale':
					scaling.update(event.delta, event.modifiers.shift, event.modifiers.alt);
					break;
				case 'rotate':
					rotation.update(event.point, event.modifiers.shift);
					break;
				case 'move':
				case 'cloneMove':
					const selectedItems = selection.getSelectedItems();
					moving.update(selectedItems, event.delta);
				break;
			} 
		});

		on("mouseup", event => {
			if (event.event.button > 0) return;
			
			switch (mode) {
				case 'rectSelection':
					if (rectSelection.rect) {
						selection.processRectangularSelection(event.event.shiftKey, rectSelection.rect);
					}
					break;
				case 'scale':
					scaling.end();
					break;
				case 'rotate':
					rotation.end();
					break;
			}
			
			mode = 'none';
			rectSelection.end();
			
			bounds.hide();
			if (selection.getSelectedItems().length > 0) {
				showBounds();
			}
		});

		on("drawImmediate", ({ context }) => {
			const zoom = 1/paper.view.zoom;
			if (rectSelection.rect) {
				const { x, y, width, height } = rectSelection.rect;
				context.setLineDash([3 * zoom, 3 * zoom]);
				context.strokeStyle = guideColor;
				context.strokeRect(x, y, width, height);
				context.setLineDash([]);
			}
			if (bounds.state) {
				const { rect: { x, y, width, height }, rotPoint, scalePoints } = bounds.state;
				context.strokeStyle = guideColor;
				context.fillStyle = "white";
				context.strokeRect(x, y, width, height);
				if (rotPoint) {
					context.beginPath();
					context.arc(rotPoint.x, rotPoint.y, 5 * zoom, 0, 2 * Math.PI);
					context.stroke();
					context.fill();
				}
				context.fillStyle = guideColor;
				for (const [index, point] of scalePoints.entries()) {
					const size = (index % 2 ? 4 : 6) * zoom;
					context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
				}
			}
		});

		const showBounds = function() {			
			bounds.show(selection.getSelectedItems(), paper.view.zoom);
			notifyViewChanged(paper);
		};
	},
});
