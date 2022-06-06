
import React , { useEffect, useContext, useRef, useState } from 'react';
import { Modify, Snap, Translate, Select } from 'ol/interaction';
import { Vector } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer'

import MapContext, { MapObject } from '../context/MapContext';
import Geometry from 'ol/geom/Geometry';
import { DrawEvent } from 'ol/interaction/Draw';
import {
    platformModifierKeyOnly,
    primaryAction,
} from 'ol/events/condition';
import { Feature } from 'ol';
import {LabelContext, LabelContextObject } from '../context';

import {v4 as uuidv4} from 'uuid';
import BasicDrawer from './lib/BasicDrawer';
import BoxDrawer from './lib/BoxDrawer';
import AreaDrawer from './lib/AreaDrawer';
import LengthDrawer from './lib/LengthDrawer';
import PencilDrawer from './lib/PencilDrawer';
import PolygonDrawer from './lib/PolygonDrawer';
import NoneDrawer from './lib/NoneDrawer';
import { LabelInfo } from './Marker';

import EllipseDrawer from './lib/EllipseDrawer';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Circle, CircleOutlined, Edit, EditOutlined, HighlightAlt, HighlightAltOutlined, Polyline, PolylineOutlined, Rectangle, RectangleOutlined, SquareFoot, SquareFootOutlined, Straighten, StraightenOutlined } from '@mui/icons-material';

export const TOOL_TYPE = "TOOL_TPYE";
export const TOOL_MEMO = "TOOL_MEMO";

export enum Tools {
    None = "None",
    Pencil = "LineString",
    Box = "Box",
    Polygon = "Polygon",
    Length = "Length",
    Area = "Area",
    Ellipse = "Ellipse"
}

export interface ToolOption {
    pencil?: boolean;
    box?: boolean;
    polygon?: boolean;
    length?: boolean;
    area?: boolean;
    ellipse?: boolean;
}

enum Mode {
    Draw,
    Select
}

export interface ToolNavigatorProps {
    option?: ToolOption;
    lengthFormat?: (length:number) => string;
    areaFormat?: (area: number) => string;
    labelInfo?: LabelInfo[];
};

export interface ToolContext {
    drawerMap: Map<Tools, BasicDrawer>;
    removeModify: Modify;
    snap: Snap;
    source: Vector<Geometry>;
    layer: VectorLayer<Vector<Geometry>>;
    translate: Translate;
    select: Select;
    toolType: Tools;
}

const defaultLengthFormat = (line:number) => {return line + " px"};
const defaultAreaFormat = (area:number) => {return area + " px\xB2"}

function ToolNavigator({ option, lengthFormat, areaFormat, labelInfo }: ToolNavigatorProps) {
    const { map, isLoaded } = useContext(MapContext) as MapObject;
    const { labelList, selectedFeatures, setSelectedFeatures, addLabel, removeLabel } = useContext(LabelContext) as LabelContextObject;
    const context = useRef({drawerMap: new Map<Tools, BasicDrawer>(), toolType: Tools.None} as ToolContext);
    const [toolType, setToolType] = useState(Tools.None);
    const [toolMode, setToolMode] = useState(Mode.Draw);

    if (!option) {
        option = defaultOption;
    }

    function createDrawers(source: Vector<Geometry>, select: Select) {
        const {drawerMap} = context.current;
        drawerMap.set(Tools.None, new NoneDrawer());

        let areaDrawer = new AreaDrawer();
        areaDrawer.setFormatArea(areaFormat || defaultAreaFormat);
        drawerMap.set(Tools.Area, areaDrawer);

        drawerMap.set(Tools.Box, new BoxDrawer());

        let lengthDrawer = new LengthDrawer();
        lengthDrawer.setFormatLength(lengthFormat || defaultLengthFormat);
        drawerMap.set(Tools.Length, lengthDrawer);

        drawerMap.set(Tools.Pencil, new PencilDrawer());
        drawerMap.set(Tools.Polygon, new PolygonDrawer());
        drawerMap.set(Tools.Ellipse, new EllipseDrawer());

        drawerMap.forEach((value) => {
            let draw = value.createDraw(source);

            draw.on('drawend', function (evt: DrawEvent) {
                let feature = evt.feature as Feature
                
                feature.set(TOOL_TYPE, context.current.toolType);
                feature.setId(uuidv4());
                addLabel(evt.feature);
            });
            value.createModify(select);
        });
    }

    function getDrawer(source: Vector<Geometry>, select: Select) : BasicDrawer | undefined {
        return context.current.drawerMap.get(toolType);
    }

    function createSnap(source: Vector<Geometry>): Snap {
        return new Snap({ source: source });
    }

    const load = () => {
        if (labelInfo) {
            const {source, drawerMap} = context.current;
            for (let i = 0; i < labelInfo.length; i++) {
                let item = labelInfo[i];
                let drawer = drawerMap.get(item.toolType as Tools);
                if (drawer) {
                    let feature = drawer.createFeature(item.location, item.memo);

                    source.addFeature(feature);
                    addLabel(feature, item.name);
                }
            }
        }
    }

    useEffect(() => {
        if (map && isLoaded) {
            const {drawerMap} = context.current;
            if (!context.current.layer) {

                let source = new Vector();
                let layer = new VectorLayer({
                    source: source,
                    style: (feature) => {
                        let type = feature.get(TOOL_TYPE);
                        let drawer = drawerMap.get(type);

                        return drawer.getVectorStyle(feature, type == Tools.Length ? (lengthFormat || defaultLengthFormat) : (areaFormat || defaultAreaFormat));
                    }
                });

                let select = new Select({
                    style: function (feature: Feature) {
                        let type = feature.get(TOOL_TYPE);
                        let drawer = drawerMap.get(type);
                        return drawer.getSelectStyle(feature);
                    }
                });

                select.setActive(false);
                select.on('select', function (e: any) {
                    const {drawerMap} = context.current;
                    let featureList = [] as Feature[];
                    let list = e.target.getFeatures().getArray() as Feature[];
                    for (let i = 0; i < list.length; i++) {
                        for (let j = 0; j < labelList.length; j++) {

                            if (labelList[j].feature == list[i]) {
                                featureList.push(labelList[j].feature);
                            }
                        }
                    }

                    let key;
                    if (featureList.length == 1) {
                        key = featureList[0].get(TOOL_TYPE);
                    } else {
                        key = Tools.None;
                    }

                    let map = drawerMap.get(key);
                    if (map)
                        map.activeModify(context.current);

                    if (setSelectedFeatures) {
                        setSelectedFeatures(featureList);
                    }
                });

                let removeModify = new Modify({features: select.getFeatures()});
                removeModify.on("change:active", function() {
                    if (context.current) {
                        const {select, source} = context.current;

                        let selected = select.getFeatures();
                        let array = selected.getArray();
                        for (let i = 0 ;i<array.length;i++) {
                            removeLabel(array[i]);
                            source.removeFeature(array[i]);
                        }
                    }
                });
                //removeModify.setActive(false);

                let translate = new Translate({
                    condition: function (event) {
                        return primaryAction(event) && platformModifierKeyOnly(event);
                    },
                    features: select.getFeatures()
                });

                map.addLayer(layer);
                map.addInteraction(select);

                translate.setActive(false);
                let snap = createSnap(source);
                snap.setActive(false);

                createDrawers(source, select);

                map.addInteraction(removeModify);

                context.current.drawerMap.forEach((value, key) => {
                    if (key != Tools.None)
                        map.addInteraction(value.getModify());
                });

                map.addInteraction(translate);

                context.current.drawerMap.forEach((value) => {
                    map.addInteraction(value.getDraw());
                });

                map.addInteraction(snap);

                var keydown = function(evt: KeyboardEvent){
                    var key = evt.key;
                    if (key == "Backspace" || key == "Delete"){
                        const {removeModify} = context.current;
                        removeModify.setActive(!removeModify.getActive());
                    }
                };

                document.addEventListener('keydown', keydown, false);

                let mapTmp = context.current.drawerMap.get(toolType);
                if (mapTmp) {

                    mapTmp.activeDraw(context.current);
                    mapTmp.activeModify(context.current);
                }

                context.current = {
                    ...context.current,
                    removeModify,
                    translate,
                    snap,
                    source,
                    layer,
                    select
                }

                load();
            }
        }
    }, [isLoaded]);

    useEffect(() => {
        if (context.current && map) {
            const { snap, source, select } = context.current;

            if (selectedFeatures && setSelectedFeatures)
                setSelectedFeatures(undefined);

            select.getFeatures().clear();
            map.removeInteraction(snap);
            let drawer = getDrawer(source, select);
            if (drawer)
                drawer.activeDraw(context.current);
            let newSnap = createSnap(source);
            
            map.addInteraction(newSnap);
            context.current.snap = newSnap;
            context.current.toolType = toolType;
        }
    }, [toolType]);

    useEffect(() => {
        if (context.current && map) {
            const { select, translate, drawerMap} = context.current;

            if (selectedFeatures && setSelectedFeatures)
                setSelectedFeatures(undefined);
            select.getFeatures().clear();
            if (toolMode == Mode.Draw) {
                let mapType = drawerMap.get(toolType);
                if (mapType)
                    mapType.activeDraw(context.current);

                select.setActive(false);
                translate.setActive(false);
            } else {
                let mapNone = drawerMap.get(Tools.None);
                if (mapNone) {
                    mapNone.activeDraw(context.current);
                    mapNone.activeModify(context.current);
                }

                select.setActive(true);
                translate.setActive(true);
            }
        }
    }, [toolMode]);

    function onModeButtonClickListener(type: Mode) {
        setToolType(Tools.None);
        setToolMode(type);
    }

    function onToolButtonClickListener(type: Tools) {
        setToolMode(Mode.Draw);
        setToolType(type);
    }

    function checkActive() {
        if (toolMode == Mode.Select)
            return toolMode;
        else
            return toolType;
    }

    let active = checkActive();

    return (
        <Box position={"absolute"} left={"15px"} top={"15px"}>
            <ToggleButtonGroup value={active} orientation='vertical' sx={{background: "white"}}>
                <ToggleButton value={Mode.Select} onClick={() => { onModeButtonClickListener(Mode.Select); }}>
                    {
                        toolMode == Mode.Select ?
                        <HighlightAlt/>:
                        <HighlightAltOutlined/>
                    }
                </ToggleButton>
                {
                    option.pencil && 
                    <ToggleButton value={Tools.Pencil} onClick={() => { onToolButtonClickListener(Tools.Pencil); }}>
                        {
                            toolType == Tools.Pencil ? <Edit/> : <EditOutlined/>
                        }
                    </ToggleButton>
                }
                {
                    option.box &&
                    <ToggleButton value={Tools.Box} onClick={() => { onToolButtonClickListener(Tools.Box); }}>
                        {
                            toolType == Tools.Box ? <Rectangle/> : <RectangleOutlined/>
                        }
                    </ToggleButton>
                }
                {
                    option.polygon &&
                    <ToggleButton value={Tools.Polygon} onClick={() => { onToolButtonClickListener(Tools.Polygon);}} >
                        {
                            toolType == Tools.Polygon ? <Polyline/> : <PolylineOutlined/>
                        }
                    </ToggleButton>
                }
                {
                    option.ellipse &&
                    <ToggleButton value={Tools.Ellipse} onClick={() => { onToolButtonClickListener(Tools.Ellipse); }}>
                        {
                            toolType == Tools.Ellipse ? <Circle/> : <CircleOutlined/>
                        }
                    </ToggleButton>
                }
                {
                    option.length &&
                    <ToggleButton value={Tools.Length} onClick={() => { onToolButtonClickListener(Tools.Length); }}>
                        {
                            toolType == Tools.Length ? <Straighten/> : <StraightenOutlined/>
                        }
                    </ToggleButton>
                }
                {
                    option.area &&
                    <ToggleButton value={Tools.Area} onClick={() => { onToolButtonClickListener(Tools.Area); }}>
                        {
                            toolType == Tools.Area ? <SquareFoot/> : <SquareFootOutlined/>
                        }
                    </ToggleButton>
                }
            </ToggleButtonGroup>
        </Box>
    );
}

const defaultOption: ToolOption = {
    pencil: false,
    box: true,
    polygon: true,
    length: true,
    area: true,
    ellipse: true
}

ToolNavigator.defaultProps = {
    option: defaultOption,
    lengthFormat: (line:number) => {return line + " px"},
    areaFormat: (area:number) => {return area + " px\xB2"}
};

export default ToolNavigator;