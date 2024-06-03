import { Feature, Graticule, Map as olMap } from 'ol';
import {defaults as defaultInteraction} from 'ol/interaction';
import React, { forwardRef, Ref, useEffect, useImperativeHandle, useState } from 'react';
import dziReader, { makeLayer } from "../../../api/SourceReader";

import { defaults } from 'ol/control';

import MapContext, { MapObject, MAP_MEMO } from '../context/MapContext';
import {LabelContext, LabelContextObject, LabelInformation } from '../context';
import { Select } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import { Geometry } from 'ol/geom';
import { Stroke } from 'ol/style';
import BaseMark from '../ui/mark/BaseMark';
import { AxiosInstance } from 'axios';
import { Alert, CircularProgress } from '@mui/material';
import { HeaderString } from '../../../lib/dicomReader';
import { LabelInfo } from '../ui/Marker';
import {Map as OlMap} from 'ol';

export interface MapProviderState {
    pageLabelList: BaseMark[][];
    labelNameList: LabelInformation[];
    map: OlMap;
    getMemo: () => string;
}

type MapProviderProps = {
    dziUrl: string;
    children?: React.ReactNode;
    axiosInstance?: AxiosInstance;
    labelNameList: LabelInformation[];
    header?: HeaderString[];
    withCredentials?: boolean;
    memo?: string;
    load: boolean;
};

function MapProvider({ dziUrl, children, axiosInstance, labelNameList, header, withCredentials, memo, load }: MapProviderProps, ref:Ref<MapProviderState>) {
    const [mapObj, setMapObj] = useState({isLoaded: false} as MapObject);
    const [labelContext, setLabelContext] = useState({pageLabelList: new Map<number, BaseMark[]>(), currentPageNo: 1, labelNameList: labelNameList} as LabelContextObject);
    const [{ loading, data, error }, refetch] = dziReader(dziUrl, [], axiosInstance, header, withCredentials);

    function getMemo() {
        const {map} = mapObj;
        if (map) {
            return map.get(MAP_MEMO);
        }

        return "";
    }

    useImperativeHandle(ref, () => {
        let pageLabelList = [];
        for (let i=0;i<labelContext.pageLabelList.size;i++) {
            let labelList = labelContext.pageLabelList.get(i + 1);

            pageLabelList.push(labelList);
        }

        const {map} = mapObj;
        return {
            pageLabelList: pageLabelList,
            getMemo: getMemo,
            labelNameList: labelContext.labelNameList,
            map: map
        } as MapProviderState;
    });

    function initPageLabelList(pages: number, pageLabelInfo?: LabelInfo[][], converter?: (label: LabelInfo) => BaseMark) {
        
        let pageLabelList = labelContext.pageLabelList
        if (pageLabelList.size != pages && !pageLabelInfo) {
            pageLabelList.clear();

            for (let i =0;i< pages;i++) {
                pageLabelList.set(i + 1, [] as BaseMark[]);
            }
        }

        if (pageLabelInfo && converter) {
            if (pageLabelInfo.length != pages) {
                throw Error("Saved label list and number of pages must be same: " + pageLabelInfo.length + ", " + pages + " or do not set this.");
            }

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

        labelContext.pageLabelList = new Map(pageLabelList);
        refresh();
    }

    function setCurrentPageNo(page: number) {
        labelContext.currentPageNo = page;
        refresh();
    }

    function refresh() {
        let newObj = {...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, setCurrentPageNo, initPageLabelList, setLabelNameList, setSelectedLabel};
        
        setLabelContext(() => ({...newObj}));
    }

    function setSelectedFeatures(features?: Feature[]) {
        labelContext.selectedFeatures = features ? [...features] : features;
        refresh();    
    }

    function addLabel(mark: BaseMark) {
        labelContext.pageLabelList.get(labelContext.currentPageNo).push(mark);
        refresh();    
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
            labelContext.selectedFeatures = undefined;
            refresh();    
        }
    }

    function setMap(obj?: any) {
        let newObj = {...mapObj, select, remove, unselect, clearSelection, redrawFeatures};
        if (obj) {
            newObj = {...newObj, ...obj};
        }

        setMapObj(() =>({...newObj}));
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

        setMap();
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

        setMap();
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

        setMap();
    }

    function remove(marker: BaseMark) {
        const {map} = mapObj;
        if (map) {
            let layers = map.getLayers();
            for (let i in layers.getArray()) {
                let layerItem = layers.getArray()[i];

                if (layerItem instanceof VectorLayer) {
                    let vectorLayer = layerItem as VectorLayer<Feature<Geometry>>;
                    let source = vectorLayer.getSource();
                    source.removeFeature(marker.feature);
                }
            }
        }

        setMap();
    }

    function setLabelNameList(labelNameList: LabelInformation[]) {
        labelContext.labelNameList = labelNameList;
        refresh();
    }

    function setSelectedLabel(label: LabelInformation) {
        labelContext.selectedLabel = label;
        refresh();
    }

    function redrawFeatures() {

        const {map} = mapObj;
        if (map) {
            const layers = map.getLayers().getArray();
            for (let layer of layers) {
                if (layer instanceof VectorLayer) {
                    let vectorLayer = layer as VectorLayer<Feature<Geometry>>;
                    vectorLayer.setStyle(vectorLayer.getStyle());
                }
            }
        }
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
            setMap({map});
            refresh();
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
            
            setMap({isLoaded: true});
        }
    }, [data]);

    useEffect(() => {
        const {map} = mapObj;
        if (map) {
            map.set(MAP_MEMO, memo);
        }
    }, [memo]);

    useEffect(() => {
        if (labelNameList.length > 0) {
            labelContext.selectedLabel = labelNameList[0];
        }
        setLabelNameList(labelNameList);
    }, [labelNameList]);

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