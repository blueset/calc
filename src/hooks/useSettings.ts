import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { Settings } from "@/calculator/settings";
import { defaultSettings } from "@/calculator/settings";

const STORAGE_KEY = "calc-settings";

export interface SettingsState extends Settings {
  debugMode: boolean;
  debounce: boolean;
}

export interface SettingsContextValue {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

function loadSettings(): SettingsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return {
        ...defaultSettings,
        debugMode: false,
        debounce: false,
        ...JSON.parse(stored),
      };
    }
  } catch (e) {
    console.error("Failed to load settings, using defaults", e);
  }
  return { ...defaultSettings, debugMode: false, debounce: false };
}

function saveSettings(settings: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}

export function useSettingsState(): SettingsContextValue {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return { settings, updateSetting };
}
