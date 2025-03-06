<script setup lang="ts">
import { provide, reactive, ref } from 'vue';

const tabItems = reactive<string[]>([]);
const activeTabIndex = ref<number>(0);

provide('registerTab', (tabName: string) => {
    return tabItems.push(tabName) - 1;
})

provide('activeTabIndex', activeTabIndex);

</script>

<template>
    <div class="tab-container">
        <nav class="tab-button-container">
            <div 
                v-for="(tabName, index) in tabItems"
                :class="['tab-button', activeTabIndex===index ? 'active' : '']"
                @click="activeTabIndex=index"
            >
                {{ tabName }}
            </div>
        </nav>
        <div class="tab-content-container">
            <slot></slot>
        </div>
    </div>
</template>

<style scoped>

.tab-container {
    border: 1px solid lightgray;
    border-radius: 5px;
}

.tab-content-container {
    padding: 5px;
}

.tab-button-container {
    display: flex;
    background-color: lightgray;

    .tab-button {
        padding: 5px 10px;
        cursor: pointer;

    }

    .tab-button.active {
        border-radius: 5px 5px 0 0;
        background-color: white;
    }
}

</style>