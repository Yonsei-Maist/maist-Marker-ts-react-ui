
import React, { useEffect, useRef, useState } from 'react';
import { Vector } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer'
import { Select, Modify, Snap, Translate } from 'ol/interaction';

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
import { LabelInfo } from '../Marker';

import { constrainEllipse } from '../drawer/EllipseDrawer';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { HighlightAlt, HighlightAltOutlined } from '@mui/icons-material';
import BaseMark from '../mark/BaseMark';
import Geometry from 'ol/geom/Geometry';
import { PDFObject } from '../../../../api/pdfReader';
import { PDF_OBJECT } from '../controls/PDFPageControl';
import { constrainGeometry } from '../../../../lib/sizeConverter';
import { GeometryCollection, Polygon } from 'ol/geom';
import LongPressToggleButton from '../common/LongPressToggleButton';
import { useMap } from '../../provider/MarkerProvider';
import { useLabel } from '../../provider/LabelProvider';
import { useAddon } from '../../provider/AddonProvider';

export const TOOL_TYPE = "TOOL_TPYE";
export const TOOL_MEMO = "TOOL_MEMO";
export const MARK = "MARK";

export const IS_DRAWER_VECTOR = "IS_DRAWER_VECTOR";

enum Mode {
    Draw,
    Select
}

export interface ToolNavigatorProps {
    pageLabelInfo?: LabelInfo[][];
};

export interface ToolContext {
    drawerMap: Map<string, BaseDrawer<BaseMark>>;
    removeModify: Modify;
    snap: Snap;
    source: Vector<Feature<Geometry>>;
    layer: VectorLayer<Feature<Geometry>>;
    translate: Translate;
    select: Select;
    toolType: string;
}

function ToolNavigator({ pageLabelInfo }: ToolNavigatorProps) {
    const { map, isLoaded } = useMap();
    const { pageLabelList, currentPageNo, initPageLabelList, selectedFeatures, setSelectedFeatures, labelNameList, addLabel, removeLabel } = useLabel();
    const { addons } = useAddon();

    const context = useRef({ drawerMap: new Map<string, BaseDrawer<BaseMark>>(), toolType: ""} as ToolContext);
    const [toolType, setToolType] = useState("");
    const [toolMode, setToolMode] = useState(Mode.Draw);

    function createDrawers(layer: VectorLayer<Feature<Geometry>>, select: Select) {
        const { drawerMap } = context.current;
        drawerMap.set("", new NoneDrawer());
        
        addons.map((o, i) => {
            if (Array.isArray(o)) {
                o.map((e) => {
                    drawerMap.set(e.id, e.drawer);
                });
            } else {
                drawerMap.set(o.id, o.drawer);
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
            const pdfObject = map.get(PDF_OBJECT) as PDFObject;
            if (pdfObject) {
                total = pdfObject.pages.length;
            }

            if (pageLabelInfo) {
                const { drawerMap } = context.current;

                initPageLabelList(total, pageLabelInfo, (item: LabelInfo) => {
                    let drawer = drawerMap.get(item.toolType);
                    if (drawer) {
                        let mark = drawer.createMark(item.data, item.toolType);
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

    useEffect(() => {
        if (map && isLoaded) {
            const { drawerMap } = context.current;
            if (!context.current.layer) {
                let extent = map.getLayers().item(0).getExtent()
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
                map.addInteraction(select);

                translate.setActive(false);
                let snap = createSnap(source);
                snap.setActive(false);

                createDrawers(layer, select);

                map.addInteraction(removeModify);

                context.current.drawerMap.forEach((value, key) => {
                    if (key != "")
                        map.addInteraction(value.getModify());
                });

                map.addInteraction(translate);

                context.current.drawerMap.forEach((value) => {
                    map.addInteraction(value.getDraw());
                });

                map.addInteraction(snap);

                var keydown = function (evt: KeyboardEvent) {
                    var key = evt.key;
                    if (key == "Backspace" || key == "Delete") {
                        const { removeModify } = context.current;
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
            }
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
                    addons.map((o, i) => {
                        if (Array.isArray(o)) {
                            return <LongPressToggleButton
                                value={"tools_" + i}
                                key={"tools_" + i}
                                options={o}
                                toolType={toolType}
                                onClickOption={onToolButtonClickListener} />
                        } else {
                            return <ToggleButton value={o.id} key={o.id + "" + i} onClick={() => { onToolButtonClickListener(o.id); }}>
                                {toolType == o.id ? o.selectedIcon : o.unselectedIcon}
                            </ToggleButton>
                        }
                    })
                }
            </ToggleButtonGroup>
        </Box>
    );
}

export default ToolNavigator;