
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
import { constrainGeometry, fitPoints } from '@/lib/sizeConverter';
import { GeometryCollection, Polygon } from 'ol/geom';
import LongPressToggleButton from '../common/LongPressToggleButton';
import { useMap } from '../../provider/MarkerProvider';
import { useLabel } from '../../provider/LabelProvider';
import { useAddon } from '../../provider/AddonProvider';
import { DrawObject } from '@/lib/CanvasDrawer';
import { DRAWER_MAP, DRAW_OBJECT, FIT_POINT, IS_DRAWER_VECTOR, MAP_HEIGHT, MAP_WIDTH, MARK, MASK_LAYER, SELECTED_LABEL, TOOL_TYPE } from "@/constants/tag";
import ImageLayer from "ol/layer/Image";
import ImageCanvasSource from "ol/source/ImageCanvas";
import MaskDrawer, { createMaskCanvasFunction, getMaskSettings } from "../drawer/MaskDrawer";
import { Button, Slider, Stack, Typography } from "@mui/material";
import { CURRENT_INSTANCE } from "@/constants/tag";

enum Mode {
    Draw,
    Select
}

export interface ToolNavigatorProps {
    pageLabelInfo?: LabelInfo[][];
    fitPoint: boolean;
    modifyOnly?: boolean;
    /** 호스트가 요청한 도구 ('' = 선택 모드). 값이 바뀔 때마다 적용된다. (1.4+) */
    toolRequest?: { tool: string; seq: number };
    /** 사용자가 툴바에서 도구를 바꿨을 때 (1.4+) */
    onToolChange?: (tool: string) => void;
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

function ToolNavigator({ pageLabelInfo, fitPoint, modifyOnly, toolRequest, onToolChange }: ToolNavigatorProps) {
    const { map, isLoaded, findVectorLayer, findMainLayer } = useMap();
    const { pageLabelList, currentPageNo, initPageLabelList, selectedFeatures, setSelectedFeatures, labelNameList, addLabel, removeLabel, refreshLabels, selectedLabel } = useLabel();
    // 드로어(브러시·키포인트)가 현재 클래스를 읽을 수 있도록 맵에 실어 둔다
    useEffect(() => {
        if (map) map.set(SELECTED_LABEL, selectedLabel);
    }, [map, selectedLabel]);
    // 브러시 설정 UI 갱신용
    const [maskSettingsVersion, setMaskSettingsVersion] = useState(0);
    const { addons } = useAddon();

    const context = useRef({ drawerMap: new Map<string, BaseDrawer<BaseMark>>(), toolType: "" } as ToolContext);
    const keydownRef = useRef<((evt: KeyboardEvent) => void) | null>(null);
    const [toolType, setToolType] = useState("");
    const [toolMode, setToolMode] = useState(Mode.Draw);

    // 언마운트 시 document 키보드 리스너 정리 (리마운트마다 누적되던 누수 방지)
    useEffect(() => {
        return () => {
            if (keydownRef.current) {
                document.removeEventListener('keydown', keydownRef.current, false);
                keydownRef.current = null;
            }
        };
    }, []);

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

            // 브러시 스트로크가 끝나면 목록을 갱신해 onChange가 발화되도록 한다
            (draw as any).on('strokeend', () => refreshLabels());

            value.createModify(layer, select);
        });

        const map_ = layer.get('map') ?? map;
        if (map_) {
            map_.set(DRAWER_MAP, drawerMap);
            map_.set(FIT_POINT, fitPoint);
        }
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
                                ...item.data,
                                depth: item.data.depth ? fitPoints(iW, iH, item.data.depth, false, fitPoint) : undefined,
                                coco: item.data.coco ? fitPoints(iW, iH, item.data.coco, false, fitPoint) : undefined,
                                pascal_voc: item.data.pascal_voc ? fitPoints(iW, iH, item.data.pascal_voc, false, fitPoint) : undefined,
                                yolo: item.data.yolo ? fitPoints(iW, iH, item.data.yolo, false, fitPoint) : undefined
                            }
                        } else {
                            data = item.data;
                        }

                        mark = drawer.createMark(data, toolType);

                        mark.label = labelNameList.find(o => o.labelName == item.label);
                        mark.memo = item.memo;
                        // 저장 데이터에 id가 있으면 그대로 복원해 호스트가 같은 id로 추적할 수 있게 한다.
                        mark.feature.setId(item.id || uuidv4());
                        mark.feature.set(MARK, mark);

                        return mark;
                    }
                });
            } else {
                initPageLabelList(total);
            }
        }
    }

    function applyTool(type: string) {
        if (type === "") {
            setToolType("");
            setToolMode(Mode.Select);
        } else {
            setToolMode(Mode.Draw);
            setToolType(type);
        }
    }

    function onModeButtonClickListener(type: Mode) {
        setToolType("");
        setToolMode(type);
        onToolChange?.("");
    }

    function onToolButtonClickListener(type: string) {
        setToolMode(Mode.Draw);
        setToolType(type);
        onToolChange?.(type);
    }

    // 호스트의 도구 변경 요청 (초기값은 맵 로드 이펙트에서 적용하고, 이후 변경만 여기서 처리)
    const toolRequestRef = useRef(toolRequest);
    toolRequestRef.current = toolRequest;
    useEffect(() => {
        if (toolRequest && toolRequest.seq > 0 && map && isLoaded) {
            applyTool(toolRequest.tool);
        }
    }, [toolRequest, map, isLoaded]);

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

                // 세그먼테이션 마스크 합성 레이어 (벡터 레이어 아래)
                const maskLayer = new ImageLayer({
                    source: new ImageCanvasSource({
                        canvasFunction: createMaskCanvasFunction(map, layer),
                        ratio: 1
                    })
                });
                maskLayer.setExtent(extent);
                map.set(MASK_LAYER, maskLayer);
                map.addLayer(maskLayer);
                // 벡터 레이어가 위에 오도록 순서 조정
                map.removeLayer(layer);
                map.addLayer(layer);

                addCustomInteraction("select", select);

                translate.setActive(false);
                let snap = createSnap(source);
                snap.setActive(false);

                createDrawers(layer, select);

                addCustomInteraction("removeModify", removeModify);

                drawerMap.forEach((value, key) => {
                    if (key != "") {
                        const modify = value.getModify();
                        // 도형 수정이 끝나면 목록을 갱신해 onChange가 발화되도록 한다.
                        modify.on('modifyend', () => refreshLabels());
                        addCustomInteraction(key + "_modify", modify);
                    }
                });

                translate.on('translateend', () => refreshLabels());
                addCustomInteraction("translate", translate);

                drawerMap.forEach((value, key) => {
                    addCustomInteraction(key + "_create", value.getDraw());
                });

                addCustomInteraction("snap", snap);

                var keydown = function (evt: KeyboardEvent) {
                    if (modifyOnly) return;
                    // 메모 입력 등 텍스트 필드에서 Backspace를 누를 때 선택 도형이 지워지면 안 된다.
                    const target = evt.target as HTMLElement | null;
                    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
                    var key = evt.key;
                    if (key == "Backspace" || key == "Delete") {
                        const { removeModify } = context.current;
                        removeModify.setActive(!removeModify.getActive());
                    }
                };

                if (keydownRef.current) {
                    document.removeEventListener('keydown', keydownRef.current, false);
                }
                keydownRef.current = keydown;
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

            // 초기 도구: 호스트가 요청한 것(defaultTool)이 있으면 그것, 없으면 선택 모드.
            // (사용자 조작이 아니므로 onToolChange는 부르지 않는다)
            applyTool(toolRequestRef.current?.tool ?? "");
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

    const activeDrawer = context.current.drawerMap.get(toolType);
    const maskActive = toolMode == Mode.Draw && activeDrawer instanceof MaskDrawer;
    const maskSettings = map ? getMaskSettings(map) : undefined;
    const updateMask = (patch: Partial<typeof maskSettings>) => {
        if (!map || !maskSettings) return;
        Object.assign(maskSettings, patch);
        map.get(MASK_LAYER)?.getSource()?.changed();
        setMaskSettingsVersion(v => v + 1);
    };
    void maskSettingsVersion;

    return (
        <>
        {
            maskActive && maskSettings &&
            <Box position={"absolute"} left={"75px"} top={"15px"} sx={{ background: "white", borderRadius: 1, p: 1.5, width: 190, boxShadow: 1 }}>
                <Stack spacing={0.5}>
                    <ToggleButtonGroup size="small" exclusive value={maskSettings.mode} onChange={(_, v) => v && updateMask({ mode: v })}>
                        <ToggleButton value="paint" sx={{ px: 1.5, py: 0.3, fontSize: 12 }}>브러시</ToggleButton>
                        <ToggleButton value="erase" sx={{ px: 1.5, py: 0.3, fontSize: 12 }}>소거</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption">크기 {maskSettings.size}px</Typography>
                    <Slider size="small" min={1} max={200} value={maskSettings.size} onChange={(_, v) => updateMask({ size: v as number })} />
                    <Typography variant="caption">투명도 {Math.round(maskSettings.opacity * 100)}%</Typography>
                    <Slider size="small" min={0.1} max={1} step={0.05} value={maskSettings.opacity} onChange={(_, v) => updateMask({ opacity: v as number })} />
                    {
                        (activeDrawer as MaskDrawer).instance &&
                        <Button size="small" variant="outlined" onClick={() => { map?.set(CURRENT_INSTANCE, undefined); setMaskSettingsVersion(v => v + 1); }}>
                            새 인스턴스
                        </Button>
                    }
                </Stack>
            </Box>
        }
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
        </>
    );
}

export default ToolNavigator;