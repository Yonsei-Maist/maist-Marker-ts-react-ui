import React from "react";
import { AxiosInstance } from "axios";
import { Map, View } from "ol";
import ImageLayer from "ol/layer/Image";
import { useEffect } from "react";

import dicomReader, { DicomObject } from "../reader/dicomReader";

import { ResultData, fitSize, useReaderAddon, MAP_MEMO, DRAW_OBJECT } from "@yonsei-maist/react-maist-marker";
import ImageCanvasSource from "ol/source/ImageCanvas";
import DicomRightMouseDrag from "../interactor/DicomRightMouseDrag";

function DicomReader() {
    const { registerReaderAddon } = useReaderAddon();

    const getFile = async (buffer: ArrayBuffer) => {
        const image = await dicomReader(buffer);

        return {
            result: image ? "success" : "fail",
            data: image as ResultData
        }
    }

    const parser = (map: Map, path: string, data: any, axiosInstance?: AxiosInstance) => {
        let dicomData = new DicomObject(data);

        map.set(DRAW_OBJECT, dicomData);
        let memo = map.get(MAP_MEMO);

        if (memo) {
            let windowInfo = JSON.parse(memo);

            if (windowInfo) {
                dicomData.ww = windowInfo.ww || dicomData.ww;
                dicomData.wc = windowInfo.wc || dicomData.wc;
            }
        }

        let newSize = fitSize(data.width, data.height);
        let source = new ImageCanvasSource({
            canvasFunction: (extent, resolutions, pixelRatio, size, projection) => {
                const dicomData = map.get(DRAW_OBJECT) as DicomObject;

                dicomData.drawing();
                if (dicomData.redrawingCanvas == undefined) {
                    dicomData.redrawingCanvas = document.createElement("canvas");
                    dicomData.redrawingCanvas.width = size[0];
                    dicomData.redrawingCanvas.height = size[1];
                    dicomData.redrawingContext = dicomData.redrawingCanvas.getContext('2d') || {} as CanvasRenderingContext2D;

                    dicomData.extent = extent;
                } else {
                    dicomData.redrawingCanvas.width = size[0];
                    dicomData.redrawingCanvas.height = size[1];
                    dicomData.redrawingContext.clearRect(0, 0, size[0], size[1]);
                }

                var canvasOrigin = map.getPixelFromCoordinate([extent[0], extent[3]]);
                var mapExtent = map.getView().calculateExtent(map.getSize())
                var mapOrigin = map.getPixelFromCoordinate([mapExtent[0], mapExtent[3]]);
                var delta = [mapOrigin[0] - canvasOrigin[0], mapOrigin[1] - canvasOrigin[1]]

                var a1 = map.getPixelFromCoordinate([0, 0]);
                var a2 = map.getPixelFromCoordinate([newSize[0], newSize[1]]);

                dicomData.retouchX = Math.round((a1[0] + delta[0]) * pixelRatio);
                dicomData.retouchY = Math.round((a1[1] + delta[1]) * pixelRatio);
                dicomData.retouchWidth = Math.round(Math.abs(a2[0] - a1[0]) * pixelRatio);
                dicomData.retouchHeight = Math.round(Math.abs(a1[1] - a2[1]) * pixelRatio);
                dicomData.retouch();

                source.setAttributions(['ww: ' + dicomData.ww.toFixed(5), ' wc: ' + dicomData.wc.toFixed(5)]);
                map.set(MAP_MEMO, JSON.stringify({ ww: dicomData.ww, wc: dicomData.wc }));

                return dicomData.redrawingCanvas;
            }
        });

        let layer = new ImageLayer({
            source: source
        });

        layer.setExtent([0, -newSize[1], newSize[0], 0]);

        let view = new View({
            center: [newSize[0] / 2, -newSize[1] / 2],
            constrainOnlyCenter: true,
            zoom: 6
        });

        map.addInteraction(new DicomRightMouseDrag(source));
        return { layer, view }
    }

    useEffect(() => {
        registerReaderAddon({
            id: 'DicomReader',
            name: 'DicomReader',
            ext: ['dcm'],
            reader: getFile,
            parser: parser
        });

    }, []);
    return <></>;
}

export default DicomReader;