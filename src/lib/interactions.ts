export function useMoving() {
	return {
		update(items: paper.Item[], delta: paper.Point) {
			for (const item of items) {
				item.position = item.position.add(delta);
			}
		}
	};
}

export function useScaling(scope: paper.PaperScope) {
	let pivot: paper.Point;
	let corner: paper.Point;
	let origPivot: paper.Point;
	let origSize: paper.Point;
	let origCenter: paper.Point;
	let scaleItems: paper.Item[];
	let itemGroup: paper.Group | null;

	return {
		start(items: paper.Item[], center: paper.Point, point: paper.Point) {
			const opposingCorner = center.subtract(point.subtract(center));
			pivot = opposingCorner.clone();
			origPivot = pivot.clone();
			corner = point.clone();
			origSize = corner.subtract(pivot);
			origCenter = center.clone();
			scaleItems = items;
		},
		update(delta: paper.Point, proportional: boolean, aroundCenter: boolean) {
			if (!itemGroup) {
				itemGroup = new scope.Group(scaleItems);
				itemGroup.data.isHelperItem = true;
				itemGroup.strokeScaling = false;
				itemGroup.applyMatrix = false;
			} else {
				itemGroup.matrix = new scope.Matrix();
			}

			let modOrigSize = origSize;
			if (aroundCenter) {
				pivot = origCenter;
				modOrigSize = origSize.multiply(0.5);
			} else {
				pivot = origPivot; 
			}

			corner = corner.add(delta);
			const size = corner.subtract(pivot);
			let sx = 1.0, sy = 1.0;
			if (Math.abs(modOrigSize.x) > 0.0000001) {
				sx = size.x / modOrigSize.x;
			}
			if (Math.abs(modOrigSize.y) > 0.0000001) {
				sy = size.y / modOrigSize.y;
			}

			if (proportional) {
				const signx = sx > 0 ? 1 : -1;
				const signy = sy > 0 ? 1 : -1;
				sx = sy = Math.max(Math.abs(sx), Math.abs(sy));
				sx *= signx;
				sy *= signy;
			}

			itemGroup.scale(sx, sy, pivot);
		},
		end() {
			if (!itemGroup) return;

			itemGroup.strokeScaling = true;
			itemGroup.applyMatrix = true;

			itemGroup.layer.addChildren(itemGroup.children);
			itemGroup.remove();
			itemGroup = null;
		}
	};
}

export function useRotatation(config: { snapAngle: number }) {
	let rotItems: paper.Item[] = [];
	let rotGroupPivot: paper.Point;
	const prevRot: number[] = [];

	return {
		start(items: paper.Item[], center: paper.Point, point: paper.Point) {
			rotGroupPivot = center.clone();
			rotItems = items;
			for (let i = 0; i < rotItems.length; i++) {
				prevRot[i] = point.subtract(rotGroupPivot).angle;
			}
		},
		update(point: paper.Point, snap: boolean) {
			let rotAngle = (point.subtract(rotGroupPivot)).angle;
			
			rotItems.forEach((item, i) => {
				if (snap) {
					rotAngle = Math.round(rotAngle / config.snapAngle) * config.snapAngle;
					item.applyMatrix = false;
					item.pivot = rotGroupPivot;
					item.rotation = rotAngle - 90;
				} else {
					item.rotate(rotAngle - prevRot[i], rotGroupPivot);
				}
				prevRot[i] = rotAngle;
			});
		},
		end() {
			for (const item of rotItems) {
				item.applyMatrix = true;
			}
		}
	};
}

export function useRectangularSelection(scope: paper.PaperScope) {
	let selectionRect: paper.Rectangle | null = null;

	return {
		start(point: paper.Point) {
			selectionRect = new scope.Rectangle(point, point);
		},
		update(point: paper.Point, origin: paper.Point) {
			if (!selectionRect) return;
			selectionRect.set(origin, point);
		},
		end() {
			selectionRect = null;
		},
		get rect() { return selectionRect; },
	};
}

export function useBounds(config: { rotationHandleDistance: number }) {
	type BoundsState = { 
		rect: paper.Rectangle,
		scalePoints: paper.Point[],
		rotPoint: paper.Point,
	};
	let state: BoundsState | null = null;

	return {
		show(items: paper.Item[], zoom: number) {
			if (items.length <= 0) return;
			const rect = items.reduce((acc, curr) => acc.unite(curr.bounds), items[0].bounds);
			const center = rect.center;
			const bc = rect.bottomCenter;
			state = {
				rect,
				scalePoints: [
					rect.bottomLeft,
					rect.leftCenter,
					rect.topLeft,
					rect.topCenter,
					rect.topRight,
					rect.rightCenter,
					rect.bottomRight,
					rect.bottomCenter,
				],
				rotPoint: bc.add(
					bc.subtract(center).normalize(config.rotationHandleDistance / zoom)
				),
			};
		},
		hide() {
			state = null;
		},
		get state(): Readonly<BoundsState> | null {
			return state;
		}
	};
}

export function useDoubleClick(config: { threshold: number }) {
	let lastEventTime = 0;

	return function detectDoubleClick(event: { timeStamp: number }) {
		if ((event.timeStamp - lastEventTime) < config.threshold) {
			lastEventTime = 0;
			return true;
		}
		lastEventTime = event.timeStamp;
		return false;
	};
}
