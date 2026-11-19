<template>
  <div class="form-section" :class="{ 'form-section--collapsible': collapsible, 'form-section--collapsed': isCollapsed }">
    <div 
      class="form-section-header" 
      :class="{ 'form-section-header--clickable': collapsible }"
      @click="collapsible && toggleCollapse()"
    >
      <h4 class="form-section-title">
        <i v-if="icon" :class="icon" class="form-section-icon"></i>
        {{ title }}
      </h4>
      <i 
        v-if="collapsible" 
        class="form-section-toggle-icon pi" 
        :class="isCollapsed ? 'pi-chevron-right' : 'pi-chevron-down'"
      ></i>
    </div>
    
    <Transition name="form-section-content" mode="out-in">
      <div v-if="!isCollapsed" class="form-section-content">
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  /** セクションタイトル */
  title: string;
  /** アイコンクラス */
  icon?: string;
  /** 折り畳み可能かどうか */
  collapsible?: boolean;
  /** 初期折り畳み状態 */
  collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  collapsible: false,
  collapsed: false
});

interface Emits {
  /** 折り畳み状態変更時 */
  (e: 'toggle', collapsed: boolean): void;
}

const emit = defineEmits<Emits>();

const localCollapsed = ref(props.collapsed);

const isCollapsed = computed(() => {
  return props.collapsible ? localCollapsed.value : false;
});

function toggleCollapse() {
  if (!props.collapsible) return;
  
  localCollapsed.value = !localCollapsed.value;
  emit('toggle', localCollapsed.value);
}
</script>

<style scoped>
.form-section {
  margin-bottom: var(--app-spacing-lg);
}

.form-section:not(:last-child) {
  border-bottom: 1px solid var(--app-surface-border);
  padding-bottom: var(--app-spacing-lg);
}

.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--app-spacing-base);
}

.form-section-header--clickable {
  cursor: pointer;
  user-select: none;
  padding: var(--app-spacing-xs);
  margin: calc(-1 * var(--app-spacing-xs)) calc(-1 * var(--app-spacing-xs)) var(--app-spacing-base);
  border-radius: var(--app-border-radius);
  transition: background-color var(--app-transition-fast);
}

.form-section-header--clickable:hover {
  background-color: var(--app-surface-100);
}

.form-section-title {
  margin: 0;
  font-size: var(--app-font-size-lg);
  font-weight: 600;
  color: var(--app-text-color);
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
}

.form-section-icon {
  color: var(--app-primary-color);
  font-size: 1.1rem;
}

.form-section-toggle-icon {
  color: var(--app-text-color-secondary);
  font-size: var(--app-font-size-sm);
  transition: transform var(--app-transition-fast);
}

.form-section--collapsed .form-section-toggle-icon {
  transform: rotate(0deg);
}

.form-section-content {
  overflow: hidden;
}

/* Transition animations */
.form-section-content-enter-active,
.form-section-content-leave-active {
  transition: all 0.3s ease;
}

.form-section-content-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.form-section-content-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.form-section-content-enter-to,
.form-section-content-leave-from {
  opacity: 1;
  max-height: 1000px;
  transform: translateY(0);
}
</style>