import React from "react";
import { Map, View } from "ol";
import ImageLayer from "ol/layer/Image";
import { useEffect } from "react";

import { ResultData, useReaderAddon } from "@yonsei-maist/react-maist-marker";
import ImageCanvasSource from "ol/source/ImageCanvas";

import TimeseriesHoverInteraction from "../interactor/TimeseriesHoverInteraction";

function TimeseriesReader() {
    const { registerReaderAddon } = useReaderAddon();

    // text file → "1 2 3 4" or "1,2,3,4" etc.
    const getFile = async (buffer: ArrayBuffer) => {
        const text = new TextDecoder().decode(buffer);
        const numbers = text
            .trim()
            .split(/[\s,]+/)     // split by whitespace or comma
            .map((v) => Number(v))
            .filter((v) => !Number.isNaN(v));

        return {
            result: numbers.length ? "success" : "fail",
            data: numbers as unknown as ResultData
        };
    };

    const parser = (map: Map, path: string, data: any) => {
        const series: number[] = data as number[];

        // canvas dimensions
        const WIDTH = Math.max(series.length, 300);
        const HEIGHT = 200;
        const MARGIN = 30;

        // y‑scale
        const min = Math.min(...series);
        const max = Math.max(...series);
        const yScale = (val: number) =>
            HEIGHT - MARGIN - ((val - min) / (max - min || 1)) * (HEIGHT - 2 * MARGIN);

        const xStep = (WIDTH - 2 * MARGIN) / (series.length - 1 || 1);

        const source = new ImageCanvasSource({
            canvasFunction: (_extent, _res, pixelRatio, size) => {
                const canvas = document.createElement("canvas");
                canvas.width = size[0];
                canvas.height = size[1];
                const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

                ctx.scale(pixelRatio, pixelRatio);

                // background
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                // axes
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1;
                // y‑axis
                ctx.beginPath();
                ctx.moveTo(MARGIN, MARGIN);
                ctx.lineTo(MARGIN, HEIGHT - MARGIN);
                ctx.stroke();
                // x‑axis
                ctx.beginPath();
                ctx.moveTo(MARGIN, HEIGHT - MARGIN);
                ctx.lineTo(WIDTH - MARGIN, HEIGHT - MARGIN);
                ctx.stroke();

                // series line
                ctx.strokeStyle = "#ff0000";
                ctx.lineWidth = 2;
                ctx.beginPath();
                series.forEach((val, idx) => {
                    const x = MARGIN + idx * xStep;
                    const y = yScale(val);
                    if (idx === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();

                return canvas;
            }
        });

        const layer = new ImageLayer({ source });
        layer.setExtent([0, -HEIGHT, WIDTH, 0]);

        const view = new View({
            center: [WIDTH / 2, -HEIGHT / 2],
            zoom: 1,
            constrainOnlyCenter: true
        });


        map.addInteraction(new TimeseriesHoverInteraction(source, series.length, 15, 10));
        return { layer, view };
    };

    useEffect(() => {
        registerReaderAddon({
            id: 'TimeseriesReader',
            name: 'TimeseriesReader',
            ext: ['txt'],
            reader: getFile,
            parser: parser
        });
    }, []);
    return <></>;
}

export default TimeseriesReader;