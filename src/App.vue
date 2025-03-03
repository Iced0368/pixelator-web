<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';
import { pixelateImageData } from './utils/transform';

import ImageUploadBox from './components/ImageUploadBox.vue';
import ArrowIcon from './assets/next-arrow.svg'
import InputAndSlider from './components/common/InputAndSlider.vue';

const dataURL = ref("");
const imageSrc = ref("");

const imageData = ref<ImageData>(new ImageData(1, 1));

const maxSize = reactive({height: 0, width: 0});
const outputSize = reactive({height: 0, width: 0});
const preserveRatio = ref(true);

const threshold = ref(0.2);


const handleUpload = (readerResult: string) => {
  dataURL.value = readerResult;
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    imageData.value = ctx.getImageData(0, 0, canvas.width, canvas.height);

    (async function() {
      maxSize.height = imageData.value.height;
      maxSize.width = imageData.value.width;

      await nextTick();

      outputSize.height = Math.ceil(imageData.value.height / 2);
      outputSize.width = Math.ceil(imageData.value.width / 2);
    })();
  }

  img.src = readerResult;
}

const handleTransform = () => {
  
  const convertedImageData = pixelateImageData(
    imageData.value, 
    outputSize.height, 
    outputSize.width,
    threshold.value,
  );

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  canvas.width = convertedImageData.width;
  canvas.height = convertedImageData.height;
  ctx.putImageData(convertedImageData, 0, 0);
  
  imageSrc.value = canvas.toDataURL();
}

const handleHeightChange = (event: Event) => {
  if (event.target && event.target instanceof HTMLInputElement) {
    outputSize.height = Number(event.target.value);

    if (preserveRatio.value) {
      const [height, width] = [imageData.value.height, imageData.value.width];
      outputSize.width = Math.ceil(outputSize.height * width / height);
    }
  }
}

const handleWidthChange = (event: Event) => {
  if (event.target && event.target instanceof HTMLInputElement) {
    outputSize.width = Number(event.target.value);

    if (preserveRatio.value) {
      const [height, width] = [imageData.value.height, imageData.value.width];
      outputSize.height = Math.ceil(outputSize.width * height / width);
    }
  }
}

const handleThresholdChange = (event: Event) => {
  if (event.target && event.target instanceof HTMLInputElement) {
    threshold.value = Number(event.target.value);
  }
}

</script>

<template>
  <div class="pixelator-container">
    <div class="transformer-container">
      <div class="before-container">
        <ImageUploadBox @uploadFile="handleUpload"/>
      </div>
      <ArrowIcon></ArrowIcon>
      <div class="after-container">
        <img v-if="imageSrc" :src="imageSrc"></img>
      </div>
    </div>

    <div class="input-container">
      <div class="output-size-container"> 
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

        <div class="checkbox-container">
          <label for="preserve-ratio">비율 유지</label>
          <input type="checkbox" id="preserve-ratio" v-model="preserveRatio">
        </div>
      </div>

      <div class="vertical-divider"></div>

      <div class="filter-container"> 
        <InputAndSlider 
          :value="threshold"
          :min="0"
          :max="1"
          :step="0.01"
          @change="handleThresholdChange"
        >
          임계값
        </InputAndSlider>
      </div>

    </div>

    <button @click="handleTransform">픽셀화</button>
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
  width: 300px;
  height: 300px;
}

.after-container {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 300px;
  height: 300px;
  padding: 10px;
  border: 2px dashed lightgray;
  border-radius: 10px;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;

    margin: 0 auto;
  }
}

.input-container {
  display: flex;

  border: 1px solid lightgray;
  border-radius: 10px;

  padding: 20px;
  margin-top: 20px;

  gap: 20px;
}

.output-size-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-container {
  display: flex;
  justify-content: end;
}

.vertical-divider {
  border: 1px dashed lightgray;
}

.filter-container {
  flex: 1;
}


</style>
