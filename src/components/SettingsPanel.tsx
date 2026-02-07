import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettings, type SettingsState } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { Temporal, Intl as TemporalIntl } from '@js-temporal/polyfill';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { settings, updateSetting } = useSettings();
  const demoSeparator = settings.digitGroupingSeparator === "" ? "·" : settings.digitGroupingSeparator;

  const dateFormat = new TemporalIntl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
  const temporalDate = Temporal.Now.plainDateISO();
  const { mmm, ddd, yyyy, dd } = dateFormat.formatToParts(temporalDate).reduce((acc, part) => {
    if (part.type === 'month') acc.mmm = part.value;
    if (part.type === 'weekday') acc.ddd = part.value;
    if (part.type === 'year') acc.yyyy = part.value;
    if (part.type === 'day') acc.dd = part.value;
    return acc;
  }, { mmm: '', ddd: '', yyyy: '', dd: '' });
  const mm = String(temporalDate.month).padStart(2, '0');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:xs:w-3/4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Configure calculator preferences</SheetDescription>
        </SheetHeader>

        <div className="space-y-1 px-4 pb-4">
          {/* UI Settings */}
          <h3 className="pt-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Appearance
          </h3>

          <SettingRow label="Theme">
            <ToggleGroup
              value={[settings.theme]}
              onValueChange={(val) => {
                if (val.length > 0)
                  updateSetting(
                    "theme",
                    val[val.length - 1] as SettingsState["theme"],
                  );
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="light">Light</ToggleGroupItem>
              <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
              <ToggleGroupItem value="system">System</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          <SettingRow label="Font Size">
            <ToggleGroup
              value={[settings.fontSize]}
              onValueChange={(val) => {
                if (val.length > 0)
                  updateSetting(
                    "fontSize",
                    val[val.length - 1] as SettingsState["fontSize"],
                  );
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="small">S</ToggleGroupItem>
              <ToggleGroupItem value="medium">M</ToggleGroupItem>
              <ToggleGroupItem value="large">L</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          <SettingRow label="Font">
            <Select
              value={settings.fontFamily}
              onValueChange={(val) => {
                if (val)
                  updateSetting(
                    "fontFamily",
                    val as SettingsState["fontFamily"],
                  );
              }}
            >
              <SelectTrigger size="sm">
                <SelectValue>
                  {(value) => (
                    <span
                      className={cn({
                        "font-mono": value === "monospace",
                        "font-sans": value === "sans-serif",
                        "font-serif": value === "serif",
                      })}
                    >
                      {value.replace(/^./, (char: string) =>
                        char.toUpperCase(),
                      )}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monospace" className="font-mono">
                  Monospace
                </SelectItem>
                <SelectItem value="sans-serif" className="font-sans">
                  Sans-serif
                </SelectItem>
                <SelectItem value="serif" className="font-serif">
                  Serif
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          {/* Number Settings */}
          <h3 className="pt-4 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Numbers
          </h3>

          <SettingRow label="Precision">
            <Select
              value={String(settings.precision)}
              onValueChange={(val) => {
                if (val) updateSetting("precision", Number(val));
              }}
            >
              <SelectTrigger size="sm">
                <SelectValue>{(value) => (value === "-1" ? "Auto" : value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Auto</SelectItem>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Angle Unit">
            <ToggleGroup
              value={[settings.angleUnit]}
              onValueChange={(val) => {
                if (val.length > 0)
                  updateSetting(
                    "angleUnit",
                    val[val.length - 1] as SettingsState["angleUnit"],
                  );
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="degree">Deg</ToggleGroupItem>
              <ToggleGroupItem value="radian">Rad</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          <SettingRow label="Decimal">
            <ToggleGroup
              value={[settings.decimalSeparator]}
              onValueChange={(val) => {
                if (val.length > 0)
                  updateSetting(
                    "decimalSeparator",
                    val[val.length - 1] as SettingsState["decimalSeparator"],
                  );
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value=".">.</ToggleGroupItem>
              <ToggleGroupItem value=",">,</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          <SettingRow label="Grouping">
            <Select
              value={settings.digitGroupingSeparator}
              onValueChange={(val) => {
                if (val != null)
                  updateSetting(
                    "digitGroupingSeparator",
                    val as SettingsState["digitGroupingSeparator"],
                  );
              }}
            >
              <SelectTrigger size="sm">
                <SelectValue>{(value) => (value === "" ? "None" : value === " " ? "Space" : value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value=" ">Space</SelectItem>
                <SelectItem value=",">Comma</SelectItem>
                <SelectItem value=".">Dot</SelectItem>
                <SelectItem value="′">Prime</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Group Size">
            <Select
              value={settings.digitGroupingSize}
              onValueChange={(val) => {
                if (val)
                  updateSetting(
                    "digitGroupingSize",
                    val as SettingsState["digitGroupingSize"],
                  );
              }}
            >
              <SelectTrigger size="sm">
                <SelectValue>{(value) => (value === "off" ? "Off" : `${value}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 <span className="text-muted-foreground">(1{demoSeparator}234{demoSeparator}567)</span></SelectItem>
                <SelectItem value="2-3">2-3 <span className="text-muted-foreground">(12{demoSeparator}34{demoSeparator}567)</span></SelectItem>
                <SelectItem value="4">4 <span className="text-muted-foreground">(1234{demoSeparator}5678)</span></SelectItem>
                <SelectItem value="off">Off <span className="text-muted-foreground">(12345678)</span></SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          {/* Date/Time Settings */}
          <h3 className="pt-4 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Date & Time
          </h3>

          <SettingRow label="Date Format">
            <Select
              value={settings.dateFormat}
              onValueChange={(val) => {
                if (val) updateSetting("dateFormat", val);
              }}
            >
              <SelectTrigger size="sm">
                <SelectValue>{(value) => {
                  switch (value) {
                    case "YYYY-MM-DD DDD":
                      return `${yyyy}-${mm}-${dd} ${ddd}`;
                    case "YYYY MMM DD DDD":
                      return `${yyyy} ${mmm} ${dd} ${ddd}`;
                    case "DDD DD MMM YYYY":
                      return `${ddd} ${dd} ${mmm} ${yyyy}`;
                    case "DDD MMM DD YYYY":
                      return `${ddd} ${mmm} ${dd} ${yyyy}`;
                    default:
                      return value;
                  }
                }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YYYY-MM-DD DDD">{yyyy}-{mm}-{dd} {ddd}</SelectItem>
                <SelectItem value="YYYY MMM DD DDD">{yyyy} {mmm} {dd} {ddd}</SelectItem>
                <SelectItem value="DDD DD MMM YYYY">{ddd} {dd} {mmm} {yyyy}</SelectItem>
                <SelectItem value="DDD MMM DD YYYY">{ddd} {mmm} {dd} {yyyy}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Time Format">
            <ToggleGroup
              value={[settings.timeFormat]}
              onValueChange={(val) => {
                if (val.length > 0)
                  updateSetting(
                    "timeFormat",
                    val[val.length - 1] as SettingsState["timeFormat"],
                  );
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="h23">24h</ToggleGroupItem>
              <ToggleGroupItem value="h12">12h</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          <SettingRow label="Date time Order">
            <ToggleGroup
              value={[settings.dateTimeFormat]}
              onValueChange={(val) => {
                if (val.length > 0)
                  updateSetting(
                    "dateTimeFormat",
                    val[val.length - 1] as SettingsState["dateTimeFormat"],
                  );
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="{date} {time}">Date Time</ToggleGroupItem>
              <ToggleGroupItem value="{time} {date}">Time Date</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          {/* Unit Settings */}
          <h3 className="pt-4 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Units
          </h3>

          <SettingRow label="Imperial units">
            <ToggleGroup
              value={[settings.imperialUnits]}
              onValueChange={(val) => {
                if (val.length > 0)
                  updateSetting(
                    "imperialUnits",
                    val[val.length - 1] as SettingsState["imperialUnits"],
                  );
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="us">US</ToggleGroupItem>
              <ToggleGroupItem value="uk">UK</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          {/* Debug */}
          <h3 className="pt-4 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Developer
          </h3>

          <SettingRow label="Debug Mode">
            <Switch
              checked={settings.debugMode}
              onCheckedChange={(checked) => updateSetting("debugMode", checked)}
            />
          </SettingRow>

          {settings.debugMode && (
            <SettingRow label="Debounce">
              <Switch
                checked={settings.debounce}
                onCheckedChange={(checked) =>
                  updateSetting("debounce", checked)
                }
              />
            </SettingRow>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
