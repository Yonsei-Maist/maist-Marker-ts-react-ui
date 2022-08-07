import axios, { AxiosInstance } from "axios";
import { View, Map } from "ol";
import { getCenter } from "ol/extent";
import { Layer, Tile } from "ol/layer";
import ImageLayer from "ol/layer/Image";
import { Projection } from "ol/proj";
import { Zoomify } from "ol/source";
import Static from "ol/source/ImageStatic";
import useAsync, { ReducerState } from "../hooks/useAsync";
import { ResponseMessage, ResultData } from "../models/response";
import dicomReader, { DicomObject, fitSize } from "../lib/dicomReader";
import DicomRightMouseDrag, { DICOM_OBJECT } from "../components/marker/ui/interactor/DicomRightMouseDrag";
import ImageCanvasSource from "ol/source/ImageCanvas";

import sizeOf from 'buffer-image-size';

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
    const extent = [0, 0, imageInfo.width, imageInfo.height];
    const worldExtent = [-imageInfo.width, -imageInfo.height, imageInfo.width, imageInfo.height];
    const projection = new Projection({  // custom project to show Static Image
        code: 'normal-image',
        units: 'pixels',
        extent: extent,
        worldExtent: worldExtent
    });
    
    let source = new Static({
        url: path,
        projection: projection,
        imageExtent: extent
    });

    let layer = new ImageLayer({
        source: source
    });

    let view = new View({
        center: getCenter(extent),
        extent: source.getImageExtent(),
        projection: projection,
        constrainOnlyCenter: true,
        zoom: 2
    });
    
    return {layer, view}
}

function parseDicom(map: Map, path:string, data:any, axiosInstance?: AxiosInstance) {
    let dicomData = new DicomObject(data);

    map.set(DICOM_OBJECT, dicomData);
    map.addInteraction(new DicomRightMouseDrag());
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

            dicomData.retouchX = a1[0] + delta[0];
            dicomData.retouchY = a1[1] + delta[1];
            dicomData.retouchWidth = Math.abs(a2[0]-a1[0]);
            dicomData.retouchHeight = Math.abs(a1[1]-a2[1]);
            dicomData.retouch();
            source.setAttributions(['ww: ' + dicomData.ww.toFixed(5), ' wc: ' + dicomData.wc.toFixed(5)]);
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

function ReadFile(url:string, dev: React.DependencyList, axiosInstance?: AxiosInstance): [ReducerState, ()=>Promise<void>] {
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
        const image = await dicomReader(url);
        
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