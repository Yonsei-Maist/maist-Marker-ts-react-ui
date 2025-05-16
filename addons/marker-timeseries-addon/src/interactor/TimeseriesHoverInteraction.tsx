import { MapBrowserEvent } from "ol";
import PointerInteraction from "ol/interaction/Pointer";
import ImageSource from "ol/source/Image";

/**
 * Displays a “hover index” on an ImageCanvasSource whenever the
 * pointer moves across the chart.  The index is stored on the source
 * as `hoverIndex` (number) so the canvasFunction can render a bullet
 * + guide line.
 */
class TimeseriesHoverInteraction extends PointerInteraction {
    private source: ImageSource;
    private seriesLength: number;
    private margin: number;
    private xStep: number;

    constructor(
        source: ImageSource,
        seriesLength: number,
        margin: number,
        xStep: number
    ) {
        super();
        this.source = source;
        this.seriesLength = seriesLength;
        this.margin = margin;
        this.xStep = xStep;

        // initial state
        (this.source as any).hoverIndex = -1;
    }

    handleMoveEvent(evt: MapBrowserEvent<UIEvent>): boolean {
        const xCoord = evt.coordinate[0]; // map coordinate system matches canvas x
        const idx = Math.round((xCoord - this.margin) / this.xStep);

        let next = -1;
        if (idx >= 0 && idx < this.seriesLength) next = idx;

        if ((this.source as any).hoverIndex !== next) {
            (this.source as any).hoverIndex = next;
            this.source.changed(); // trigger re‑render
        }
        return false; // no further handling needed
    }
}

export default TimeseriesHoverInteraction;