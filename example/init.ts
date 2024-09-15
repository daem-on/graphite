import { createToolRegistry, createToolSwitcher, getActiveTool, initializeTools, setupInput } from "../src/lib/tools";
import { select } from "./tools/select";
import { createCustomRenderer } from "../src/lib/render";
import paper from "paper";

const registry = createToolRegistry({
	select,
});

const switchToolById = createToolSwitcher(registry);

export function init() {
	initializeTools(registry, paper);
	setupInput(paper);
	switchToolById("select");

	createCustomRenderer({
		getActiveTool,
		scope: paper,
	});

	new paper.Path.Circle({
		center: [160, 160],
		radius: 20,
		strokeColor: 'black',
		strokeWidth: 1,
	});
	new paper.Path.Circle({
		center: [190, 170],
		radius: 20,
		strokeColor: 'black',
		strokeWidth: 1,
	});
	new paper.Path.Star({
		center: [230, 160],
		radius1: 10,
		radius2: 20,
		points: 5,
		strokeColor: 'black',
		strokeWidth: 1,
	});

	paper.view.zoom = 1.4;
}