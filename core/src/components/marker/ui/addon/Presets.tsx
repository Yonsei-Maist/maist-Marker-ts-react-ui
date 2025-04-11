import React, { ComponentType, useEffect } from "react";
import { Addon, useAddon } from "../../provider/AddonProvider";
import BoxDrawer from "../drawer/BoxDrawer";
import { Circle, CircleOutlined, Edit, EditOutlined, Polyline, PolylineOutlined, Rectangle, RectangleOutlined, SquareFoot, SquareFootOutlined, Straighten, StraightenOutlined } from "@mui/icons-material";
import PencilDrawer from "../drawer/PencilDrawer";
import EllipseDrawer from "../drawer/EllipseDrawer";
import AreaDrawer from "../drawer/AreaDrawer";
import LengthDrawer from "../drawer/LengthDrawer";
import PolygonDrawer from "../drawer/PolygonDrawer";
import { SourceData, useReaderAddon } from "../../provider/ReaderProvider";
import { ResponseMessage, ResultData } from "@/models/response";
import { Map, View } from "ol";

import sizeOf from 'buffer-image-size';
import { AxiosInstance } from "axios";
import { fitSize } from "@/lib/sizeConverter";
import Static from "ol/source/ImageStatic";
import ImageLayer from "ol/layer/Image";
import { getCenter } from "ol/extent";
import { DrawObject } from "@/lib/CanvasDrawer";
import { DRAW_OBJECT } from "@/constants/tag";

interface AddonNodeProps {
    addon?: Addon;
}

export const AddonRegister = ({ addon }: AddonNodeProps) => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        if (addon) {
            registerAddon(addon);
        }
    }, []);

    return <></>
}

export const PresetEmpty = () => {
    return <></>;
}

export const PresetBox = () => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon({
            id: 'Box',
            items: {
                name: 'Box',
                selectedIcon: <Rectangle />,
                unselectedIcon: <RectangleOutlined />,
                drawer: new BoxDrawer()
            }
        })
    }, []);

    return <></>;
}

const defaultLengthFormat = (line: number) => { return line + " px" };
const defaultAreaFormat = (area: number) => { return area + " px\xB2" };

interface PresetPolygonProps {
    lengthFormat?: (line: number) => string;
    areaFormat?: (line: number) => string;
}

export const PresetPolygon = ({ lengthFormat = defaultLengthFormat, areaFormat = defaultAreaFormat }: PresetPolygonProps) => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon(
            {
                id: 'Polygon_set',
                items: [
                    {
                        name: 'Polygon',
                        selectedIcon: <Polyline />,
                        unselectedIcon: <PolylineOutlined />,
                        drawer: new PolygonDrawer()
                    },
                    {
                        name: 'Length',
                        selectedIcon: <Straighten />,
                        unselectedIcon: <StraightenOutlined />,
                        drawer: new LengthDrawer(lengthFormat)
                    },
                    {
                        name: 'Area',
                        selectedIcon: <SquareFoot />,
                        unselectedIcon: <SquareFootOutlined />,
                        drawer: new AreaDrawer(areaFormat)
                    }
                ]
            }
        )
    }, []);

    return <></>;
}

export const PresetEllipse = () => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon({
            id: 'Ellipse',
            items: {
                name: 'Ellipse',
                selectedIcon: <Circle />,
                unselectedIcon: <CircleOutlined />,
                drawer: new EllipseDrawer()
            }
        })
    }, []);

    return <></>;
}

export const PresetHand = () => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon({
            id: 'Pencil',
            items: {
                name: 'Pencil',
                selectedIcon: <Edit />,
                unselectedIcon: <EditOutlined />,
                drawer: new PencilDrawer()
            }
        })
    }, []);

    return <></>;
}

export const PresetImageReader = () => {
    const { registerReaderAddon } = useReaderAddon();

    const getFile = async (buffer: ArrayBuffer) => {
        return {
            result: buffer ? "success" : "fail",
            data: buffer as ResultData
        } as ResponseMessage;
    }

    const parser = (map: Map, path: string, data: any, axiosInstance?: AxiosInstance) => {
        window.Buffer = Buffer;
        const imageBuffer = Buffer.from(data);
        const imageInfo = sizeOf(imageBuffer);

        let binary = '';
        let bytes = new Uint8Array(imageBuffer);
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        let base64 = window.btoa(binary);
        let imageSrc = 'data:image/png;base64,' + base64;
        let newSize = fitSize(imageInfo.width, imageInfo.height);

        let source = new Static({
            url: imageSrc,
            imageExtent: [0, -newSize[1], newSize[0], 0]
            // imageExtent: [0, 0, newSize[0], newSize[1]]
        });

        let layer = new ImageLayer({
            source: source
        });

        layer.setExtent([0, -newSize[1], newSize[0], 0]);

        let view = new View({
            center: getCenter(source.getImageExtent()),
            // extent: source.getImageExtent(),
            constrainOnlyCenter: true,
            zoom: 6
        });

        map.set(DRAW_OBJECT, new DrawObject(imageInfo.width, imageInfo.height))

        return { layer, view } as SourceData;
    }

    useEffect(() => {
        registerReaderAddon({
            id: 'ImageReader',
            name: 'ImageReader',
            ext: ['jpeg', 'jpg', 'png'],
            reader: getFile,
            parser: parser
        });

    }, []);
    return <></>;
}