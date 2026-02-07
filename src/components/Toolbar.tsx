import { Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AboutDialog } from "./AboutDialog";
import { APP_NAME } from "@/constants";

interface ToolbarProps {
  onSettingsClick: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  exchangeRatesVersion?: string;
}

export function Toolbar({
  onSettingsClick,
  theme,
  onThemeToggle,
  exchangeRatesVersion,
}: ToolbarProps) {
  return (
    <div className="flex justify-between items-center px-4 border-border border-b h-12 shrink-0">
      <span className="font-semibold text-sm tracking-tight">{APP_NAME}</span>
      <div className="flex items-center gap-1">
        <AboutDialog exchangeRatesVersion={exchangeRatesVersion} />
        <Button variant="ghost" size="icon" onClick={onThemeToggle}>
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );
}
