import { ref } from "vue";

export const currentLang = ref<"zh" | "en">("zh");
export const translations = ref<Record<string, any>>({});

export function t(key: string) {
  return translations.value[key]?.[currentLang.value] || key;
}