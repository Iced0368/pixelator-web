<script setup lang="ts">
import { inject, onMounted, ref } from 'vue';


const props = defineProps<{
    tabName: string,
}>();

const tabIndex = ref(0);
const registerTab = inject<(tabName: string) => number>("registerTab");
const activeTabIndex = inject<number>("activeTabIndex");

onMounted(() => {
    if (registerTab)
        tabIndex.value = registerTab(props.tabName);
})

</script>

<template>
    <div v-show="activeTabIndex === tabIndex">
        <slot></slot>
    </div>
</template>

<style scoped>
div {
    width: 100%;
    height: 100%;
}
</style>