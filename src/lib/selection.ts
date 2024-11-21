import * as geometry from "./utils/geometry";
import * as items from "./utils/item";
import { triggers } from "./triggers";

function useSelection(paper: paper.PaperScope, snapshot: (label: string) => unknown, deserializeJSON: (data: string) => any) {
	function getAllSelectableItems() {
		return paper.project.getItems({
			recursive: true,
			match: (item: paper.Item) => item.data
				&& !item.data.isHelperItem
				&& item.layer === paper.project.activeLayer
		});
	}

	function selectAllItems() {
		const items = getAllSelectableItems();
		for (const item of items) setItemSelection(item, true);
	}

	function selectRandomItems() {
		const items = getAllSelectableItems();

		for (const item of items) {
			if (Math.random() > 0.5) {
				setItemSelection(item, true);
			}
		}
	}

	function focusItem(item: paper.Item): void {
		paper.project.deselectAll();
		if (item.layer !== paper.project.activeLayer) {
			item.layer.activate();
			triggers.emit("LayersChanged");
		}
		item.selected = true;
		paper.view.center = item.bounds.center;
		triggers.emit("SelectionChanged");
	}

	function selectAllSegments() {
		const items = getAllSelectableItems();
		for (const item of items) selectItemSegments(item, true);
	}

	function selectItemSegments(item: paper.Item, state: boolean) {
		if (item.children) {
			for (const child of item.children) {
				if (!items.isPathItem(child)) continue;
				if (child.children && child.children.length > 0) {
					selectItemSegments(child, state);
				} else {
					child.fullySelected = state;
				}
			}
		} else {
			if (!items.isPathItem(item)) return;
			for (const segment of item.segments) segment.selected = state;
		}
	}

	function clearSelection() {
		paper.project.deselectAll();

		triggers.emit("SelectionChanged");
	}

	function invertItemSelection() {
		const items = getAllSelectableItems();
		for (const item of items) item.selected = !item.selected;
		triggers.emit("SelectionChanged");
	}

	function invertSegmentSelection() {
		const list = getAllSelectableItems();

		for (const item of list) {
			if (!items.isPathItem(item) || !item.segments) continue;
			for (const segment of item.segments) segment.selected = !segment.selected;
		}
	}

	function deleteItemSelection() {
		for (const item of getSelectedItems()) item.remove();

		triggers.emitAll(["DeleteItems", "SelectionChanged"]);
		paper.project.view.update();
		snapshot("deleteItemSelection");
	}

	function splitPathAtSelectedSegments() {
		const items = getSelectedItems() as paper.Path[];
		for (const item of items) {
			for (const segment of [...item.segments]) {
				if (segment.selected) {
					if (
						item.closed ||
						(segment.next &&
							!segment.next.selected &&
							segment.previous &&
							!segment.previous.selected)
					) {
						splitPathRetainSelection(segment, false);
					}
				}
			}
		}
	}

	/**
	 * This function is borrowed straight from an older version
	 * of Paper.js, for some reason they just removed it.
	 * But we need it for splitting by segment index, so here it is.
	 */
	function split(path: paper.Path, index: number, time: number) {
		let curve: paper.Curve | undefined;
		const location = time === undefined ? index
				: (curve = path.curves[index])
					&& curve.getLocationAtTime(time);
		return location != null ? path.splitAt(location) : null;
	}

	function copyData(source: { data: any }, target: { data: any }) {
		if (source.data) {
			target.data = deserializeJSON(JSON.stringify(source.data));
		}
	}

	function splitPathRetainSelection(
		segment: paper.Segment,
		deselectSplitSegments?: boolean
	): void {
		const { path, index } = segment;
		const selectedSegments = path.segments.filter(seg => seg.selected && !(deselectSplitSegments && seg.index === index));
		const newPath = split(path, index, 0);
		if (!newPath) return;
		copyData(path, newPath);

		for (const seg of selectedSegments) seg.selected = true;
	}

	function cloneSelection() {
		const selectedItems = getSelectedItems();
		for (const item of selectedItems) {
			const cloned = item.clone();
			copyData(item, cloned);
			item.selected = false;
		}

		snapshot("cloneSelection");
	}

	function setItemSelection(item: paper.Item, state: boolean) {
		if (item.layer !== paper.project.activeLayer) return;

		// if selection is in a group, select group not individual items
		if (item.parent && (items.isGroupItem(item.parent) || items.isCompoundPathItem(item.parent))) {
			// do it recursive
			setItemSelection(item.parent, state);
		} else {
			if (item.data && item.data.noSelect) return;
			// fully selected segments need to be unselected first
			if (items.isPathItem(item)) item.fullySelected = false;
			// then the item can be normally selected
			item.selected = state;
			// deselect children of compound-path or group for cleaner item selection
			if (items.isCompoundPathItem(item) || items.isGroupItem(item)) {
				for (const child of item.children) child.selected = false;
			}
		}

		triggers.emit("SelectionChanged");
	}

	/**
	 * this gets all selected non-grouped items and groups
	 * (alternative to paper.project.selectedItems, which includes
	 * group children in addition to the group)
	 */
	function getSelectedItems() {
		const allItems = paper.project.selectedItems;
		const itemsAndGroups = allItems.filter(item => {
			if (items.isLayer(item)) return false;
			if (!items.isGroupItem(item.parent)) {
				if (!item.data || !item.data.isSelectionBound) {
					return true;
				}
			}
			return false;
		});
		// sort items by index (0 at bottom)
		itemsAndGroups.sort((a, b) => {
			return a.index - b.index;
		});
		return itemsAndGroups;
	}

	function getSelectionType(): string | undefined {
		const selection = getSelectedItems();
		if (selection.length === 0) return;
		const first = selection[0];
		if (items.isPathItem(first) && first.segments.some(seg => seg.selected)) {
			return "Segment";
		}
		return selection.some(item => item.className !== first.className) ? "Mixed" : first.className;
	}

	// only returns paths, no compound paths, groups or any other stuff
	function getSelectedPaths(): paper.Path[] {
		return getSelectedItems().filter(items.isPathItem);
	}

	function smoothHandles() {
		switchSelectedHandles("smooth");
	}

	function switchSelectedHandles(mode?: "linear" | "smooth") {
		for (const item of getSelectedItems()) {
			if (!items.isPathItem(item)) continue;
			for (const segment of item.segments) {
				if (segment.selected) geometry.switchHandle(segment, mode);
			}
		}
		snapshot("switchSelectedHandles");
	}

	function removeSelectedSegments() {
		for (const item of getSelectedItems()) {
			if (!items.isPathItem(item)) continue;
			for (const segment of [...item.segments]) {
				if (segment.selected) segment.remove();
			}
		}
		snapshot("removeSelectedSegments");
	}

	function processRectangularSelection(
		invert: boolean,
		rect: paper.Rectangle,
		mode?: "detail"
	) {
		for (const item of getAllSelectableItems()) {
			// check for item segment points inside selectionRect
			if (items.isGroupItem(item) || items.isCompoundPathItem(item)) {
				if (!handleRectangularSelectionGroup(item, rect, invert, mode)) {
					continue;
				}
			} else {
				if (!handleRectangularSelectionItem(item, invert, rect, mode)) {
					continue;
				}
			}
		}
	}

	// if the rectangular selection found a group, drill into it recursively
	function handleRectangularSelectionGroup(
		group: paper.Group | paper.CompoundPath,
		rect: paper.Rectangle,
		invert: boolean,
		mode?: "detail"
	) {
		for (const child of group.children) {
			if (items.isGroupItem(child) || items.isCompoundPathItem(child)) {
				handleRectangularSelectionGroup(child, rect, invert, mode);
			} else {
				if (!handleRectangularSelectionItem(child, invert, rect, mode)) {
					return false;
				}
			}
		}
		return true;
	}

	function handleRectangularSelectionItem(
		item: paper.Item,
		invert: boolean,
		rect: paper.Rectangle,
		mode?: "detail"
	) {
		if (item.layer !== paper.project.activeLayer) return;
		if (items.isPathItem(item)) {
			let segmentMode = false;

			// first round checks for segments inside the selectionRect
			for (const seg of item.segments) {
				if (rect.contains(seg.point)) {
					if (mode === "detail") {
						if (invert && seg.selected) {
							seg.selected = false;
						} else {
							seg.selected = true;
						}
						segmentMode = true;
					} else {
						setItemSelection(item, !invert || !item.selected);
						return false;
					}
				}
			}

			// second round checks for path intersections
			const path = new paper.Path.Rectangle(rect);
			const intersections = item.getIntersections(path);
			path.remove();
			if (intersections.length > 0 && !segmentMode) {
				// if in detail select mode, select the curves that intersect
				// with the selectionRect
				if (mode === "detail") {
					// intersections contains every curve twice because
					// the selectionRect intersects a circle always at
					// two points. so we skip every other curve
					for (const { curve } of intersections.filter((_, i) => i % 2 === 0)) {
						if (invert) {
							curve.selected = !curve.selected;
						} else {
							curve.selected = true;
						}
					}
				} else {
					setItemSelection(item, !invert || !item.selected);
					return false;
				}
			}
		} else if (items.isBoundsItem(item)) {
			if (handleRectangularSelectionBoundsItem(rect, item, invert)) {
				return false;
			}
		}
		return true;
	}

	function handleRectangularSelectionBoundsItem(
		selectionRect: paper.Rectangle,
		item: paper.Item,
		invert: boolean
	) {
		const itemBounds = item.bounds;

		const isIntersecting = selectionRect.intersects(itemBounds);
		if (isIntersecting) {
			setItemSelection(item, !invert || !item.selected);
			return true;
		}
	}

	return {
		getAllSelectableItems,
		selectAllItems,
		selectRandomItems,
		focusItem,
		selectAllSegments,
		selectItemSegments,
		clearSelection,
		invertItemSelection,
		invertSegmentSelection,
		deleteItemSelection,
		splitPathAtSelectedSegments,
		cloneSelection,
		setItemSelection,
		getSelectedItems,
		getSelectionType,
		getSelectedPaths,
		smoothHandles,
		switchSelectedHandles,
		removeSelectedSegments,
		processRectangularSelection,
	};
}

export default useSelection;
