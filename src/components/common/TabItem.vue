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
    <slot v-if="activeTabIndex === tabIndex"></slot>
</template>

<style scoped>
</style>