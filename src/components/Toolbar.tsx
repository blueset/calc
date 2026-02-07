import { Settings, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToolbarProps {
  onSettingsClick: () => void
  theme: 'light' | 'dark'
  onThemeToggle: () => void
}

export function Toolbar({ onSettingsClick, theme, onThemeToggle }: ToolbarProps) {
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
      <span className="text-sm font-semibold tracking-tight">Calc</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onThemeToggle}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  )
}
