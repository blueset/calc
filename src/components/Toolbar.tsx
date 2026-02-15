import { Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AboutDialog } from "./AboutDialog";
import { APP_NAME } from "@/constants";
import { DemoModeBadge } from "./DemoModeBadge";
import { Kbd, KbdGroup } from "./ui/kbd";
import { CmdCtrl } from "./ui/cmd-ctrl";

interface ToolbarProps {
  onSettingsClick: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  exchangeRatesVersion?: string;
  isInDemoMode?: boolean;
  onEnterDemoMode?: () => void;
  onExitDemoMode?: () => void;
}

export function Toolbar({
  onSettingsClick,
  theme,
  onThemeToggle,
  exchangeRatesVersion,
  isInDemoMode,
  onEnterDemoMode,
  onExitDemoMode,
}: ToolbarProps) {
  return (
    <div className="px-4 border-border border-b">
      <div className="flex justify-between items-center mx-auto w-full max-w-4xl h-12 shrink-0">
        <div className="flex flex-row gap-2">
          <span className="font-semibold text-sm tracking-tight">
            {APP_NAME}
          </span>
          {isInDemoMode && <DemoModeBadge onExitDemoMode={onExitDemoMode} />}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <AboutDialog
                    exchangeRatesVersion={exchangeRatesVersion}
                    onEnterDemoMode={onEnterDemoMode}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>About</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onThemeToggle}>
                  {theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onSettingsClick}>
                  <Settings className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Settings{" "}
                <KbdGroup>
                  <CmdCtrl />
                  <Kbd>,</Kbd>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
