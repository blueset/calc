import { CircleQuestionMark, ExternalLink, Info } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { APP_NAME } from "@/constants";
import SimpleIconsGithub from "~icons/simple-icons/github";

export interface AboutDialogProps {
  exchangeRatesVersion?: string;
}

export function AboutDialog({ exchangeRatesVersion }: AboutDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon">
            <Info />
          </Button>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader className="gap-4 pt-4">
          <DialogTitle className="text-center">{APP_NAME}</DialogTitle>
          <DialogDescription className="text-center">
            A web notebook calculator.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div>
            Created by{" "}
            <Button
              variant="link"
              size="sm"
              className="-mx-2.5 text-sm"
              render={
                <a href="https://1a23.com/" target="_blank">
                  Eana Hufwe
                </a>
              }
            />{" "}
            in 2026.
          </div>
          <div className="text-muted-foreground text-center">
            Currency rate data:{" "}
            <Button
              variant="link"
              size="sm"
              className="-mx-2.5 text-sm"
              render={
                <a
                  href="https://github.com/fawazahmed0/exchange-api"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  fawazahmed0 <ExternalLink />
                </a>
              }
            />
            {exchangeRatesVersion && (
              <div className="ml-1">(updated on {exchangeRatesVersion})</div>
            )}
          </div>
          <div className="flex flex-row flex-wrap items-center gap-2">
            <Button
              variant="outline"
              render={
                <a
                  href="https://github.com/blueset/calc"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SimpleIconsGithub /> GitHub
                </a>
              }
            />
            <Button
              variant="outline"
              render={
                <a /* href={TODO} */ target="_blank" rel="noopener noreferrer">
                  <CircleQuestionMark /> Learn more
                </a>
              }
            />
          </div>
        </div>
        <DialogFooter className="justify-center sm:justify-center bg-transparent pb-8 border-t-0">
          <DialogClose render={<Button type="button">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
