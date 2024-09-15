import { defineTool } from "../../src/lib/tools";
import useSelection from "../../src/lib/selection";
import paper from "paper";
import { notifyViewChanged } from "../../src/lib/render";
import { triggers } from "../../src/lib/triggers";

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
		let boundsRect: paper.Rectangle | null;
		let boundsScalePoints: paper.Point[] = [];
		let boundsRotPoint: paper.Point | null;

		let mode: "none" | "scale" | "rotate" | "move" | "cloneMove" | "rectSelection" = 'none';
		let selectionRect: paper.Rectangle | null;

		let itemGroup: paper.Group | null;
		let pivot: paper.Point;
		let corner: paper.Point;
		let origPivot: paper.Point;
		let origSize: paper.Point;
		let origCenter: paper.Point;
		let scaleItems: paper.Item[];
		
		let rotItems: paper.Item[] = [];
		let rotGroupPivot: paper.Point;
		const prevRot: number[] = [];

		let tolerance = 0;

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
			
			if (boundsRect) {
				if (boundsRotPoint?.isClose(event.point, tolerance)) {
					mode = "rotate";
					rotGroupPivot = boundsRect.center;
					rotItems = selection.getSelectedItems();
					for (let i = 0; i < rotItems.length; i++) {
						prevRot[i] = event.point.subtract(rotGroupPivot).angle;
					}
					hideBounds();
					return;
				}
				for (const point of boundsScalePoints) {
					if (point.isClose(event.point, tolerance)) {
						mode = "scale";
	
						const opposingCorner = boundsRect.center.subtract(point.subtract(boundsRect.center));
						pivot = opposingCorner.clone();
						origPivot = opposingCorner.clone();
						corner = point.clone();
						origSize = corner.subtract(pivot);
						origCenter = boundsRect.center.clone();
						scaleItems = selection.getSelectedItems();
						hideBounds();
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
				hideBounds();
				return;
			}

			if (!event.modifiers.shift) {
				hideBounds();
				selection.clearSelection();
			}
			mode = 'rectSelection';
		});

		
		on("mousedrag", event => {
			if (event.event.button > 0) return; // only first mouse button
			
			let modOrigSize = origSize;
			
			switch (mode) {
				case 'rectSelection':
					if (!selectionRect) {
						selectionRect = new paper.Rectangle(event.downPoint, event.point);
					} else {
						selectionRect.set(event.downPoint, event.point);
					}
					notifyViewChanged(paper);
					break;
				case 'scale':
					if (!itemGroup) {
						itemGroup = new paper.Group(scaleItems);
						itemGroup.data.isHelperItem = true;
						itemGroup.strokeScaling = false;
						itemGroup.applyMatrix = false;
					} else {
						itemGroup.matrix = new paper.Matrix();
					}
	
					if (event.modifiers.alt) {
						pivot = origCenter;
						modOrigSize = origSize.multiply(0.5);
					} else {
						pivot = origPivot; 
					}
	
					corner = corner.add(event.delta);
					const size = corner.subtract(pivot);
					let sx = 1.0, sy = 1.0;
					if (Math.abs(modOrigSize.x) > 0.0000001) {
						sx = size.x / modOrigSize.x;
					}
					if (Math.abs(modOrigSize.y) > 0.0000001) {
						sy = size.y / modOrigSize.y;
					}
	
					if (event.modifiers.shift) {
						const signx = sx > 0 ? 1 : -1;
						const signy = sy > 0 ? 1 : -1;
						sx = sy = Math.max(Math.abs(sx), Math.abs(sy));
						sx *= signx;
						sy *= signy;
					}
	
					itemGroup.scale(sx, sy, pivot);
					break;
				case 'rotate':
					let rotAngle = (event.point.subtract(rotGroupPivot)).angle;
					
					rotItems.forEach((item, i) => {					
						if (event.modifiers.shift) {
							rotAngle = Math.round(rotAngle / 45) * 45;
							item.applyMatrix = false;
							item.pivot = rotGroupPivot;
							item.rotation = rotAngle - 90;
						} else {
							item.rotate(rotAngle - prevRot[i], rotGroupPivot);
						}
						prevRot[i] = rotAngle;
					});
					break;
				case 'move':
				case 'cloneMove':
					const selectedItems = selection.getSelectedItems();
					for (const item of selectedItems) {
						item.position = item.position.add(event.delta);
					}
				break;
			} 
		});

		on("mouseup", event => {
			if (event.event.button > 0) return;
			
			switch (mode) {
				case 'rectSelection':
					if (selectionRect)
						selection.processRectangularSelection(event.event.shiftKey, selectionRect);
					break;
				case 'scale':
					if (!itemGroup) break;

					itemGroup.strokeScaling = true;
					itemGroup.applyMatrix = true;

					itemGroup.layer.addChildren(itemGroup.children);
					itemGroup.remove();
					itemGroup = null;

					break;
				case 'rotate':
					for (const item of rotItems) {
						item.applyMatrix = true;
					}
					break;
			}
			
			mode = 'none';
			selectionRect = null;
			
			hideBounds();
			if (selection.getSelectedItems().length > 0) {
				showBounds();
			}
		});

		on("drawImmediate", ({ context }) => {
			const zoom = 1/paper.view.zoom;
			if (selectionRect) {
				context.setLineDash([3 * zoom, 3 * zoom]);
				context.strokeStyle = guideColor;
				context.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
				context.setLineDash([]);
			}
			if (boundsRect) {
				context.strokeStyle = guideColor;
				context.fillStyle = "white";
				context.strokeRect(boundsRect.x, boundsRect.y, boundsRect.width, boundsRect.height);
				if (boundsRotPoint) {
					context.beginPath();
					context.arc(boundsRotPoint.x, boundsRotPoint.y, 5 * zoom, 0, 2 * Math.PI);
					context.stroke();
					context.fill();
				}
				context.fillStyle = guideColor;
				for (const [index, point] of boundsScalePoints.entries()) {
					const size = (index % 2 ? 4 : 6) * zoom;
					context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
				}
			}
		});

		const showBounds = function() {			
			const items = selection.getSelectedItems();
			if (items.length <= 0) return;

			const rect = items.reduce((acc, curr) => acc.unite(curr.bounds), items[0].bounds);
			
			boundsRect = rect;

			const center = rect.center;
			boundsScalePoints = [
				rect.bottomLeft,
				rect.leftCenter,
				rect.topLeft,
				rect.topCenter,
				rect.topRight,
				rect.rightCenter,
				rect.bottomRight,
				rect.bottomCenter,
			];

			const bc = rect.bottomCenter;
			boundsRotPoint = bc.add(bc.subtract(center).normalize(10/paper.view.zoom));

			notifyViewChanged(paper);
		};

		const hideBounds = function() {
			boundsRect = null;
			boundsScalePoints.length = 0;
			boundsRotPoint = null;
		};
	},
});
