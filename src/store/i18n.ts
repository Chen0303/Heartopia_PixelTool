import { ref } from "vue";

export const currentLang = ref<"zh" | "zh-CN" | "en" | "ja">("zh");
export const translations = ref<Record<string, any>>({});

export function t(key: string) {
  return translations.value[key]?.[currentLang.value] || key;
}