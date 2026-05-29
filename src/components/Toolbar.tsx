import { useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Share2,
  EllipsisVertical,
  Download,
  Upload,
  Info,
  CircleQuestionMark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { CmdCtrl } from "@/components/ui/cmd-ctrl";
import { useSettings } from "@/hooks/useSettings";
import type { SettingsState } from "@/hooks/useSettings";
import { AboutDialog } from "./AboutDialog";
import { APP_NAME } from "@/constants";
import { DemoModeBadge } from "./DemoModeBadge";
import { PreviewModeBadge } from "./PreviewModeBadge";
import type { AppMode } from "@/lib/share";

interface ToolbarProps {
  mode: AppMode;
  onSettingsClick: () => void;
  exchangeRatesVersion?: string;
  onShare: () => void;
  onImport: () => void;
  onExport: (withResults: boolean) => void;
  onEnterDemoMode?: () => void;
  onExitDemoMode?: () => void;
  onPreviewReturn?: () => void;
  onPreviewBackupOverwrite?: () => void;
  onPreviewOverwrite?: () => void;
}

export function Toolbar({
  mode,
  onSettingsClick,
  exchangeRatesVersion,
  onShare,
  onImport,
  onExport,
  onEnterDemoMode,
  onExitDemoMode,
  onPreviewReturn,
  onPreviewBackupOverwrite,
  onPreviewOverwrite,
}: ToolbarProps) {
  const { settings, updateSetting } = useSettings();
  const [aboutOpen, setAboutOpen] = useState(false);
  const isDemo = mode === "demo";

  return (
    <div className="px-4 border-border border-b">
      <div className="flex justify-between items-center mx-auto w-full max-w-4xl h-12 shrink-0">
        <div className="flex flex-row gap-2">
          <span className="font-semibold text-sm tracking-tight">
            {APP_NAME}
          </span>
          {isDemo && <DemoModeBadge onExitDemoMode={onExitDemoMode} />}
          {mode === "preview" && (
            <PreviewModeBadge
              onReturn={onPreviewReturn}
              onBackupOverwrite={onPreviewBackupOverwrite}
              onOverwrite={onPreviewOverwrite}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {!isDemo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onShare}>
                    <Share2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>
            )}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon">
                          <EllipsisVertical className="size-4" />
                        </Button>
                      }
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>More</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                {!isDemo && (
                  <DropdownMenuItem onClick={onImport}>
                    <Upload className="size-4" />
                    Import…
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Download className="size-4" />
                    Export
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem onClick={() => onExport(true)}>
                      With results
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExport(false)}>
                      Without results
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                  <Info className="size-4" />
                  About
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEnterDemoMode}>
                  <CircleQuestionMark className="size-4" />
                  Learn more…
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {settings.theme === "dark" ? (
                      <Moon className="size-4" />
                    ) : settings.theme === "light" ? (
                      <Sun className="size-4" />
                    ) : (
                      <Monitor className="size-4" />
                    )}
                    Theme
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    <DropdownMenuRadioGroup
                      value={settings.theme}
                      onValueChange={(val) =>
                        updateSetting("theme", val as SettingsState["theme"])
                      }
                    >
                      <DropdownMenuRadioItem value="light">
                        <Sun className="size-4" />
                        Light
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        <Moon className="size-4" />
                        Dark
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system">
                        <Monitor className="size-4" />
                        System
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={onSettingsClick}>
                  <Settings className="size-4" />
                  Settings
                  <DropdownMenuShortcut>
                    <KbdGroup>
                      <CmdCtrl />
                      <Kbd>,</Kbd>
                    </KbdGroup>
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </div>
      <AboutDialog
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        exchangeRatesVersion={exchangeRatesVersion}
        onEnterDemoMode={onEnterDemoMode}
      />
    </div>
  );
}
