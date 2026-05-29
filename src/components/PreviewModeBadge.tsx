import { APP_NAME } from "@/constants";
import { Badge } from "./ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Button } from "./ui/button";

interface PreviewModeBadgeProps {
  onReturn?: () => void;
  onBackupOverwrite?: () => void;
  onOverwrite?: () => void;
}

export function PreviewModeBadge({
  onReturn,
  onBackupOverwrite,
  onOverwrite,
}: PreviewModeBadgeProps) {
  return (
    <HoverCard openDelay={0}>
      <HoverCardTrigger asChild>
        <Badge
          className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
          render={<button>Preview mode</button>}
        />
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="space-y-4">
        <p>
          You are viewing a <strong>shared worksheet</strong>. Changes you make
          here <strong>will not be saved</strong> to {APP_NAME}.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={onReturn}
            className="justify-start items-start h-auto min-h-9 py-2 text-left whitespace-normal"
          >
            Return to {APP_NAME} without saving
          </Button>
          <Button
            variant="outline"
            onClick={onBackupOverwrite}
            className="justify-start items-start h-auto min-h-9 py-2 text-left whitespace-normal"
          >
            Backup &amp; overwrite my worksheet
          </Button>
          <Button
            onClick={onOverwrite}
            className="justify-start items-start h-auto min-h-9 py-2 text-left whitespace-normal"
          >
            Overwrite without backup
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
