import React from "react";
import { AxiosInstance } from "axios";
import { Map, View } from "ol";
import { useEffect } from "react";
import ImageCanvasSource from "ol/source/ImageCanvas";
import ImageLayer from "ol/layer/Image";


import { useReaderAddon, fitSize, DRAW_OBJECT } from "@yonsei-maist/react-maist-marker";
import pdfReader, { PDFObject } from "../reader/pdfReader";
import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

interface PDFData { 
    pdf: PDFDocumentProxy; 
    pages: PDFPageProxy[];
}

function PdfReader() {
    const { registerReaderAddon } = useReaderAddon();

    async function getFile(buffer: ArrayBuffer) {
        const pdf = await pdfReader(buffer);

        const numPages = pdf.numPages;
        let pageIter: number[] = [];
        for (let i = 1; i < numPages + 1; i++) {
            pageIter.push(i);
        }

        const pageNumbers = pageIter;
        // Start reading all pages 1...numPages
        const promises = pageNumbers.map(pageNo => pdf.getPage(pageNo));
        // Wait until all pages have been read
        const pages = await Promise.all(promises);

        return {
            result: pdf && pages ? "success" : "fail",
            data: {
                pdf,
                pages
            } as PDFData
        }
    }

    const parser = (map: Map, path: string, data: PDFData, axiosInstance?: AxiosInstance) => {
        const pages = data.pages;
        const page = pages[0];

        var viewport = page.getViewport({ scale: 1, });

        let newSize = fitSize(viewport.width, viewport.height);

        let source = new ImageCanvasSource({
            canvasFunction: (extent, resolutions, pixelRatio, size, projection) => {
                const pdfObject = map.get(DRAW_OBJECT) as PDFObject;

                if (pdfObject.redrawingCanvas == undefined) {
                    pdfObject.redrawingCanvas = document.createElement("canvas");
                    pdfObject.redrawingCanvas.width = size[0];
                    pdfObject.redrawingCanvas.height = size[1];
                    pdfObject.redrawingContext = pdfObject.redrawingCanvas.getContext('2d') || {} as CanvasRenderingContext2D;
                } else {
                    pdfObject.redrawingCanvas.width = size[0];
                    pdfObject.redrawingCanvas.height = size[1];
                    pdfObject.redrawingContext.clearRect(0, 0, size[0], size[1]);
                }

                var canvasOrigin = map.getPixelFromCoordinate([extent[0], extent[3]]);
                var mapExtent = map.getView().calculateExtent(map.getSize())
                var mapOrigin = map.getPixelFromCoordinate([mapExtent[0], mapExtent[3]]);
                var delta = [mapOrigin[0] - canvasOrigin[0], mapOrigin[1] - canvasOrigin[1]]

                var a1 = map.getPixelFromCoordinate([0, 0]);
                var a2 = map.getPixelFromCoordinate([newSize[0], newSize[1]]);

                pdfObject.retouchX = Math.round((a1[0] + delta[0]) * pixelRatio);
                pdfObject.retouchY = Math.round((a1[1] + delta[1]) * pixelRatio);
                pdfObject.retouchWidth = Math.round(Math.abs(a2[0] - a1[0]) * pixelRatio);
                pdfObject.retouchHeight = Math.round(Math.abs(a1[1] - a2[1]) * pixelRatio);
                pdfObject.retouch();

                return pdfObject.redrawingCanvas;
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

        let pdfObject = new PDFObject(data.pdf, data.pages, source);

        pdfObject.drawing();
        map.set(DRAW_OBJECT, pdfObject);

        return { layer, view }
    }

    useEffect(() => {
        registerReaderAddon({
            id: 'PdfReader',
            name: 'PdfReader',
            ext: ['pdf'],
            reader: getFile,
            parser: parser
        });

    }, []);
    return <></>;
}

export default PdfReader;