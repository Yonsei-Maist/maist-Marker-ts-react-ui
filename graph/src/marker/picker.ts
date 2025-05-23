import BaseMode from "./base";
import Plotly from "plotly.js";

/**
 * PickerMode
 * ----------
 * Modebar button that lets the user click **one** data point and
 * instantly annotates it on the graph.
 */
export default class PickerMode extends BaseMode<number> {
    /** index of the last added pick trace */
    private lastTraceIndex: number | null = null;

    constructor() {
        // simple flag icon
        super('Picker', 'Picker', "AdsClick");
    }

    /** Toggle picker mode and handle click events only when active */
    click(gd: Plotly.PlotlyHTMLElement, evt: Plotly.PlotMouseEvent): void {
        // Determine if picker mode is currently active(event: Plotly.PlotMouseEvent) => void)
        // Remove previous picked trace if exists
        const pt = evt.points?.[0];
        if (!pt) return;

        const newX = pt.x.valueOf() as number;
        const newY = pt.y.valueOf() as number;
        if (this.value && this.value[0] == newX && this.value[1] == newY) {
            this.value = undefined;
        } else {
            // Store selected point
            this.value = newX;
        }

        this.toGraph(gd);
    }

    toGraph(gd: Plotly.PlotlyHTMLElement) {
        // Return a scatter trace for the currently picked point, or null if none.
        if (this.lastTraceIndex !== null) {
            Plotly.deleteTraces(gd, this.lastTraceIndex);
            this.lastTraceIndex = null;
        }

        if (!this.value) return null;

        const x = this.value;
        const trace = {
            x: [x],
            y: [this.originData[x]],
            type: "scatter",
            mode: "markers",
            marker: {
                color: "#ffa15a",           // highlight color
                size: 14,                   // same as highlight size
                line: { color: "#636efa", width: 2 },
            },
            name: "Picked Point",
        } as Plotly.Data;

        const newIndex = gd.data.length;
        Plotly.addTraces(gd, [trace]);
        this.lastTraceIndex = newIndex;
    }
}