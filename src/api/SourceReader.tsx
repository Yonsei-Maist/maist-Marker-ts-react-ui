import axios, { AxiosInstance } from "axios";
import { View, Map } from "ol";
import { getCenter } from "ol/extent";
import { Layer, Tile } from "ol/layer";
import ImageLayer from "ol/layer/Image";
import { Projection } from "ol/proj";
import { ImageArcGISRest, ImageWMS, Zoomify } from "ol/source";
import Static from "ol/source/ImageStatic";
import useAsync, { ReducerState } from "../hooks/useAsync";
import { ResponseMessage, ResultData } from "../models/response";
import dicomReader, { DicomObject, fitSize, HeaderString } from "../lib/dicomReader";
import DicomRightMouseDrag, { DICOM_OBJECT } from "../components/marker/ui/interactor/DicomRightMouseDrag";

import sizeOf from 'buffer-image-size';
import ImageCanvasSource from "ol/source/ImageCanvas";
import { MAP_MEMO } from "../components/marker/context/MapContext";

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

// function parseDicom(map: Map, path: string, data: any, axiosInstance?: AxiosInstance) {

//     let dicomData = new DicomObject(data);

//     map.set(DICOM_OBJECT, dicomData);

//     let newSize = fitSize(data.width, data.height);

//     const setImage = (image: HTMLImageElement) => {
//         const dicomData = map.get(DICOM_OBJECT) as DicomObject;
//         dicomData.drawing();
//         image.src = dicomData.memoryCanvas.toDataURL();
//     }
    

//     // let source = new ImageCanvasSource({
//     //     canvasFunction: () => {
//     //         const dicomData = map.get(DICOM_OBJECT) as DicomObject;
//     //         dicomData.drawing();
//     //         return dicomData.memoryCanvas;
//     //     }
//     // })

//     let source = new Static({
//         url: dicomData.memoryCanvas.toDataURL(), // path,
//         // imageLoadFunction: (wrapper, url) => {
//         //     let image = wrapper.getImage() as HTMLImageElement;
//         //     const dicomData = map.get(DICOM_OBJECT) as DicomObject;
//         //     setImage(image);
//         //     source.setAttributions(['ww: ' + dicomData.ww.toFixed(5), ' wc: ' + dicomData.wc.toFixed(5)]);
//         // },
//         imageExtent: [0, -newSize[1], newSize[0], 0]
//     });

//     source.on("change", (e) => {
//         let image = e.target.image_.getImage() as HTMLImageElement;
//         setImage(image);
//     });

//     map.addInteraction(new DicomRightMouseDrag(source));

//     let layer = new ImageLayer({
//         source: source
//     });

//     let view = new View({
//         center: getCenter(source.getImageExtent()),
//         //extent: source.getImageExtent(),
//         constrainOnlyCenter: true,
//         zoom: 6
//     });
    
//     return {layer, view}
// }

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

            dicomData.retouchX = Math.abs((a1[0] + delta[0]) * pixelRatio);
            dicomData.retouchY = Math.abs((a1[1] + delta[1]) * pixelRatio);
            dicomData.retouchWidth = Math.abs((a2[0]-a1[0]) * pixelRatio);
            dicomData.retouchHeight = Math.abs((a1[1]-a2[1]) * pixelRatio);
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

export function makeLayer(map: Map, path:string, data:any, axiosInstance?: AxiosInstance): SourceData {
    if (path.indexOf(".dzi") > -1) {
        return parseDzi(map, path, data, axiosInstance);
    } else if (path.indexOf(".dcm") > -1) {
        return parseDicom(map, path, data, axiosInstance);
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

    if (url.indexOf(".dcm") > -1) {
        return useAsync(getDicom, dev);
    } else {
        return useAsync(getFile, dev);
    }
}

export default ReadFile