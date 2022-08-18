import axios, { AxiosInstance } from "axios";
import { View, Map } from "ol";
import { getCenter } from "ol/extent";
import { Layer, Tile } from "ol/layer";
import ImageLayer from "ol/layer/Image";
import { Zoomify } from "ol/source";
import Static from "ol/source/ImageStatic";
import useAsync, { ReducerState } from "../hooks/useAsync";
import { ResponseMessage, ResultData } from "../models/response";
import dicomReader, { DicomObject, fitSize, HeaderString, isDicom } from "../lib/dicomReader";
import DicomRightMouseDrag, { DICOM_OBJECT } from "../components/marker/ui/interactor/DicomRightMouseDrag";

import sizeOf from 'buffer-image-size';
import ImageCanvasSource from "ol/source/ImageCanvas";
import { MAP_MEMO } from "../components/marker/context/MapContext";

import * as pdfjs from 'pdfjs-dist/webpack';
import PDFPageControl, { PDF_CURRENT_PAGE_NO, PDF_OBJECT } from "../components/marker/ui/controls/PDFPageControl";
import PDFObject, { isPDF } from "../lib/PDFObject";

interface SourceData {
    layer: Layer;
    view: View;
}

function parseDzi(map: Map, path:string, data:any, axiosInstance?: AxiosInstance) {
    var layer = new Tile();

    var last = path.lastIndexOf('.');
    var path = path.slice(0, last);

    var datStr = String.fromCharCode.apply(null, new Uint8Array(data));
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(datStr,'text/xml');

    var elements = xmlDoc.getElementsByTagName('Image');
    var tileSize = Number(elements[0].getAttribute('TileSize'));
    var format = elements[0].getAttribute('Format');
    var width = Number(elements[0].getElementsByTagName('Size')[0].getAttribute('Width'));
    var height = Number(elements[0].getElementsByTagName('Size')[0].getAttribute('Height'));
    var url = path + '_files/{z}/{x}_{y}.' + format;

    var offset = Math.ceil(Math.log(tileSize)/Math.LN2);

    const tileUrlFunction = (tileCoord:any) => {
        return url.replace(
            '{z}', tileCoord[0] + offset
        ).replace(
            '{x}', tileCoord[1]
        ).replace(
            '{y}', tileCoord[2]
        );
    }

    const tileLoadFunction = (image:any, src:any) => {
        (axiosInstance || axios.create()).get(src, { responseType: 'blob' })
        .then((res) => {
            const url = window.URL.createObjectURL(res.data);
            image.getImage().src = url;
        })
        .catch((err) => {
            console.log(err);
        });
    }

    var source = new Zoomify({
        url: url,
        size: [width, height],
        tileSize: tileSize,
        crossOrigin: "anonymous"
    });

    source.setTileUrlFunction(tileUrlFunction);
    source.setTileLoadFunction(tileLoadFunction);

    layer.setExtent([0, -height, width, 0]);
    layer.setSource(source);

    let view = new View({
        maxResolution: layer.getSource().getTileGrid().getResolutions()[0],
        extent: layer.getExtent(),
        constrainOnlyCenter: true,
        zoom: 2
    });
    view.fit(layer.getExtent() as number[], { size: map.getSize() });
    return {layer, view};
}

function parseImage(path: string, data: any, axiosInstance?: AxiosInstance) {

    const imageInfo = sizeOf(Buffer.from(data));

    let newSize = fitSize(imageInfo.width, imageInfo.height);
    
    let source = new Static({
        url: path,
        imageExtent: [0, -newSize[1], newSize[0], 0]
    });

    let layer = new ImageLayer({
        source: source
    });

    let view = new View({
        center: getCenter(source.getImageExtent()),
        // extent: source.getImageExtent(),
        constrainOnlyCenter: true,
        zoom: 6
    });
    
    return {layer, view}
}

function parseDicom(map: Map, path:string, data:any, axiosInstance?: AxiosInstance) {
    let dicomData = new DicomObject(data);

    map.set(DICOM_OBJECT, dicomData);
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
            const dicomData = map.get(DICOM_OBJECT) as DicomObject;
            
            dicomData.drawing();
            if (dicomData.redrawingCanvas == undefined) {
                dicomData.redrawingCanvas = document.createElement("canvas");
                dicomData.redrawingCanvas.width = size[0];
                dicomData.redrawingCanvas.height = size[1];
                dicomData.redrawingContext = dicomData.redrawingCanvas.getContext('2d');
                
                dicomData.extent = extent;
            }

            if (dicomData.extent[0] != extent[0]) {
                dicomData.redrawingContext.clearRect(0, 0, size[0], size[1]);
                dicomData.extent = extent;
            }

            var canvasOrigin = map.getPixelFromCoordinate([extent[0], extent[3]]);
            var mapExtent = map.getView().calculateExtent(map.getSize())
            var mapOrigin = map.getPixelFromCoordinate([mapExtent[0], mapExtent[3]]);
            var delta = [mapOrigin[0] - canvasOrigin[0], mapOrigin[1] - canvasOrigin[1]]
            
            var a1 = map.getPixelFromCoordinate([0, 0]);
            var a2 = map.getPixelFromCoordinate([newSize[0], newSize[1]]);

            dicomData.retouchX = Math.round((a1[0] + delta[0]) * pixelRatio);
            dicomData.retouchY = Math.round((a1[1] + delta[1]) * pixelRatio);
            dicomData.retouchWidth = Math.round(Math.abs(a2[0]-a1[0]) * pixelRatio);
            dicomData.retouchHeight = Math.round(Math.abs(a1[1]-a2[1]) * pixelRatio);
            dicomData.retouch();

            source.setAttributions(['ww: ' + dicomData.ww.toFixed(5), ' wc: ' + dicomData.wc.toFixed(5)]);
            map.set(MAP_MEMO, JSON.stringify({ww: dicomData.ww, wc: dicomData.wc}));

            return dicomData.redrawingCanvas;
        }
    });

    let layer = new ImageLayer({
        source: source
    });
    
    let view = new View({
        center: [newSize[0] / 2, -newSize[1] / 2],
        constrainOnlyCenter: true,
        zoom: 6
    });
    
    map.addInteraction(new DicomRightMouseDrag(source));
    return {layer, view}
}

function parsePDf(map: Map, path:string, data:any, axiosInstance?: AxiosInstance) {
    const pages = data.pages;
    const page = pages[0];
    
    var viewport = page.getViewport({ scale: 1, });

    let newSize = fitSize(viewport.width, viewport.height);
    
    let source = new ImageCanvasSource({
        canvasFunction: (extent, resolutions, pixelRatio, size, projection) => {
            const pdfObject = map.get(PDF_OBJECT) as PDFObject;

            if (pdfObject.redrawingCanvas == undefined) {
                pdfObject.redrawingCanvas = document.createElement("canvas");
                pdfObject.redrawingCanvas.width = size[0];
                pdfObject.redrawingCanvas.height = size[1];
                pdfObject.redrawingContext = pdfObject.redrawingCanvas.getContext('2d');
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
            pdfObject.retouchWidth = Math.round(Math.abs(a2[0]-a1[0]) * pixelRatio);
            pdfObject.retouchHeight = Math.round(Math.abs(a1[1]-a2[1]) * pixelRatio);
            pdfObject.retouch();

            return pdfObject.redrawingCanvas;
        }
    });

    let layer = new ImageLayer({
        source: source
    });
    
    let view = new View({
        center: [newSize[0] / 2, -newSize[1] / 2],
        constrainOnlyCenter: true,
        zoom: 6
    });
    
    let pdfObject = new PDFObject(data.pdf, data.pages, map, source);
    
    pdfObject.drawing();
    map.set(PDF_OBJECT, pdfObject);
    map.set(PDF_CURRENT_PAGE_NO, 1);
    
    return {layer, view}
}

export function makeLayer(map: Map, path:string, data:any, axiosInstance?: AxiosInstance): SourceData {
    if (path.indexOf(".dzi") > -1) {
        return parseDzi(map, path, data, axiosInstance);
    } else if (isDicom(path)) {
        return parseDicom(map, path, data, axiosInstance);
    } else if (isPDF(path)) {
        return parsePDf(map, path, data, axiosInstance);
    } else {
        return parseImage(path, data, axiosInstance);
    }
}

function ReadFile(url:string, dev: React.DependencyList, axiosInstance?: AxiosInstance, header?: HeaderString[], withCredentials=true): [ReducerState, ()=>Promise<void>] {
    async function getFile() {
        const response = await (axiosInstance || axios.create()).get(
            url, {responseType: "arraybuffer"}
        );

        return {
            result: response.status == 200 ? "success":"fail",
            data: response.data as ResultData
        } as ResponseMessage;
    }
    
    async function getDicom() {
        const image = await dicomReader(url, header, withCredentials);

        return {
            result: image ? "success":"fail",
            data: image
        }
    }

    async function getPDF() {
        let task = pdfjs.getDocument(url);
        const pdf = await task.promise;

        const numPages = pdf.numPages;
        let pageIter = [];
        for (let i = 1; i < numPages + 1; i++) {
            pageIter.push(i);
        }

        const pageNumbers = pageIter;
        // Start reading all pages 1...numPages
        const promises = pageNumbers.map(pageNo => pdf.getPage(pageNo));
        // Wait until all pages have been read
        const pages = await Promise.all(promises);

        return {
            result: pdf && pages ? "success": "fail",
            data: {
                pdf,
                pages
            }
        }
    }

    if (isDicom(url)) {
        return useAsync(getDicom, dev, true);
    } else if (isPDF(url)) {
        return useAsync(getPDF, dev, true);
    } else {
        return useAsync(getFile, dev, true);
    }
}

export default ReadFile