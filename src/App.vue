<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';
import { pixelateImageData, pixelateImageDataHeavy } from './utils/pixelate';

import ImageUploadBox from './components/ImageUploadBox.vue';
import ArrowIcon from './assets/next-arrow.svg'
import { CanvasWithImageData, InputAndSlider, Tab, TabItem } from './components/common';

const inputImageData = ref<ImageData | undefined>(undefined);
const inputPalette = ref<ImageData | undefined>(undefined);

const outputImageDatas = reactive({
  output:       ref<ImageData | undefined>(undefined),
  edge:         ref<ImageData | undefined>(undefined),
  edgeness:  	ref<ImageData | undefined>(undefined),
  palette: 		ref<ImageData | undefined>(undefined),
});

const maxSize = reactive({height: 0, width: 0});
const outputSize = reactive({height: 0, width: 0});
const paletteSize = ref(32);
const doDithering = ref(false);

const threshold = ref(0.2);
const sensitivity = ref(30);

const expanded = ref(false);

const handleTest = () => {
	if (inputImageData.value === undefined) return;

	console.time("total");
	try {
		const res = pixelateImageDataHeavy(
			inputImageData.value,
			inputPalette.value,
			outputSize.height, 
			outputSize.width,
			paletteSize.value,
			threshold.value,
			sensitivity.value,
			doDithering.value,
		);

		outputImageDatas.output = res.output;
		outputImageDatas.edge = res.edge;
		outputImageDatas.edgeness = res.edgeness;
		outputImageDatas.palette = res.palette;
	}
	finally {
		console.timeEnd("total");
	}
}

const handleUpload = (readerResult: string) => {
	const img = new Image();

	img.onload = () => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img, 0, 0);

		inputImageData.value = ctx.getImageData(0, 0, canvas.width, canvas.height);

		(async function() {
			if (inputImageData.value === undefined)
				inputImageData.value = new ImageData(1, 1);

			maxSize.height = inputImageData.value.height;
			maxSize.width = inputImageData.value.width;

			await nextTick();

			outputSize.height = Math.ceil(inputImageData.value.height / 2);
			outputSize.width = Math.ceil(inputImageData.value.width / 2);
		})();
	}

	img.src = readerResult;
}

const handleUploadPalette = (readerResult: string) => {
	const img = new Image();

	img.onload = () => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img, 0, 0);

		inputPalette.value = ctx.getImageData(0, 0, canvas.width, canvas.height);
	}

	img.src = readerResult;
}

const handleTransform = () => {
	if (inputImageData.value === undefined) return;

	console.time("total");
	try {
		const res = pixelateImageData(
			inputImageData.value,
			inputPalette.value,
			outputSize.height, 
			outputSize.width,
			paletteSize.value,
			threshold.value,
			sensitivity.value,
			doDithering.value,
		);

		outputImageDatas.output = res.output;
		outputImageDatas.edge = res.edge;
		outputImageDatas.edgeness = res.edgeness;
		outputImageDatas.palette = res.palette;
	}
	finally {
		console.timeEnd("total");
	}
}

const handleHeightChange = (event: Event) => {
	if (inputImageData.value === undefined) return;
	if (event.target && event.target instanceof HTMLInputElement) {
		outputSize.height = Number(event.target.value);

		const [height, width] = [inputImageData.value.height, inputImageData.value.width];
		outputSize.width = Math.ceil(outputSize.height * width / height);
	}
}

const handleWidthChange = (event: Event) => {
	if (inputImageData.value === undefined) return;
	if (event.target && event.target instanceof HTMLInputElement) {
		outputSize.width = Number(event.target.value);

		const [height, width] = [inputImageData.value.height, inputImageData.value.width];
		outputSize.height = Math.ceil(outputSize.width * height / width);
	}
}

const handlePaletteSizeChange = (event: Event) => {
	if (event.target && event.target instanceof HTMLInputElement) {
		paletteSize.value = Number(event.target.value);
	}
}

const handleThresholdChange = (event: Event) => {
	if (event.target && event.target instanceof HTMLInputElement) {
		threshold.value = Number(event.target.value);
	}
}

const handleSensitiviyChange = (event: Event) => {
	if (event.target && event.target instanceof HTMLInputElement) {
		sensitivity.value = Number(event.target.value);
	}
}

</script>

<template>
	<div class="pixelator-container">
		<div class="transformer-container">
			<Tab>
				<div class="before-container">
					<TabItem tabName="원본 이미지">
						<ImageUploadBox 
							@uploadFile="handleUpload"
							@cancel="inputImageData=undefined"
						/>
					</TabItem>
					<TabItem tabName="팔레트">
						<ImageUploadBox 
							@uploadFile="handleUploadPalette"
							@cancel="inputPalette=undefined"
						/>
					</TabItem>
				</div>
			</Tab>

			<div class="pixelation-container">
				<ArrowIcon></ArrowIcon>
				<button @click="handleTransform">픽셀화</button>
				<button @click="handleTest">테스트</button>
			</div>

			<Tab>
				<div :class="['after-container', expanded ? 'expanded' : '']">
					<TabItem tabName="output">
						<CanvasWithImageData
							v-if="outputImageDatas.output"
							:imageData="outputImageDatas.output"
							@click="expanded = !expanded"
						>
						</CanvasWithImageData>
					</TabItem>

					<TabItem tabName="edge">
						<CanvasWithImageData
							v-if="outputImageDatas.edge"
							:imageData="outputImageDatas.edge"
							@click="expanded = !expanded"
						>
						</CanvasWithImageData>
					</TabItem>

					<TabItem tabName="edge-resized">
						<CanvasWithImageData
							v-if="outputImageDatas.edgeness"
							:imageData="outputImageDatas.edgeness"
							@click="expanded = !expanded"
						>
						</CanvasWithImageData>
					</TabItem>

					<TabItem tabName="palette">
						<CanvasWithImageData
							v-if="outputImageDatas.palette"
							:imageData="outputImageDatas.palette"
							@click="expanded = !expanded"
						>
						</CanvasWithImageData>
					</TabItem>
				</div>
			</Tab>
		</div>

		<div class="input-container">
			<div class="input-sector"> 
				<span>출력 설정</span>
				<InputAndSlider 
					:value="outputSize.height"
					:min="1"
					:max="maxSize.height"
					@change="handleHeightChange"
				>
					높이(px)
				</InputAndSlider>
				<InputAndSlider 
					:value="outputSize.width"
					:min="1"
					:max="maxSize.width"
					@change="handleWidthChange"
				>
					너비(px)
				</InputAndSlider>
				<InputAndSlider 
					v-if="inputPalette===undefined"
					:value="paletteSize"
					:min="0"
					:max="128"
					@change="handlePaletteSizeChange"
				>
					팔레트 크기 (0일시 색 압축 미사용)
				</InputAndSlider>

				<div class="checkbox-container">
					<div>
						<label for="dithering">디더링</label>
						<input type="checkbox" id="dithering" v-model="doDithering">
					</div>
				</div>
			</div>

			<div class="vertical-divider"></div>

			<div class="input-sector">
				<span>엣지 설정</span>
				<InputAndSlider 
					:value="threshold"
					:min="0"
					:max="1"
					:step="0.01"
					@change="handleThresholdChange"
				>
					임계값
				</InputAndSlider>

				<InputAndSlider 
					:value="sensitivity"
					:min="0"
					:max="100"
					:step="1"
					@change="handleSensitiviyChange"
				>
					민감도
				</InputAndSlider>
			</div>
		</div>
	</div>
</template>

<style scoped>

.pixelator-container {
	border: 1px solid lightgray;
	border-radius: 10px;
	padding: 20px;
}

.transformer-container {
	display: flex;
	align-items: center;
	gap: 10px;

	svg {
		width: 100px;
		height: 100px;
		fill: lightgray;
	}
}

.before-container {
	width: 350px;
	height: 350px;
}

.after-container {
	display: flex;
	align-items: center;
	justify-content: center;

	width: 350px;
	height: 350px;
	padding: 10px;
	margin: 0;
	border: 2px dashed lightgray;
	border-radius: 10px;

	canvas {
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;

		margin: 0 auto;
	}
}

.pixelation-container {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 10px;

	button {
		background-color: lightgray;
		color: white;
	}
}

.palette-container {
	height: 100%;
	width: 100%;

	canvas {
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;

		margin: 0 auto;
	}
}

.after-container.expanded {
	position: fixed;
	left: 0;
	top: 0;

	width: 100vw;
	height: 100vh;
	padding: 0;
	border: none;
	border-radius: 0;

	background-color: black;
}

.input-container {
	display: flex;

	border: 1px solid lightgray;
	border-radius: 10px;

	padding: 20px;
	margin-top: 20px;

	gap: 20px;
}

.input-sector {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10px;

	span {
		font-size: 1.1rem;
		font-weight: 600;
	}
}

.checkbox-container {
	display: flex;
	justify-content: end;
	gap: 10px;
}

.vertical-divider {
	border: 1px dashed lightgray;
}

</style>
