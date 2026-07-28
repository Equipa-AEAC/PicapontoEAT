import type { Component } from "vue";

export interface NavigationItem {
  name: string;
  path: string;
  label: string;
  description: string;
  icon: Component;
}