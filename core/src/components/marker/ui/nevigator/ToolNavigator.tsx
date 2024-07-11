
import React, { useEffect, useRef, useState } from 'react';
import { Vector } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer'
import { Select, Modify, Snap, Translate, Interaction } from 'ol/interaction';

import { DrawEvent } from 'ol/interaction/Draw';
import {
    never,
    platformModifierKeyOnly,
    primaryAction,
} from 'ol/events/condition';
import { Feature } from 'ol';

import { v4 as uuidv4 } from 'uuid';
import BaseDrawer from '../drawer/BaseDrawer';
import NoneDrawer from '../drawer/NoneDrawer';

import { constrainEllipse } from '../drawer/EllipseDrawer';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { HighlightAlt, HighlightAltOutlined } from '@mui/icons-material';
import BaseMark, { LabelFormat, LabelInfo } from '../mark/BaseMark';
import Geometry from 'ol/geom/Geometry';
import { constrainGeometry, fitPoints } from '../../../../lib/sizeConverter';
import { GeometryCollection, Polygon } from 'ol/geom';
import LongPressToggleButton from '../common/LongPressToggleButton';
import { useMap } from '../../provider/MarkerProvider';
import { useLabel } from '../../provider/LabelProvider';
import { useAddon } from '../../provider/AddonProvider';
import { DrawObject } from '../../../../lib/CanvasDrawer';
import { DRAW_OBJECT, IS_DRAWER_VECTOR, MAP_HEIGHT, MAP_WIDTH, MARK, TOOL_TYPE } from "../../../../constants/tag";

enum Mode {
    Draw,
    Select
}

export interface ToolNavigatorProps {
    pageLabelInfo?: LabelInfo[][];
    fitPoint: boolean;
    modifyOnly?: boolean;
};

export interface ToolContext {
    drawerMap: Map<string, BaseDrawer<BaseMark>>;
    removeModify: Modify;
    snap: Snap;
    source: Vector<Feature<Geometry>>;
    translate: Translate;
    select: Select;
    toolType: string;
}

function ToolNavigator({ pageLabelInfo, fitPoint, modifyOnly }: ToolNavigatorProps) {
    const { map, isLoaded, findVectorLayer, findMainLayer } = useMap();
    const { pageLabelList, currentPageNo, initPageLabelList, selectedFeatures, setSelectedFeatures, labelNameList, addLabel, removeLabel } = useLabel();
    const { addons } = useAddon();

    const context = useRef({ drawerMap: new Map<string, BaseDrawer<BaseMark>>(), toolType: "" } as ToolContext);
    const [toolType, setToolType] = useState("");
    const [toolMode, setToolMode] = useState(Mode.Draw);

    function createDrawers(layer: VectorLayer<Feature<Geometry>>, select: Select) {
        const { drawerMap } = context.current;
        drawerMap.clear();
        drawerMap.set("", new NoneDrawer());

        addons.map((o, i) => {
            if (Array.isArray(o.items)) {
                o.items.map((e) => {
                    drawerMap.set(o.id + "." + e.name, e.drawer);
                });
            } else {
                drawerMap.set(o.id, o.items.drawer);
            }
        });

        drawerMap.forEach((value) => {
            let draw = value.createDraw(layer);

            draw.on('drawend', (evt: DrawEvent) => {
                let feature = evt.feature;

                feature.setId(uuidv4());
                feature.set(TOOL_TYPE, context.current.toolType);

                let mark = value.fromFeature(feature);
                feature.set(MARK, mark);
                addLabel(mark);
            });

            value.createModify(layer, select);
        });
    }

    function getDrawer(source: Vector, select: Select): BaseDrawer<BaseMark> | undefined {
        return context.current.drawerMap.get(toolType);
    }

    function createSnap(source: Vector): Snap {
        return new Snap({ source: source });
    }

    const load = () => {
        if (map && isLoaded) {
            let total = 1;
            let width = map.get(MAP_WIDTH);
            let height = map.get(MAP_HEIGHT);
            const drawObj = map.get(DRAW_OBJECT) as DrawObject;
            if (drawObj) {
                total = drawObj.totalPageNo;
            }

            if (pageLabelInfo) {
                const { drawerMap } = context.current;

                initPageLabelList(total, pageLabelInfo, (item: LabelInfo) => {
                    let drawer = drawerMap.get(item.toolType);
                    if (drawer) {
                        let mark: BaseMark;
                        let data: string | LabelFormat;
                        let toolType = item.toolType;
                        if (typeof item.data !== "string") {
                            const dObj = map.get(DRAW_OBJECT) as DrawObject;
                            let iW: number, iH: number;
                            if (fitPoint) {
                                iW = width;
                                iH = height;
                            } else {
                                iW = dObj.width;
                                iH = dObj.height;
                            }

                            data = {
                                coco: item.data.coco ? fitPoints(iW, iH, item.data.coco, false, fitPoint) : undefined,
                                pascal_voc: item.data.pascal_voc ? fitPoints(iW, iH, item.data.pascal_voc, false, fitPoint) : undefined
                            }
                        } else {
                            data = item.data;
                        }

                        mark = drawer.createMark(data, toolType);

                        mark.label = labelNameList.find(o => o.labelName == item.label);
                        mark.feature.setId(uuidv4());
                        mark.feature.set(MARK, mark);

                        return mark;
                    }
                });
            } else {
                initPageLabelList(total);
            }
        }
    }

    function onModeButtonClickListener(type: Mode) {
        setToolType("");
        setToolMode(type);
    }

    function onToolButtonClickListener(type: string) {
        setToolMode(Mode.Draw);
        setToolType(type);
    }

    function checkActive() {
        if (toolMode == Mode.Select)
            return toolMode;
        else
            return toolType;
    }

    function addCustomInteraction(tag: string, interaction: Interaction) {
        if (map) {
            const interactions = map.getInteractions().getArray();
            for (let i = 0; i < interactions.length; i++) {
                const interaction_ = interactions[i];
                const tags = interaction_.get(tag);
                if (tags) {
                    map.removeInteraction(interaction_);
                    break;
                }
            }

            interaction.set(tag, true);
            map.addInteraction(interaction);
        }
    }

    useEffect(() => {
        if (map && isLoaded) {
            const { drawerMap } = context.current;
            const vectorLayer = findVectorLayer();

            if (!vectorLayer) {
                const mainLayer = findMainLayer();
                let extent = mainLayer.getExtent();
                let source = new Vector();

                let layer = new VectorLayer({
                    source: source,
                    extent: extent,
                    style: (feature) => {
                        let type = feature.get(TOOL_TYPE);
                        let drawer = drawerMap.get(type);
                        return drawer.getVectorStyle(feature);
                    }
                });

                layer.set(IS_DRAWER_VECTOR, true);

                let select = new Select({
                    style: function (feature: Feature) {
                        let type = feature.get(TOOL_TYPE);
                        let drawer = drawerMap.get(type);
                        return drawer.getSelectStyle(feature);
                    }
                });

                select.setActive(false);
                select.on('select', function (e: any) {
                    const { drawerMap } = context.current;

                    let featureList = [] as Feature[];
                    let list = e.target.getFeatures().getArray() as Feature[];
                    let labelList = pageLabelList.get(currentPageNo);
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
                        key = "";
                    }

                    let map = drawerMap.get(key);
                    if (map)
                        map.activeModify(context.current);

                    if (setSelectedFeatures) {
                        setSelectedFeatures(featureList);
                    }

                    if (select.getFeatures().getLength() == 1) {
                        translate.setActive(true);
                    } else {
                        translate.setActive(false);
                    }
                });

                let removeModify = new Modify({ features: select.getFeatures(), condition: never });
                removeModify.on("change:active", function () {
                    if (context.current) {
                        const { select, source } = context.current;

                        let selected = select.getFeatures();
                        let array = selected.getArray();
                        for (let i = 0; i < array.length; i++) {
                            removeLabel(array[i]);
                            source.removeFeature(array[i]);
                        }
                    }
                });

                let translate = new Translate({
                    condition: function (event) {
                        return primaryAction(event) && platformModifierKeyOnly(event);
                    },
                    features: select.getFeatures()
                });

                // Constrain during translation
                translate.on('translating', function (event) {
                    var features = event.features.getArray();
                    features.forEach(function (feature) {
                        var geometry = feature.getGeometry();
                        if (geometry instanceof GeometryCollection) {
                            constrainEllipse(geometry as GeometryCollection, extent);
                        } else {
                            constrainGeometry(geometry as Polygon, extent);
                        }
                    });
                });

                // Final check after translation
                translate.on('translateend', function (event) {
                    var features = event.features.getArray();
                    features.forEach(function (feature) {
                        var geometry = feature.getGeometry();
                        if (geometry instanceof GeometryCollection) {
                            constrainEllipse(geometry as GeometryCollection, extent);
                        } else {
                            constrainGeometry(geometry as Polygon, extent);
                        }
                    });
                });

                map.addLayer(layer);
                addCustomInteraction("select", select);

                translate.setActive(false);
                let snap = createSnap(source);
                snap.setActive(false);

                createDrawers(layer, select);

                addCustomInteraction("removeModify", removeModify);

                drawerMap.forEach((value, key) => {
                    if (key != "")
                        addCustomInteraction(key + "_modify", value.getModify());
                });

                addCustomInteraction("translate", translate);

                drawerMap.forEach((value, key) => {
                    addCustomInteraction(key + "_create", value.getDraw());
                });

                addCustomInteraction("snap", snap);

                var keydown = function (evt: KeyboardEvent) {
                    if (modifyOnly) return;
                    var key = evt.key;
                    if (key == "Backspace" || key == "Delete") {
                        const { removeModify } = context.current;
                        removeModify.setActive(!removeModify.getActive());
                    }
                };

                document.addEventListener('keydown', keydown, false);

                let mapTmp = drawerMap.get(toolType);
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
                    select,
                    drawerMap
                }
            }

            onModeButtonClickListener(Mode.Select);
        }
    }, [map, isLoaded]);

    useEffect(() => {
        load();
    }, [pageLabelInfo, map, isLoaded]);

    useEffect(() => {
        const { source } = context.current;

        if (source) {
            source.clear();

            let labelInfo = pageLabelList.get(currentPageNo);

            if (labelInfo) {
                for (let i = 0; i < labelInfo.length; i++) {
                    let mark = labelInfo[i];
                    source.addFeature(mark.feature);
                }
            }
        }

    }, [pageLabelList, currentPageNo]);

    useEffect(() => {
        if (context.current && map) {
            const { source, select } = context.current;

            if (selectedFeatures && setSelectedFeatures)
                setSelectedFeatures(undefined);

            select.getFeatures().clear();
            let drawer = getDrawer(source, select);
            if (drawer)
                drawer.activeDraw(context.current);
            let newSnap = createSnap(source);

            addCustomInteraction("snap", newSnap);
            context.current.toolType = toolType;
        }
    }, [toolType]);

    useEffect(() => {
        if (context.current && map) {
            const { select, translate, drawerMap } = context.current;

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
                let mapNone = drawerMap.get("");
                if (mapNone) {
                    mapNone.activeDraw(context.current);
                    mapNone.activeModify(context.current);
                }

                select.setActive(true);
            }
        }
    }, [toolMode]);

    return (
        <Box position={"absolute"} left={"15px"} top={"15px"}>
            <ToggleButtonGroup value={checkActive()} orientation='vertical' sx={{ background: "white" }}>
                <ToggleButton value={Mode.Select} key={Mode.Select} onClick={() => { onModeButtonClickListener(Mode.Select); }}>
                    {
                        toolMode == Mode.Select ?
                            <HighlightAlt /> :
                            <HighlightAltOutlined />
                    }
                </ToggleButton>
                {
                    !modifyOnly &&
                    addons.map((o, i) => {
                        if (Array.isArray(o.items)) {
                            return <LongPressToggleButton
                                value={"tools_" + i}
                                key={"tools_" + i}
                                options={o.items}
                                toolType={toolType}
                                onClickOption={onToolButtonClickListener} />
                        } else {
                            return <ToggleButton value={o.id} key={o.id + "" + i} onClick={() => { onToolButtonClickListener(o.id); }}>
                                {toolType == o.id ? o.items.selectedIcon : o.items.unselectedIcon}
                            </ToggleButton>
                        }
                    })
                }
            </ToggleButtonGroup>
        </Box>
    );
}

export default ToolNavigator;