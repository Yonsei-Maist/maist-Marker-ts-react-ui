import React from "react";
import axios, { AxiosInstance } from "axios";
import { Map, View } from "ol";
import { useEffect } from "react";


import { ResultData, ResponseMessage, useReaderAddon } from "@yonsei-maist/react-maist-marker";
import { Zoomify } from "ol/source";
import { Tile } from "ol/layer";

function DziReader() {
    const { registerReaderAddon } = useReaderAddon();

    async function getFile(buffer: ArrayBuffer) {
        return {
            result: buffer ? "success" : "fail",
            data: buffer as ResultData
        } as ResponseMessage;
    }

    const parser = (map: Map, path: string, data: any, axiosInstance?: AxiosInstance) => {
        var layer = new Tile();

        var last = path.lastIndexOf('.');
        var path = path.slice(0, last);

        var datStr = String.fromCharCode.apply(null, new Uint8Array(data));
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(datStr, 'text/xml');

        var elements = xmlDoc.getElementsByTagName('Image');
        var tileSize = Number(elements[0].getAttribute('TileSize'));
        var format = elements[0].getAttribute('Format');
        var width = Number(elements[0].getElementsByTagName('Size')[0].getAttribute('Width'));
        var height = Number(elements[0].getElementsByTagName('Size')[0].getAttribute('Height'));
        var url = path + '_files/{z}/{x}_{y}.' + format;

        var offset = Math.ceil(Math.log(tileSize) / Math.LN2);

        const tileUrlFunction = (tileCoord: any) => {
            return url.replace(
                '{z}', tileCoord[0] + offset
            ).replace(
                '{x}', tileCoord[1]
            ).replace(
                '{y}', tileCoord[2]
            );
        }

        const tileLoadFunction = (image: any, src: any) => {
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
            maxResolution: layer.getSource()?.getTileGrid()?.getResolutions()[0],
            extent: layer.getExtent(),
            constrainOnlyCenter: true,
            zoom: 2
        });
        view.fit(layer.getExtent() as number[], { size: map.getSize() });
        return { layer, view };
    }

    useEffect(() => {
        registerReaderAddon({
            id: 'DziReader',
            name: 'DziReader',
            ext: ['dzi'],
            reader: getFile,
            parser: parser
        });

    }, []);
    return <></>;
}

export default DziReader;