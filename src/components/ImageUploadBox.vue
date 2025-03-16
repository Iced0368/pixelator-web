<script setup lang="ts">
import { ref } from 'vue';
import UploadSign from '../assets/upload-sign.svg';

const isDragging = ref(false);
const uploadedFile = ref<File>();
const imageSrc = ref("");

const emit = defineEmits();

const handleDragOver = (event: Event) => {
    event.preventDefault();
}

const handleUploadFromDrop = (event: DragEvent) => {
    event.preventDefault();
    isDragging.value = false;

    if (event.dataTransfer) {
        const file = event.dataTransfer.files[0];

        if (file.type.startsWith("image")) {
            readImageAsData(file);
            uploadedFile.value = file;
        }
    }
}

const handleUploadFromInput = (event: Event) => {
    event.preventDefault();
    isDragging.value = false;

    if (event.target) {
        const target = event.target as HTMLInputElement;
        if (target.files) {
            const file = target.files[0];

            if (file.type.startsWith("image")) {
                readImageAsData(file);
                uploadedFile.value = file;
            }
        }
    }
}

const readImageAsData = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        imageSrc.value = reader.result as string;
        emit("uploadFile", reader.result);
    }
    reader.readAsDataURL(file);
}

const handleCancel = () => {
    uploadedFile.value = undefined;
    emit("cancel");
}

</script>

<template>
    <div class="uploadbox-container">
        <label
            :class="isDragging ? 'file-hover' : ''"
            @dragenter="isDragging=true"
            @dragleave="isDragging=false"
            @dragover="handleDragOver"
            @drop="handleUploadFromDrop"
        >
            <input type="file"
                @change="handleUploadFromInput"
            >
        </label>

        <div
            v-if="uploadedFile === undefined"
            class="not-uploaded-sign"
        >
            <UploadSign></UploadSign>
            <strong>
                <div>이미지 파일을 업로드하세요</div>
                <div>(.jpg, .jpeg, .png, .webp)</div>
            </strong>
        </div>
        <div 
            v-else
            class="file-info"
        >   
            <img :src="imageSrc">
            <button @click="handleCancel">X</button>
        </div>

    </div>
</template>

<style scoped>

.uploadbox-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    width: 100%;
    height: 100%;

    label {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 2px dashed lightgray;
        border-radius: 10px;

        input {
            display: none;
        }
    }

    label:hover {
        border: 2px dashed gray;
        cursor: pointer;
    }

    .file-hover {
        border: 2px dashed gray;
        background-color: rgba(0, 0, 0, 0.1);
    }

    .not-uploaded-sign {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        row-gap: 20px;

        width: 100%;
        height: 100%;

        svg {
            width: 30%;
            height: 30%;
            fill: lightgray;
        }
        div {
            color: lightgray;
        }
    }

    .file-info {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;

        width: 100%;
        height: 100%;
        padding: 10px;

        img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            image-rendering: pixelated;

            margin: 0 auto;
        }

        button {
            position: absolute;
            opacity: 0;
            top: 0;
            right: 0;

            transition: 0.2s opacity;
        }
    }

    .file-info:hover {
        button {
            opacity: 1;
        }
    }

    label:hover + div,
    .file-hover + div {
        svg {
            fill: gray;
        }
        div {
            color: gray;
        }
    }
}


</style>