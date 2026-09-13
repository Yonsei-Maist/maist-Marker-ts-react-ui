import React, { ComponentType, useEffect } from "react";
import { Addon, useAddon } from "../../provider/AddonProvider";
import BoxDrawer from "../drawer/BoxDrawer";
import { Brush, BrushOutlined, Circle, CircleOutlined, Edit, EditOutlined, Layers, LayersOutlined, Place, PlaceOutlined, Polyline, PolylineOutlined, Rectangle, RectangleOutlined, SquareFoot, SquareFootOutlined, Straighten, StraightenOutlined, Timeline, TimelineOutlined, ViewInAr, ViewInArOutlined } from "@mui/icons-material";
import PencilDrawer from "../drawer/PencilDrawer";
import EllipseDrawer from "../drawer/EllipseDrawer";
import AreaDrawer from "../drawer/AreaDrawer";
import LengthDrawer, { PolylineDrawer } from "../drawer/LengthDrawer";
import KeypointDrawer from "../drawer/KeypointDrawer";
import MaskDrawer from "../drawer/MaskDrawer";
import CuboidDrawer from "../drawer/CuboidDrawer";
import PolygonDrawer from "../drawer/PolygonDrawer";
import { SourceData, useReaderAddon } from "../../provider/ReaderProvider";
import { ResponseMessage, ResultData } from "@/models/response";
import { Map, View } from "ol";

import sizeOf from 'buffer-image-size';
import { Buffer } from 'buffer';
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
    /** false면 Length/Area 측정 도구 없이 Polygon만 등록한다 (id 'Polygon'). (1.4+) */
    measure?: boolean;
}

export const PresetPolygon = ({ lengthFormat = defaultLengthFormat, areaFormat = defaultAreaFormat, measure = true }: PresetPolygonProps) => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        if (!measure) {
            registerAddon({
                id: 'Polygon',
                items: {
                    name: 'Polygon',
                    selectedIcon: <Polyline />,
                    unselectedIcon: <PolylineOutlined />,
                    drawer: new PolygonDrawer()
                }
            });
            return;
        }

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

/** 선형 병변(주름선·경계선)용 개곡선 도구. 측정 표시 없음. (1.4+) */
export const PresetPolyline = () => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon({
            id: 'Polyline',
            items: {
                name: 'Polyline',
                selectedIcon: <Timeline />,
                unselectedIcon: <TimelineOutlined />,
                drawer: new PolylineDrawer()
            }
        })
    }, []);

    return <></>;
}

/** ④ Keypoint — 포인트 지정, 클래스별 순번 자동 부여 (1.5+) */
export const PresetKeypoint = () => {
    const { registerAddon } = useAddon();
    useEffect(() => {
        registerAddon({
            id: 'Keypoint',
            items: { name: 'Keypoint', selectedIcon: <Place />, unselectedIcon: <PlaceOutlined />, drawer: new KeypointDrawer() }
        });
    }, []);
    return <></>;
}

/** ⑤ Semantic Segmentation — 클래스당 마스크 1장, 브러시/소거 (1.5+) */
export const PresetSemanticSegmentation = () => {
    const { registerAddon } = useAddon();
    useEffect(() => {
        registerAddon({
            id: 'SemanticMask',
            items: { name: 'SemanticMask', selectedIcon: <Brush />, unselectedIcon: <BrushOutlined />, drawer: new MaskDrawer(false, 'SemanticMask') }
        });
    }, []);
    return <></>;
}

/** ⑥ Instance Segmentation — 인스턴스별 마스크·ID, 중첩 허용 (1.5+) */
export const PresetInstanceSegmentation = () => {
    const { registerAddon } = useAddon();
    useEffect(() => {
        registerAddon({
            id: 'InstanceMask',
            items: { name: 'InstanceMask', selectedIcon: <Layers />, unselectedIcon: <LayersOutlined />, drawer: new MaskDrawer(true, 'InstanceMask') }
        });
    }, []);
    return <></>;
}

/** ⑧ Cuboid — 2.5D 직육면체, 확장 옵션 (1.5+) */
export const PresetCuboid = () => {
    const { registerAddon } = useAddon();
    useEffect(() => {
        registerAddon({
            id: 'Cuboid',
            items: { name: 'Cuboid', selectedIcon: <ViewInAr />, unselectedIcon: <ViewInArOutlined />, drawer: new CuboidDrawer() }
        });
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
        const imageBuffer = Buffer.from(data);
        const imageInfo = sizeOf(imageBuffer);

        // 문자열 누적 + base64 대신 Blob URL을 쓴다. 큰 이미지에서 수십 배 빠르고 전역(window.Buffer)을 건드리지 않는다.
        const mimeType = imageInfo.type === 'jpg' ? 'image/jpeg' : `image/${imageInfo.type || 'png'}`;
        const imageSrc = URL.createObjectURL(new Blob([data], { type: mimeType }));
        let newSize = fitSize(imageInfo.width, imageInfo.height);

        let source = new Static({
            url: imageSrc,
            imageExtent: [0, -newSize[1], newSize[0], 0]
        });

        // 이미지가 디코딩되면 Blob URL은 더 이상 필요 없다.
        source.on('imageloadend', () => URL.revokeObjectURL(imageSrc));
        source.on('imageloaderror', () => URL.revokeObjectURL(imageSrc));

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