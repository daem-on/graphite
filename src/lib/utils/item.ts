export function isBoundsItem(item: paper.Item): boolean {
	return ['PointText', 'Shape', 'SymbolItem', 'Raster']
		.includes(item.className);
}


export function isPathItem(item: paper.Item): item is paper.Path {
	return item.className === 'Path';
}


export function isCompoundPathItem(item: paper.Item): item is paper.CompoundPath {
	return item.className === 'CompoundPath';
}


export function isGroupItem(item: paper.Item): item is paper.Group {
	return item.className === 'Group';
}


export function isPointTextItem(item: paper.Item): item is paper.PointText {
	return item.className === 'PointText';
}


export function isLayer(item: paper.Item): item is paper.Layer {
	return item.className === 'Layer';
}


export function setPivot(item: paper.Item, point: paper.Point) {
	if (isBoundsItem(item)) {
		item.pivot = item.globalToLocal(point);
	} else {
		item.pivot = point;
	}
}


export function getPositionInView(view: paper.View, item: paper.Item): paper.Point {
	return new paper.Point(
		item.position.x - view.bounds.x,
		item.position.y - view.bounds.y
	);
}


export function setPositionInView(view: paper.View, item: paper.Item, pos: paper.Point) {
	item.position.x = view.bounds.x + pos.x;
	item.position.y = view.bounds.y + pos.y;
}

export function getRootItem(item: paper.Item): paper.Item {
	if (item.parent.className === 'Layer') {
		return item;
	} else {
		return getRootItem(item.parent);
	}
}