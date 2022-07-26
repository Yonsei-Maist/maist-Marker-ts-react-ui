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
import dicomReader from "../lib/dicomReader";
import DicomRightMouseDrag, { DICOM_OBJECT } from "../components/marker/ui/interactor/DicomRightMouseDrag";

interface SourceData {
    layer: Layer;
    view: View;
}

interface DicomObject {
    pixelData: Uint16Array;
    slope: number;
    interceptor: number;
    max: number;
    min: number;
    ww: number;
    wc: number;
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
        ///resolutions: resolution,
        extent: layer.getExtent(),
        constrainOnlyCenter: true,
        zoom: 2
    });
    view.fit(layer.getExtent() as number[], { size: map.getSize() });
    return {layer, view};
}

function parseImage(path: string, data: any, axiosInstance?: AxiosInstance) {

    // TODO: get width, height from image data to fit extent and worldExtent
    const extent = [0, 0, 256, 256];
    const worldExtent = [-1024, -1024, 1024, 1024];
    const projection = new Projection({  // custom project to show Static Image
        code: 'xkcd-image',
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
        // maxResolution: source.getResolutions()[0],
        center: getCenter(extent),
        extent: source.getImageExtent(),
        projection: projection,
        constrainOnlyCenter: true,
        zoom: 2
    });
    
    return {layer, view}
}

function parseDicom(map: Map, path:string, data:any, axiosInstance?: AxiosInstance) {
    // TODO: get width, height from image data to fit extent and worldExtent
    const extent = [0, 0, 256, 256];
    const worldExtent = [-1024, -1024, 1024, 1024];
    const projection = new Projection({  // custom project to show Static Image
        code: 'xkcd-image',
        units: 'pixels',
        extent: extent,
        worldExtent: worldExtent
    });

    let dicomData = dicomReader(data);
    map.set(DICOM_OBJECT, dicomData);
    map.addInteraction(new DicomRightMouseDrag());
    let source = new Static({
        url: path,
        projection: projection,
        imageExtent: extent,
        imageLoadFunction: (wrapper, url) => {
            const dicomData = map.get(DICOM_OBJECT);
            
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = dicomData.width;
            canvas.height = dicomData.height;

            let imageData = context.createImageData(canvas.width, canvas.height);
            
            dicomData.drawing(imageData.data);
            context.putImageData(imageData, 0, 0);
            var dataUri = canvas.toDataURL();
            (wrapper.getImage() as HTMLImageElement).src = dataUri;
        }
    });

    let layer = new ImageLayer({
        source: source
    });

    let view = new View({
        // maxResolution: source.getResolutions()[0],
        center: getCenter(extent),
        extent: source.getImageExtent(),
        projection: projection,
        constrainOnlyCenter: true,
        zoom: 2
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

    return useAsync(getFile, dev);
}

export default ReadFile