<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
    value?: number
    min?: number
    max?: number
    step?: number
}>();

const value = ref(props.value);
watch(() => props.value, newVal => value.value= newVal);

const emit = defineEmits();

const handleOnChange = (event: Event) => {
    emit("change", event);
}

</script>

<template>
    <div class="input-slider-container">
        <div class="label-input-container">
            <label>
                <slot></slot>
            </label>
            <input 
                type="number" 
                v-model="value" 
                @change="handleOnChange"
            >
        </div>
        <input 
            type="range" 
            v-model="value"
            @change="handleOnChange"
            :min="min"
            :max="max"
            :step="step"
        >
    </div>
</template>

<style scoped>

.input-slider-container {
    .label-input-container {
        display: flex;
        justify-content: space-between;

        input[type="number"] {
            width: 100px;
            border: 1px solid lightgray;
            border-radius: 5px;
        }
    }

    input[type="range"] {
        width: 100%;
    }
}

</style>