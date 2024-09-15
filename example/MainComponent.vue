<script setup lang="ts">
import paper from 'paper';
import { onMounted } from 'vue';
import { init } from './init';

onMounted(() => {
	paper.setup("paperCanvas");
	init();
});
</script>

<template>
	<main>
		<canvas
			id="paperCanvas"
			data-paper-resize="true"
			data-paper-hidpi="off"
			width="700"
			height="700"
		></canvas>
		<p>
			This simple example shows a selection tool implementation, based on
			the select tool in <a href="https://github.com/w00dn/papergrapher">papergrapher</a>.
			Its features include multiple selection, cloning, scaling, rotation
			and deletion. You can also access alternate behavior by pressing
			<kbd>Shift</kbd> or <kbd>Alt</kbd>. In addition to selection
			indicators built into Paper.js, the tool shows additional graphics
			for the selection bounds and handles.
		</p>
	</main>
</template>

<style scoped>
canvas {
	border: 1px solid gray;
}
</style>