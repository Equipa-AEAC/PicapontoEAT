import { computed, ref } from "vue";
import { defineStore } from "pinia";

export const useNavigationStore = defineStore("navigation", () => {
  const isSidebarCollapsed = ref(false);
  const isSidebarExpanded = computed(() => !isSidebarCollapsed.value);

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
  }

  function expandSidebar() {
    isSidebarCollapsed.value = false;
  }

  return {
    isSidebarCollapsed,
    isSidebarExpanded,
    toggleSidebar,
    expandSidebar,
  };
});