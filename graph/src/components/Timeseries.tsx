import { TimeseriesData } from "@/models";
import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js";
import { useModeAddon } from "@/providers/ModeAddonProvider";
import { GraphData } from "./GraphMarker";

interface TimeseriesProps {
    data: TimeseriesData;
    initValue: GraphData[];
}

export default function Timeseries({ data, initValue }: TimeseriesProps) {
    const plotRef = useRef<HTMLDivElement>(null);
    const { modeAddons, setGd } = useModeAddon();

    useEffect(() => {
        if (!plotRef.current) return;

        // Build the plot first
        Plotly.newPlot(
            plotRef.current,
            [
                {
                    x: new Array(data.value.length).fill(0).map((_, i) => i),
                    y: data.value,
                    type: "scatter",
                    mode: "lines",
                    line: { color: "#636efa", width: 2 },
                    marker: {
                        color: "#19d3f3",
                    },
                    name: "Timeseries Data",
                }
            ],
            {
                autosize: true,
                xaxis: {
                    rangeslider: { },
                },
                yaxis: { fixedrange: true },
            },
            {
                displaylogo: false,
                responsive: true,
                modeBarButtonsToRemove: [
                    "select2d",
                    "lasso2d",
                    "autoScale2d",
                    "resetScale2d",
                    "hoverClosestCartesian",
                    "hoverCompareCartesian",
                    "toggleSpikelines",
                    "toggleHover",
                    "toImage"
                ]
            }
        ).then((plot: Plotly.PlotlyHTMLElement) => {
            // ─── Hover effects: dashed guide line + bigger marker ───
            const baseSize = 8;
            const hoverSize = 12;
            modeAddons.forEach((o) => {
                o.item.markerMode.setOriginData(data.value);
                const init = initValue?.find(v => v.tool == o.item.name)?.value;
                if (init) {
                    o.item.markerMode.setValue(init)
                    o.item.markerMode.toGraph(plot);
                }
            })

            plot.on("plotly_relayout", (e) => {
                const update: any = {};
                const range = e["xaxis.range"] || e["xaxis.range[0]"];
                if (range) {
                    const [min, max] = Array.isArray(range) ? range : [e["xaxis.range[0]"], e["xaxis.range[1]"]];
                    const zoomed = (max.valueOf() as number) - (min.valueOf() as number) < 30;
                    if (zoomed) {
                        update["xaxis.tickmode"] = "linear";
                    } else {
                        update["xaxis.tickmode"] = "auto";
                    }
                    Plotly.relayout(plot, update);
                }
            });

            plot.on("plotly_doubleclick", () => {
                const update: any = {
                    "xaxis.tickmode": "auto"
                };

                Plotly.relayout(plot, update);
            });

            plot.on("plotly_hover", (evt: any) => {
                const pt = evt?.points?.[0];
                if (!pt) return;

                const traceIndex = pt.curveNumber;
                const pointIndex = pt.pointNumber;
                const xVal = pt.x;

                // 1) vertical dashed line at hovered x
                Plotly.relayout(plotRef.current as any, {
                    shapes: [
                        {
                            type: "line",
                            x0: xVal,
                            x1: xVal,
                            y0: 0,
                            y1: 1,
                            xref: "x",
                            yref: "paper",
                            line: { color: "#636efa", width: 1, dash: "dot" },
                        },
                    ],
                });

                // 2) enlarge only the hovered marker
                const sizes = new Array(data.value.length).fill(baseSize);
                sizes[pointIndex] = hoverSize;
                Plotly.restyle(
                    plotRef.current as any,
                    { "marker.size": [sizes] },
                    [traceIndex]
                );
            });

            // ─── Cleanup when mouse leaves point ───
            plot.on("plotly_unhover", () => {
                // remove guide line
                Plotly.relayout(plotRef.current as any, { shapes: [] });

                // reset all marker sizes
                Plotly.restyle(
                    plotRef.current as any,
                    { "marker.size": [baseSize] },
                    [0]
                );
            });

            setGd(plot);
        });

        // optional cleanup
        return () => {
            if (plotRef.current) {
                // remove the graph completely to avoid memory leaks
                Plotly.purge(plotRef.current);
            }
        };
    }, []);

    return <div ref={plotRef} style={{ width: "100%", height: "100%", flexGrow: 1 }} />;
}