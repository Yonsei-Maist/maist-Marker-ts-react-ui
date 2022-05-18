import { useEffect, useContext, useRef, useState } from 'react';
import { Draw, Modify, Snap, Translate, Select, Interaction } from 'ol/interaction';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { Vector } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer'

import MapContext, { MapObject } from '../context/MapContext';
import Geometry from 'ol/geom/Geometry';
import { DrawEvent, createBox } from 'ol/interaction/Draw';
import {
    always,
    never,
    platformModifierKeyOnly,
    primaryAction,
} from 'ol/events/condition';
import { Feature } from 'ol';
import LabelContext, { LabelContextObject, LabelInformation, LabelObject } from '../context/LabelContext';
import Polygon from 'ol/geom/Polygon';
import { MultiPoint, Point, SimpleGeometry } from 'ol/geom';

import {v4 as uuidv4} from 'uuid';
import BasicDrawer from './lib/BasicDrawer';
import BoxDrawer, { calculateCenter } from './lib/BoxDrawer';
import AreaDrawer from './lib/AreaDrawer';
import LengthDrawer from './lib/LengthDrawer';
import PencilDrawer from './lib/PencilDrawer';
import PolygonDrawer from './lib/PolygonDrawer';
import NoneDrawer from './lib/NoneDrawer';
import { measureStyleFunciton } from './lib/Styler';
import { LabelInfo } from './Marker';

import styled from '@emotion/styled';

import MarkerMoveBtnIcon from '../image/marker-move-btn-icon.png';
import MarkerMoveBtnIconSelected from '../image/marker-move-btn-icon-selected.png';

import MarkerBoxBtnIcon from '../image/marker-box-btn-icon.png';
import MarkerBoxBtnIconSelected from '../image/marker-box-btn-icon-selected.png';
import MarkerPolygonBtnIcon from '../image/marker-polygon-btn-icon.png';
import MarkerPolygonBtnIconSelected from '../image/marker-polygon-btn-icon-selected.png';
import MarkerLengthBtnIcon from '../image/marker-length-btn-icon.png';
import MarkerLengthBtnIconSelected from '../image/marker-length-btn-icon-selected.png';
import MarkerAreaBtnIcon from '../image/marker-area-btn-icon.png';
import MarkerAreaBtnIconSelected from '../image/marker-area-btn-icon-selected.png';

const ToolNavigatorStyled = styled.div`
    width: 40px;
    padding-left: 5px;
    background: #404040;
`;

const ToolModeSelecter = styled.div`
`
const ToolButtonSelecter = styled.div`
`

const ToolButton = styled.div`
    width: 30px;
    height: 30px;
    margin-top: 5px;
    margin-right: 5px;
    border-radius: 5px;
`

const ToolButtonSelectMode = styled(ToolButton)`
    background: url(${MarkerMoveBtnIcon}) no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url(${MarkerMoveBtnIconSelected}) no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonSelectModeSelected = styled(ToolButton)`
    background: url(${MarkerMoveBtnIconSelected}) no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonPencil = styled(ToolButton)`

`

const ToolButtonPencilSelected = styled(ToolButton)`

`

const ToolButtonBox = styled(ToolButton)`
    background: url(${MarkerBoxBtnIcon}) no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url(${MarkerBoxBtnIconSelected}) no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonBoxSelected = styled(ToolButtonBox)`
    background: url(${MarkerBoxBtnIconSelected}) no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonPolygon = styled(ToolButton)`
    background: url(${MarkerPolygonBtnIcon}) no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url(${MarkerPolygonBtnIconSelected}) no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonPolygonSelected = styled(ToolButtonBox)`
    background: url(${MarkerPolygonBtnIconSelected}) no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonLength = styled(ToolButton)`
    background: url(${MarkerLengthBtnIcon}) no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url(${MarkerLengthBtnIconSelected}) no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonLengthSelected = styled(ToolButtonBox)`
    background: url(${MarkerLengthBtnIconSelected}) no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonArea = styled(ToolButton)`
    background: url(${MarkerAreaBtnIcon}) no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url(${MarkerAreaBtnIconSelected}) no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonAreaSelected = styled(ToolButtonBox)`
    background: url(${MarkerAreaBtnIconSelected}) no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

export const TOOL_TYPE = "TOOL_TPYE";
export const TOOL_MEMO = "TOOL_MEMO";

export enum Tools {
    None = "None",
    Pencil = "LineString",
    Box = "Box",
    Polygon = "Polygon",
    Length = "Length",
    Area = "Area"
}

export interface ToolOption {
    pencil?: boolean;
    box?: boolean;
    polygon?: boolean;
    length?: boolean;
    area?: boolean;
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

const DELETE_CATCHED = "DELETE_CATCHED";

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
        areaDrawer.setFormatArea(areaFormat);
        drawerMap.set(Tools.Area, areaDrawer);

        drawerMap.set(Tools.Box, new BoxDrawer());

        let lengthDrawer = new LengthDrawer();
        lengthDrawer.setFormatLength(lengthFormat);
        drawerMap.set(Tools.Length, lengthDrawer);

        drawerMap.set(Tools.Pencil, new PencilDrawer());
        drawerMap.set(Tools.Polygon, new PolygonDrawer());

        drawerMap.forEach((value, key) => {
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

    function getDrawer(source: Vector<Geometry>, select: Select) : BasicDrawer {
        return context.current.drawerMap.get(toolType);
    }

    function createSnap(source: Vector<Geometry>): Snap {
        return new Snap({ source: source });
    }

    const load = () => {
        if (labelInfo) {
            const {source, drawerMap} = context.current;
            let list = [] as LabelObject[];
            for (let i = 0; i < labelInfo.length; i++) {
                let item = labelInfo[i];
                let drawer = drawerMap.get(item.toolType as Tools);
                let feature = drawer.createFeature(item.location, item.memo);

                source.addFeature(feature);
                addLabel(feature, item.name);
            }
        }
    }

    useEffect(() => {
        if (map && isLoaded) {
            if (!context.current.layer) {

                let source = new Vector();
                let layer = new VectorLayer({
                    source: source,
                    style: (feature) => {
                        let type = feature.get(TOOL_TYPE);
                        if (type == Tools.Length || type ==Tools.Area) {
                            return measureStyleFunciton(feature, type == Tools.Length ? lengthFormat : areaFormat);
                        } else {
                            return new Style({
                                //text: new Text({}),
                                fill: new Fill({
                                    color: 'rgba(255, 204, 51, 0.4)',
                                }),
                                stroke: new Stroke({
                                    color: '#ffcc33',
                                    width: 2,
                                }),
                                image: new Circle({
                                    radius: 7,
                                    fill: new Fill({
                                        color: '#ffcc33',
                                    }),
                                }),
                            })
                        }
                    }
                });

                let select = new Select({
                    style: function (feature) {
                        const style = new Style({
                            geometry: function (feature) {
                                const modifyGeometry = feature.get('modifyGeometry');
                                return modifyGeometry ? modifyGeometry.geometry : feature.getGeometry();
                            },
                            fill: new Fill({
                                color: 'rgba(255, 255, 255, 0.4)',
                            }),
                            stroke: new Stroke({
                                color: '#ffcc33',
                                lineDash: [10, 10],
                                width: 2,
                            }),
                            image: new Circle({
                                radius: 7,
                                fill: new Fill({
                                    color: '#ffcc33',
                                }),
                            }),
                        });
                        const styles = [style];
                        const modifyGeometry = feature.get('modifyGeometry');
                        let coordinates;
                        if (modifyGeometry) {
                            const geometry = feature.getGeometry() as Point;
                            coordinates = calculateCenter(modifyGeometry.geometry, geometry.getCoordinates());
                        } else {
                            let geo = feature.getGeometry() as Polygon;
                            coordinates = geo.getCoordinates()[0];
                        }

                        styles.push(
                            new Style({
                                geometry: new MultiPoint(coordinates),
                                image: new Circle({
                                    radius: 4,
                                    fill: new Fill({
                                        color: '#33cc33',
                                    }),
                                }),
                            })
                        );

                        return styles;
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

                    if (featureList.length == 1) {
                        let type = featureList[0].get(TOOL_TYPE);
                        drawerMap.get(type).activeModify(context.current);
                    } else {
                        drawerMap.get(Tools.None).activeModify(context.current);
                    }

                    if (setSelectedFeatures) {
                        setSelectedFeatures(featureList);
                    }
                });

                let removeModify = new Modify({features: select.getFeatures()});
                removeModify.on("change:active", function(e:any) {
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

                context.current.drawerMap.forEach((value, key) => {
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

                context.current.drawerMap.get(toolType).activeDraw(context.current);
                context.current.drawerMap.get(toolType).activeModify(context.current);

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
                drawerMap.get(toolType).activeDraw(context.current);
                select.setActive(false);
                translate.setActive(false);
            } else {
                drawerMap.get(Tools.None).activeDraw(context.current);
                drawerMap.get(Tools.None).activeModify(context.current);
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

    return (
        <ToolNavigatorStyled>
            <ToolModeSelecter>
                {
                    toolMode == Mode.Select ? <ToolButtonSelectModeSelected onClick={() => { onModeButtonClickListener(Mode.Select); }}></ToolButtonSelectModeSelected> :
                    <ToolButtonSelectMode onClick={() => { onModeButtonClickListener(Mode.Select); }}></ToolButtonSelectMode>
                }
            </ToolModeSelecter>
            <ToolButtonSelecter>
                {
                    option.pencil &&
                    (
                        toolType == Tools.Pencil ? <ToolButtonPencilSelected onClick={() => { onToolButtonClickListener(Tools.Pencil); }}></ToolButtonPencilSelected> :
                        <ToolButtonPencil onClick={() => { onToolButtonClickListener(Tools.Pencil); }}></ToolButtonPencil>
                    )
                }
                {
                    option.box &&
                    (
                        toolType == Tools.Box ? <ToolButtonBoxSelected onClick={() => { onToolButtonClickListener(Tools.Box); }}></ToolButtonBoxSelected> :
                        <ToolButtonBox onClick={() => { onToolButtonClickListener(Tools.Box); }}></ToolButtonBox>
                    )
                }
                {
                    option.polygon &&
                    (
                        toolType == Tools.Polygon ? <ToolButtonPolygonSelected onClick={() => { onToolButtonClickListener(Tools.Polygon); }}></ToolButtonPolygonSelected> :
                        <ToolButtonPolygon onClick={() => { onToolButtonClickListener(Tools.Polygon); }}></ToolButtonPolygon>
                    )
                }
                {
                    option.length &&
                    (
                        toolType == Tools.Length ? <ToolButtonLengthSelected onClick={() => { onToolButtonClickListener(Tools.Length); }}></ToolButtonLengthSelected> :
                        <ToolButtonLength onClick={() => { onToolButtonClickListener(Tools.Length); }}></ToolButtonLength>
                    )
                }
                {
                    option.area &&
                    (
                        toolType == Tools.Area ? <ToolButtonAreaSelected onClick={() => { onToolButtonClickListener(Tools.Area); }}></ToolButtonAreaSelected> :
                        <ToolButtonArea onClick={() => { onToolButtonClickListener(Tools.Area); }}></ToolButtonArea>
                    )
                }
            </ToolButtonSelecter>
        </ToolNavigatorStyled>
    );
}

const defaultOption: ToolOption = {
    pencil: false,
    box: true,
    polygon: true,
    length: true,
    area: true
}

ToolNavigator.defaultProps = {
    option: defaultOption,
    lengthFormat: (line:number) => {return line + " px"},
    areaFormat: (area:number) => {return area + " px\xB2"}
};

export default ToolNavigator;