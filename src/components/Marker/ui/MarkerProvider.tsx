import { Feature, Graticule, Map } from 'ol';
import React, { forwardRef, Ref, useEffect, useImperativeHandle, useState } from 'react';
import dziReader, { makeLayer } from "../../../api/SourceReader";

import { defaults } from 'ol/control';
import { Vector } from 'ol/source';

import MapContext, { MapObject } from '../context/MapContext';
import {LabelContext, LabelContextObject } from '../context';
import { Select } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import { Geometry } from 'ol/geom';
import { Stroke } from 'ol/style';
import BaseMark from './mark/BaseMark';
import { AxiosInstance } from 'axios';
import { Alert, CircularProgress } from '@mui/material';
import { Tools } from './ToolNavigator';

export interface MapProviderState {
    labelList: BaseMark[]
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
};

function MapProvider({ dziUrl, children, axiosInstance, labelNameList }: MapProviderProps, ref:Ref<MapProviderState>) {
    const [mapObj, setMapObj] = useState({isLoaded: false} as MapObject);
    const [labelContext, setLabelContext] = useState({labelList: [] as BaseMark[], globalLabelNameList: [] as string[]} as LabelContextObject);
    const [state, refetch] = dziReader(dziUrl, [], axiosInstance);
    const { loading, data, error } = state;

    useImperativeHandle(ref, () => {
        return {
            labelList: labelContext.labelList
        } as MapProviderState;
    });

    function getLabelNameList(toolType: Tools) {
        let labelNameStrList = labelNameList.find((o) => o.toolType == toolType);
        return labelNameStrList ? [...labelNameStrList.labelNameList]: [] as string[]
    }

    function toolTypeChanged(toolType: Tools) {
        let globalLabelNameList = getLabelNameList(toolType);

        labelContext.globalLabelNameList.splice(0, labelContext.globalLabelNameList.length);
        for (let i = 0;i<globalLabelNameList.length;i++) {
            labelContext.globalLabelNameList.push(globalLabelNameList[i]);
        }

        setLabelContext(() => ({...labelContext, globalLabelNameList, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList}));
    }

    function refresh() {
        setLabelContext(() => ({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList}));
    }

    function setSelectedFeatures(features?: Feature[]) {
        setLabelContext(() => ({...labelContext, selectedFeatures: features, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList}));
    }

    function addLabel(mark: BaseMark) {
        labelContext.labelList.push(mark);
        setLabelContext(() => ({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList}));
    }

    function removeLabel(feature: Feature) {
        let removeIdx = -1;
        for (let i = 0;i<labelContext.labelList.length;i++) {
            let originListId = labelContext.labelList[i].feature.getId();
            let candidateRemovingId = feature.getId();
            if (originListId == candidateRemovingId)
                removeIdx = i;
        }

        if (removeIdx > -1) {
            labelContext.labelList.splice(removeIdx, 1);
            setLabelContext(() => ({...labelContext, selectedFeatures: undefined, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList}));
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
        const map = new Map({
            controls: defaults({ zoom: false, rotate: false }).extend([]),
            target: 'map'
        });

        setMapObj({...mapObj, map: map, remove, select, unselect, clearSelection});
        setLabelContext(() => ({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh, toolTypeChanged, getLabelNameList}));
        return () => map.setTarget(undefined);
    }, []);

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

    return (
        <MapContext.Provider value={mapObj}>
            <LabelContext.Provider value={labelContext}>
                {
                    !loading &&
                    error &&
                    <Alert severity='error'>{"Error !"}</Alert>
                }
                {
                    children
                }
                {
                    loading &&
                    <CircularProgress size={20} sx={{position: "absolute", top: "50%", left: "50%", transform:"translate(-50%, -50%)"}}/>
                }
            </LabelContext.Provider>
        </MapContext.Provider>
    );
}

const RefMapProvider = forwardRef(MapProvider);

export default RefMapProvider;