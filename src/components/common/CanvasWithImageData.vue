<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{
    imageData: ImageData,
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const updateImageData = (newVal: ImageData) => {
    if (canvasRef.value) {
        const canvas = canvasRef.value;
        canvas.width = newVal.width;
        canvas.height = newVal.height;

        const ctx = canvas.getContext("2d");
        ctx?.putImageData(newVal, 0, 0);
    }
}

onMounted(() => { updateImageData(props.imageData); });
watch(() => props.imageData, newVal => updateImageData(newVal));

</script>

<template>
    <canvas ref="canvasRef"></canvas>
</template>

<style scoped>
</style>