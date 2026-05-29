import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export interface ImportConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeepExisting: () => void;
  onBackupOverwrite: () => void;
  onOverwrite: () => void;
}

export function ImportConflictDialog({
  open,
  onOpenChange,
  onKeepExisting,
  onBackupOverwrite,
  onOverwrite,
}: ImportConflictDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace your worksheet?</AlertDialogTitle>
          <AlertDialogDescription>
            You already have content in your worksheet. Choose what to do with
            the imported file.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-col sm:items-stretch sm:gap-2">
          <AlertDialogAction onClick={onBackupOverwrite}>
            Backup &amp; overwrite
          </AlertDialogAction>
          <AlertDialogAction variant="destructive" onClick={onOverwrite}>
            Overwrite without backup
          </AlertDialogAction>
          <AlertDialogCancel onClick={onKeepExisting}>
            Keep existing worksheet
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
