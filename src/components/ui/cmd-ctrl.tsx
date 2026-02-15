import { Kbd } from "./kbd";

export function CmdCtrl() {
  if (navigator.platform.includes("Mac")) {
    return <Kbd>⌘</Kbd>;
  } else {
    return <Kbd>Ctrl</Kbd>;
  }
}
