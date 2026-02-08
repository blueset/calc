import { APP_NAME } from "@/constants";
import { Badge } from "./ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Button } from "./ui/button";

interface DemoModeBadgeProps {
  onExitDemoMode?: () => void;
}

export function DemoModeBadge({ onExitDemoMode }: DemoModeBadgeProps) {
  return (
    <HoverCard openDelay={0}>
      <HoverCardTrigger asChild>
        <Badge
          className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
          render={<button>Demo mode</button>}
        />
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="space-y-4">
        <p>Demo mode showcases features of {APP_NAME} in a guided tour.</p>
        <p>
          Changes made here <strong>will not affect</strong> your original
          document, and <strong>will be discarded</strong> when you exit demo
          mode.
        </p>
        <Button onClick={onExitDemoMode}>Return to {APP_NAME}</Button>
      </HoverCardContent>
    </HoverCard>
  );
}
