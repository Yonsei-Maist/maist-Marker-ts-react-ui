import React, { ComponentType, useEffect } from "react";
import { Addon, useAddon } from "../../provider/AddonProvider";
import BoxDrawer from "../drawer/BoxDrawer";
import { Circle, CircleOutlined, Edit, EditOutlined, Polyline, PolylineOutlined, Rectangle, RectangleOutlined, SquareFoot, SquareFootOutlined, Straighten, StraightenOutlined } from "@mui/icons-material";
import PencilDrawer from "../drawer/PencilDrawer";
import EllipseDrawer from "../drawer/EllipseDrawer";
import AreaDrawer from "../drawer/AreaDrawer";
import LengthDrawer from "../drawer/LengthDrawer";
import PolygonDrawer from "../drawer/PolygonDrawer";

interface AddonNodeProps {
    addon?: (Addon | Addon[]);
}

export const AddonRegister = ({addon}: AddonNodeProps) => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        if (addon) {
            registerAddon(addon);
        }
    }, []);

    return <></>
}

export const PresetBox = () => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon({
            id: 'Box',
            name: 'Box',
            selectedIcon: <Rectangle />,
            unselectedIcon: <RectangleOutlined />,
            drawer: new BoxDrawer()
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

export const PresetPolygon = ({lengthFormat = defaultLengthFormat, areaFormat = defaultAreaFormat}: PresetPolygonProps) => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon([
            {
                id: 'Polygon',
                name: 'Polygon',
                selectedIcon: <Polyline />,
                unselectedIcon: <PolylineOutlined />,
                drawer: new PolygonDrawer()
            },
            {
                id: 'Length',
                name: 'Length',
                selectedIcon: <Straighten />,
                unselectedIcon: <StraightenOutlined />,
                drawer: new LengthDrawer(lengthFormat)
            },
            {
                id: 'Area',
                name: 'Area',
                selectedIcon: <SquareFoot />,
                unselectedIcon: <SquareFootOutlined />,
                drawer: new AreaDrawer(areaFormat)
            }
        ])
    }, []);

    return <></>;
}

export const PresetEllipse = () => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon({
            id: 'Ellipse',
            name: 'Ellipse',
            selectedIcon: <Circle />,
            unselectedIcon: <CircleOutlined />,
            drawer: new EllipseDrawer()
        })
    }, []);

    return <></>;
}

export const PresetHand = () => {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon({
            id: 'Pencil',
            name: 'Pencil',
            selectedIcon: <Edit />,
            unselectedIcon: <EditOutlined />,
            drawer: new PencilDrawer()
        })
    }, []);

    return <></>;
}