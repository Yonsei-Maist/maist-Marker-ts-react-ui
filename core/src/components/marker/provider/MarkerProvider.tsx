import { Feature, Graticule, Map as olMap } from 'ol';
import { defaults as defaultInteraction } from 'ol/interaction';
import React, { forwardRef, Ref, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { defaults } from 'ol/control';

import MapContext from '../context/MapContext';
import { ClassInfo } from '../context';
import { Select } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import { Geometry } from 'ol/geom';
import { Stroke } from 'ol/style';
import BaseMark from '../ui/mark/BaseMark';
import { AxiosInstance, AxiosRequestHeaders } from 'axios';
import { Alert, CircularProgress } from '@mui/material';
import { Map as OlMap } from 'ol';
import LabelProvider, { LabelProviderState } from './LabelProvider';
import { useReaderAddon } from './ReaderProvider';
import { CURRENT_INSTANCE, DRAWER_MAP, DRAW_OBJECT, FIT_POINT, IS_DRAWER_VECTOR, IS_MAIN_LAYER, MAP_HEIGHT, MAP_MEMO, MAP_WIDTH, MARK, MASK_LAYER } from '@/constants/tag';
import { LabelFormat } from '../ui/mark/BaseMark';
import BaseDrawer from '../ui/drawer/BaseDrawer';
import { MaskMark, MaskSettings, getMaskSettings } from '../ui/drawer/MaskDrawer';
import { DrawObject } from '@/lib/CanvasDrawer';
import { fitPoints } from '@/lib/sizeConverter';

export interface MapProviderState {
    pageLabelList: () => BaseMark[][];
    labelNameList: () => ClassInfo[];
    map: () => OlMap;
    memo: () => string;
    /* ---- 1.4+: 호스트가 편집기 상태를 제어하기 위한 메서드 ---- */
    selectedLabel: () => ClassInfo | undefined;
    setSelectedLabel: (labelName: string) => boolean;
    findMark: (id: string) => BaseMark | undefined;
    selectedIds: () => string[];
    selectMark: (id: string, exclusive?: boolean) => void;
    unselectMark: (id: string) => void;
    clearSelection: () => void;
    removeMark: (id: string) => void;
    setMarkLabel: (id: string, labelName: string) => boolean;
    setMarkMemo: (id: string, memo: string) => void;
    /* ---- 1.5+ ---- */
    setMarkData: (id: string, data: LabelFormat) => boolean;
    setMarkOrder: (id: string, order: number) => void;
    getMaskSettings: () => MaskSettings | undefined;
    setMaskSettings: (patch: Partial<MaskSettings>) => void;
    newInstance: () => void;
}

interface MapProviderProps {
    fileUri: string;
    fileBlob?: Blob;
    children?: React.ReactNode;
    axiosInstance?: AxiosInstance;
    labelNameList: ClassInfo[];
    header?: AxiosRequestHeaders;
    withCredentials?: boolean;
    memo?: string;
    load: boolean;
    /** OpenLayers 맵을 마운트할 요소. 없으면 예전처럼 id="map" 요소를 찾는다. */
    targetRef?: React.RefObject<HTMLElement | null>;
    onLabelsChange?: () => void;
    onSelectedLabelChange?: (label?: ClassInfo) => void;
    onSelectionChange?: (features?: Feature[]) => void;
};

function MapProvider({ fileUri, fileBlob, children, axiosInstance, labelNameList, header, withCredentials, memo, load, targetRef, onLabelsChange, onSelectedLabelChange, onSelectionChange }: MapProviderProps, ref: Ref<MapProviderState>) {
    const labelRef = useRef<LabelProviderState>(null);
    const { readFile, makeLayer } = useReaderAddon();

    const [map, setMap] = useState<OlMap>();
    const [isLoaded, setIsLoaded] = useState(false);

    const [{ loading, data, error, errorMessage }, refetch] = readFile(fileUri, fileBlob, [], axiosInstance, header, withCredentials);

    function getMemo() {
        if (map) {
            return map.get(MAP_MEMO);
        }

        return "";
    }

    function getPageLabelList() {
        if (labelRef.current) {
            let localPageLabelList: BaseMark[][] = [];
            for (let i = 0; i < labelRef.current.pageLabelList.size; i++) {
                let labelList = labelRef.current.pageLabelList.get(i + 1);

                localPageLabelList.push(labelList);
            }

            return localPageLabelList
        }

        return [];
    }

    function findMark(id: string): BaseMark | undefined {
        const state = labelRef.current;
        if (!state) return undefined;
        for (const list of state.pageLabelList.values()) {
            const found = list.find(m => m.feature?.getId() == id);
            if (found) return found;
        }
        return undefined;
    }

    function selectedIds(): string[] {
        return (labelRef.current?.selectedFeatures ?? []).map(f => String(f.getId()));
    }

    function selectMark(id: string, exclusive: boolean = true) {
        const mark = findMark(id);
        const state = labelRef.current;
        if (!mark || !state) return;
        // 인스턴스 마스크를 선택하면 이후 브러시가 그 인스턴스에 칠해진다
        if (mark instanceof MaskMark) map?.set(CURRENT_INSTANCE, id);
        if (exclusive) clearSelection();
        select(mark);
        const current = exclusive ? [] : (state.selectedFeatures ?? []);
        if (!current.includes(mark.feature)) state.setSelectedFeatures([...current, mark.feature]);
    }

    function unselectMark(id: string) {
        const mark = findMark(id);
        const state = labelRef.current;
        if (!mark || !state) return;
        unselect(mark);
        state.setSelectedFeatures((state.selectedFeatures ?? []).filter(f => f !== mark.feature));
    }

    function clearSelectionAll() {
        clearSelection();
        labelRef.current?.setSelectedFeatures(undefined);
    }

    function removeMark(id: string) {
        const mark = findMark(id);
        const state = labelRef.current;
        if (!mark || !state) return;
        unselect(mark);
        remove(mark);
        state.removeLabel(mark.feature);
    }

    function setMarkLabel(id: string, labelName: string): boolean {
        const mark = findMark(id);
        const state = labelRef.current;
        if (!mark || !state) return false;
        const label = state.labelNameList.find(o => o.labelName == labelName);
        if (!label) return false;
        mark.label = label;
        mark.feature.set(MARK, mark);
        if (mark instanceof MaskMark && label.color) {
            mark.recolor(label.color);
            map?.get(MASK_LAYER)?.getSource()?.changed();
        }
        redrawFeatures();
        state.refreshLabels();
        return true;
    }

    /** 좌표 수치 직접 입력: 저장 형식(LabelFormat)으로 도형을 교체한다 */
    function setMarkData(id: string, data: LabelFormat): boolean {
        const mark = findMark(id);
        const state = labelRef.current;
        if (!mark || !state || !map) return false;
        const drawerMap = map.get(DRAWER_MAP) as Map<string, BaseDrawer<BaseMark>> | undefined;
        const drawer = drawerMap?.get(mark.toolType);
        if (!drawer) return false;
        const fit = map.get(FIT_POINT) !== false;
        const dObj = map.get(DRAW_OBJECT) as DrawObject | undefined;
        const iW = fit ? map.get(MAP_WIDTH) : dObj?.width;
        const iH = fit ? map.get(MAP_HEIGHT) : dObj?.height;
        const conv = (pts?: number[]) => pts ? fitPoints(iW, iH, pts, false, fit) : undefined;
        const converted: LabelFormat = { ...data, coco: conv(data.coco) ?? [], pascal_voc: conv(data.pascal_voc), yolo: conv(data.yolo), depth: conv(data.depth) };
        const fresh = drawer.createMark(converted, mark.toolType, mark.memo);
        mark.feature.setGeometry(fresh.feature.getGeometry());
        // 도구별 부가 필드(order, depth 등) 복사
        for (const key of Object.keys(fresh)) {
            if (!['feature', 'id', 'label', 'toolType', 'memo'].includes(key)) {
                (mark as unknown as Record<string, unknown>)[key] = (fresh as unknown as Record<string, unknown>)[key];
            }
        }
        redrawFeatures();
        state.refreshLabels();
        return true;
    }

    function setMarkOrder(id: string, order: number) {
        const mark = findMark(id);
        const state = labelRef.current;
        if (!mark || !state) return;
        (mark as unknown as { order?: number }).order = order;
        redrawFeatures();
        state.refreshLabels();
    }

    function getMaskSettingsApi() {
        return map ? getMaskSettings(map) : undefined;
    }

    function setMaskSettingsApi(patch: Partial<MaskSettings>) {
        if (!map) return;
        Object.assign(getMaskSettings(map), patch);
        map.get(MASK_LAYER)?.getSource()?.changed();
    }

    function newInstance() {
        map?.set(CURRENT_INSTANCE, undefined);
    }

    function setMarkMemo(id: string, memoText: string) {
        const mark = findMark(id);
        const state = labelRef.current;
        if (!mark || !state) return;
        mark.memo = memoText;
        state.refreshLabels();
    }

    function setSelectedLabelByName(labelName: string): boolean {
        const state = labelRef.current;
        if (!state) return false;
        const label = state.labelNameList.find(o => o.labelName == labelName);
        if (!label) return false;
        state.setSelectedLabel(label);
        return true;
    }

    useImperativeHandle(ref, () => {
        return {
            pageLabelList: getPageLabelList,
            memo: getMemo,
            // 클래스 관리 대화상자에서 편집한 최신 목록을 돌려준다 (예전에는 초기 prop을 돌려줬다).
            labelNameList: () => labelRef.current?.labelNameList ?? labelNameList,
            map: () => map,
            selectedLabel: () => labelRef.current?.selectedLabel,
            setSelectedLabel: setSelectedLabelByName,
            findMark,
            selectedIds,
            selectMark,
            unselectMark,
            clearSelection: clearSelectionAll,
            removeMark,
            setMarkLabel,
            setMarkMemo,
            setMarkData,
            setMarkOrder,
            getMaskSettings: getMaskSettingsApi,
            setMaskSettings: setMaskSettingsApi,
            newInstance
        } as MapProviderState;
    });

    function clearSelection() {
        if (map) {
            let interactions = map.getInteractions();
            for (let i in interactions.getArray()) {
                let intercationItem = interactions.getArray()[i];
                if (intercationItem instanceof Select) {
                    let selectObj = intercationItem as Select;
                    selectObj.getFeatures().clear();

                    break;
                }
            }
        }
    }

    function unselect(mark: BaseMark) {
        if (map) {
            let interactions = map.getInteractions();
            for (let i in interactions.getArray()) {
                let intercationItem = interactions.getArray()[i];
                if (intercationItem instanceof Select) {
                    let selectObj = intercationItem as Select;
                    selectObj.getFeatures().remove(mark.feature);

                    break;
                }
            }
        }
    }

    function select(mark: BaseMark) {
        if (map) {
            let interactions = map.getInteractions();
            for (let i in interactions.getArray()) {
                let intercationItem = interactions.getArray()[i];
                if (intercationItem instanceof Select) {
                    let selectObj = intercationItem as Select;
                    selectObj.getFeatures().extend([mark.feature]);

                    break;
                }
            }
        }
    }

    function remove(marker: BaseMark) {
        if (map) {
            const vectorLayer = findVectorLayer();
            if (vectorLayer) {
                let source = vectorLayer.getSource();
                source.removeFeature(marker.feature);
            }
        }
    }

    function findVectorLayer() {
        const layers = map.getLayers().getArray();
        for (let layer of layers) {
            if (layer instanceof VectorLayer) {
                const isDrawerVector = layer.get(IS_DRAWER_VECTOR);
                if (isDrawerVector)
                    return layer;
            }
        }

        return undefined;
    }

    function findMainLayer() {
        const layers = map.getLayers().getArray();
        for (let layer of layers) {
            
            const isDrawerVector = layer.get(IS_MAIN_LAYER);
            if (isDrawerVector)
                return layer;
        }

        return undefined;
    }

    function redrawFeatures() {
        if (map) {
            const layer = findVectorLayer();
            if (layer) {
                layer.setStyle(layer.getStyle());
            }
        }
    }

    useEffect(() => {
        if (!load) {
            var interactions = defaultInteraction({ altShiftDragRotate: false, pinchRotate: false });
            const map = new olMap({
                interactions,
                controls: defaults({ zoom: false, rotate: false }).extend([]),
                target: targetRef?.current ?? 'map'
            });

            map.set(MAP_MEMO, memo);
            setMap(map);
            refetch();
            return () => map.setTarget(undefined);
        }
    }, [load]);

    useEffect(() => {
        if (data && map) {            
            let sourceData = makeLayer(map, fileUri, data, axiosInstance);

            let graticuleLayer = new Graticule({
                // the style to use for the lines, optional.
                strokeStyle: new Stroke({
                    color: 'rgba(255,120,0,0.9)',
                    width: 2,
                    lineDash: [0.5, 4],
                }),
                showLabels: false,
                wrapX: false,
            });

            graticuleLayer.setVisible(false);
            map.addLayer(sourceData.layer);
            map.addLayer(graticuleLayer);
            map.setView(sourceData.view);
            map.getViewport().addEventListener('contextmenu', function (evt) {
                evt.preventDefault();
            });

            setIsLoaded(true);
        }
    }, [data]);

    useEffect(() => {
        if (map) {
            map.set(MAP_MEMO, memo);
        }
    }, [memo]);

    useEffect(() => {
        if (fileBlob || fileUri) {
            if (map) {
                map.getLayers().clear();
                setIsLoaded(false);
                refetch();
            }
        }
    }, [fileBlob, fileUri]);

    return (
        <MapContext.Provider value={{ map, isLoaded, select, remove, unselect, clearSelection, redrawFeatures, findVectorLayer, findMainLayer }}>
            <LabelProvider ref={labelRef} labelNameList={labelNameList} onLabelsChange={onLabelsChange} onSelectedLabelChange={onSelectedLabelChange} onSelectionChange={onSelectionChange}>
                {
                    !loading &&
                    !load &&
                    error &&
                    <Alert severity='error'>{"Error !" + errorMessage}</Alert>
                }
                {
                    children
                }
                {
                    (loading || load) &&
                    <CircularProgress size={20} sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
                }
            </LabelProvider>
        </MapContext.Provider>
    );
}

export const useMap = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useAddon must be used within an AddonProvider');
    }

    return context;
}

const RefMapProvider = forwardRef(MapProvider);

export default RefMapProvider;