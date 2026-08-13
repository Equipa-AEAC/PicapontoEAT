<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { Chart, type ChartData, type ChartOptions, type ChartType } from "chart.js";
import "../../utils/chart";

const props = defineProps<{
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const chartInstance = shallowRef<Chart | null>(null);

onMounted(() => {
  if (!canvasRef.value) {
    return;
  }
  chartInstance.value = new Chart(canvasRef.value, {
    type: props.type,
    data: props.data,
    options: props.options,
  });
});

watch(
  () => [props.data, props.options],
  () => {
    if (!chartInstance.value) {
      return;
    }
    chartInstance.value.data = props.data;
    if (props.options) {
      chartInstance.value.options = props.options;
    }
    chartInstance.value.update();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  chartInstance.value?.destroy();
});
</script>

<template>
  <canvas ref="canvasRef" class="base-chart" />
</template>

<style scoped>
.base-chart {
  width: 100%;
  height: 100%;
}
</style>
