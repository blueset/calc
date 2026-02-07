import { ViewPlugin, ViewUpdate, EditorView, DecorationSet } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { Line } from "@codemirror/state";

export interface LinePosition {
  line: number;
  top: number;
  height: number;
}

function isFolded(foldRanges: DecorationSet, line: Line): boolean {
  let folded = false;
  foldRanges.between(line.from, line.to, () => {
    folded = true;
  });
  return folded;
}

type PositionCallback = (
  positions: LinePosition[],
  contentHeight: number,
) => void;

export function resultAlignPlugin(callback: PositionCallback) {
  return ViewPlugin.fromClass(
    class {
      constructor(private view: EditorView) {
        this.update();
      }

      update(update?: ViewUpdate) {
        if (
          update &&
          !update.docChanged &&
          !update.viewportChanged &&
          !update.geometryChanged
        ) {
          return;
        }
        this.measure();
      }

      measure() {
        const { doc } = this.view.state;
        const foldRanges = foldedRanges(this.view.state);
        const positions: LinePosition[] = [];

        for (let i = 1; i <= doc.lines; i++) {
          const line = doc.line(i);
          const block = this.view.lineBlockAt(line.from);
          positions.push({
            line: i,
            top: block.top,
            height: isFolded(foldRanges, line) ? 0 : block.height,
          });
        }

        const contentHeight = this.view.contentDOM.offsetHeight;
        callback(positions, contentHeight);
      }
    },
    {
      eventHandlers: {
        scroll() {
          // Re-measure on scroll for viewport changes
        },
      },
    },
  );
}
