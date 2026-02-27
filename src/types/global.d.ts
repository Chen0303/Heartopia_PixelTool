export {};

declare global {
  interface Window {
    __TRANSLATIONS__: Record<string, any>;
  }
}