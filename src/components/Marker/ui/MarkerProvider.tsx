import { Feature, Graticule, Map as olMap } from 'ol';
import {defaults as defaultInteraction} from 'ol/interaction';
import React, { forwardRef, Ref, useEffect, useImperativeHandle, useState } from 'react';
import dziReader, { makeLayer } from "../../../api/SourceReader";

import { defaults } from 'ol/control';
import { Vector } from 'ol/source';

import MapContext, { MapObject, MAP_MEMO } from '../context/MapContext';
import {LabelContext, LabelContextObject } from '../context';
import { Select } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import { Geometry } from 'ol/geom';
import { Stroke } from 'ol/style';
import BaseMark from './mark/BaseMark';
import { AxiosInstance } from 'axios';
import { Alert, CircularProgress } from '@mui/material';
import { IS_DRAWER_VECTOR, Tools } from './ToolNavigator';
import { HeaderString } from '../../../lib/dicomReader';
import { LabelInfo } from './Marker';

export interface MapProviderState {
    pageLabelList: BaseMark[][],
    memo?: string
}

export interface LabelNameInfo {
    toolType: Tools;
    labelNameList: string[];
}

type MapProviderProps = {
    dziUrl: string;
    children?: React.ReactNode;
    axiosInstance?: AxiosInstance;
    labelNameList: LabelNameInfo[];
    header?: HeaderString[];
    withCredentials?: boolean;
    memo?: string;
    load: boolean;
};

function MapProvider({ dziUrl, children, axiosInstance, labelNameList, header, withCredentials, memo, load }: MapProviderProps, ref:Ref<MapProviderState>) {
    const [mapObj, setMapObj] = useState({isLoaded: false} as MapObject);
    const [labelContext, setLabelContext] = useState({pageLabelList: new Map<number, BaseMark[]>(), currentPageNo: 1, globalLabelNameList: [] as string[]} as LabelContextObject);
    const [{ loading, data, error }, refetch] = dziReader(dziUrl, [], axiosInstance, header, withCredentials);

    useImperativeHandle(ref, () => {
        let pageLabelList = [];
        for (let i=0;i<labelContext.pageLabelList.size;i++) {
            let labelList = labelContext.pageLabelList.get(i + 1);

            pageLabelList.push(labelList);
        }

        return {
            pageLabelList: pageLabelList,
            memo: mapObj.map ? mapObj.map.get(MAP_MEMO) : memo
        } as MapProviderState;
    });

    function initPageLabelList(pages: number, pageLabelInfo?: LabelInfo[][], converter?: (label: LabelInfo) => BaseMark) {
        
        let pageLabelList = labelContext.pageLabelList
        if (pageLabelList.size != pages && !pageLabelInfo) {
            pageLabelList.clear();

            for (let i =0;i< pages;i++)
                pageLabelList.set(i + 1, [] as BaseMark[]);
        }

        if (pageLabelInfo && converter) {
            pageLabelList.clear();

            for (let i =0 ;i<pageLabelInfo.length;i++) {
                let labelInfo = pageLabelInfo[i];
                let markList = [] as BaseMark[];
                for (let j =0;j<labelInfo.length;j++) {
                    markList.push(converter(labelInfo[j]));
                }

                pageLabelList.set(i + 1, markList);
            }
        }

        setLabelContext(() => ({...labelContext, pageLabelList: new Map(pageLabelList), setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
    }

    function setCurrentPageNo(page: number) {
        labelContext.currentPageNo = page;
        setLabelContext(() => ({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
    }

    function getLabelNameList(toolType: Tools) {
        let labelNameStrList = labelNameList.find((o) => o.toolType == toolType);
        return labelNameStrList ? [...labelNameStrList.labelNameList]: [] as string[]
    }

    function toolTypeChanged(toolType: Tools) {
        let globalLabelNameList = getLabelNameList(toolType);

        setLabelContext(() => ({...labelContext, globalLabelNameList, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
    }

    function refresh() {
        setLabelContext(() => ({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
    }

    function setSelectedFeatures(features?: Feature[]) {
        setLabelContext(() => ({...labelContext, selectedFeatures: features, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
    }

    function addLabel(mark: BaseMark) {
        labelContext.pageLabelList.get(labelContext.currentPageNo).push(mark);
        setLabelContext(() => ({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
    }

    function removeLabel(feature: Feature) {
        let removeIdx = -1;
        let labelList = labelContext.pageLabelList.get(labelContext.currentPageNo);
        for (let i = 0;i<labelList.length;i++) {
            let originListId = labelList[i].feature.getId();
            let candidateRemovingId = feature.getId();
            if (originListId == candidateRemovingId)
                removeIdx = i;
        }

        if (removeIdx > -1) {
            labelList.splice(removeIdx, 1);
            setLabelContext(() => ({...labelContext, selectedFeatures: undefined, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
        }
    }

    function clearSelection() {
        const {map} = mapObj;
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

        setMapObj({...mapObj, select, remove, unselect, clearSelection});
    }

    function unselect(mark: BaseMark) {
        const {map} = mapObj;
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

        setMapObj({...mapObj, select, remove, unselect, clearSelection});
    }

    function select(mark: BaseMark) {
        const {map} = mapObj;
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

        setMapObj({...mapObj, select, remove, unselect, clearSelection});
    }

    function remove(marker: BaseMark) {
        const {map} = mapObj;
        if (map) {
            let layers = map.getLayers();
            for (let i in layers.getArray()) {
                let layerItem = layers.getArray()[i];

                if (layerItem instanceof VectorLayer) {
                    let vectorLayer = layerItem as VectorLayer<Vector<Geometry>>;
                    let source = vectorLayer.getSource();
                    source.removeFeature(marker.feature);
                }
            }
        }

        setMapObj({...mapObj, select, remove, unselect, clearSelection});
    }

    useEffect(() => {
        if (!load) {
            var interactions = defaultInteraction({altShiftDragRotate:false, pinchRotate:false}); 
            const map = new olMap({
                interactions,
                controls: defaults({ zoom: false, rotate: false}).extend([]),
                target: 'map'
            });
            
            map.set(MAP_MEMO, memo);
            setMapObj({...mapObj, map: map, remove, select, unselect, clearSelection});
            setLabelContext(() => ({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList, setCurrentPageNo, initPageLabelList}));
            
            refetch();
            return () => map.setTarget(undefined);
        }
    }, [load]);

    useEffect(() => {
        if (data) {
            let map = mapObj.map;
            let sourceData = makeLayer(map, dziUrl, data, axiosInstance);

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
            map?.addLayer(sourceData.layer);
            map?.addLayer(graticuleLayer);
            map?.setView(sourceData.view);
            map.getViewport().addEventListener('contextmenu', function (evt) {
                evt.preventDefault();
            });
            
            setMapObj({...mapObj, isLoaded: true, select, remove, unselect, clearSelection});
        }
    }, [data]);

    useEffect(() => {
        const {map} = mapObj;
        if (map) {
            map.set(MAP_MEMO, memo);
        }
    }, [memo]);

    return (
        <MapContext.Provider value={mapObj}>
            <LabelContext.Provider value={labelContext}>
                {
                    !loading &&
                    !load &&
                    error &&
                    <Alert severity='error'>{"Error !"}</Alert>
                }
                {
                    children
                }
                {
                    (loading || load) &&
                    <CircularProgress size={20} sx={{position: "absolute", top: "50%", left: "50%", transform:"translate(-50%, -50%)"}}/>
                }
            </LabelContext.Provider>
        </MapContext.Provider>
    );
}

const RefMapProvider = forwardRef(MapProvider);

export default RefMapProvider;