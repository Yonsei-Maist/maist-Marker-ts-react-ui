import axios from "axios";
import useAsync, { ReducerState } from "../hooks/useAsync";
import { ResponseMessage, ResultData } from "../models/response";

export interface DziInformation {
    width: number;
    height: number;
    tileUrlFunction: (tileCoord:any)=>string;
    tileLoadFunction: (image:any, src:any)=>void;
    offset: number;
    tileSize: number;
    url: string;
}

export function makeLayer(path:string, data:any):DziInformation {
    var last = path.lastIndexOf('.');
    var path = path.slice(0, last);

    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(data,'text/xml');

    var elements = xmlDoc.getElementsByTagName('Image');
    var tileSize = Number(elements[0].getAttribute('TileSize'));
    var format = elements[0].getAttribute('Format');
    var width = Number(elements[0].getElementsByTagName('Size')[0].getAttribute('Width'));
    var height = Number(elements[0].getElementsByTagName('Size')[0].getAttribute('Height'));
    var url = path + '_files/{z}/{x}_{y}.' + format;

    var offset = Math.ceil(Math.log(tileSize)/Math.LN2);
   
    return {
        width,
        height,
        offset,
        tileSize,
        url,
        tileUrlFunction: (tileCoord:any) => {
            return url.replace(
                '{z}', tileCoord[0] + offset
            ).replace(
                '{x}', tileCoord[1]
            ).replace(
                '{y}', tileCoord[2]
            );
        },
        tileLoadFunction: (image:any, src:any) => {
            axios.get(src, { responseType: 'blob' })
            .then((res) => {
                const url = window.URL.createObjectURL(res.data);
                image.getImage().src = url;
            })
            .catch((err) => {
                console.log(err);
            });
        }
    }
}

function ReadDzi(url:string, dev: React.DependencyList): [ReducerState, ()=>Promise<void>] {
    async function getDzi() {
        const response = await axios.get(
            url
        );

        return {
            result: response.status == 200 ? "success":"fail",
            data: response.data as ResultData
        } as ResponseMessage;
    }

    return useAsync(getDzi, dev);
}

export default ReadDzi