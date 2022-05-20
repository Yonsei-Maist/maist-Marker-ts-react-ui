import { Feature, Map, View } from 'ol';
import React, { forwardRef, Ref, useEffect, useImperativeHandle, useState } from 'react';
import dziReader, { makeLayer } from "../../../api/DziReader";

import { defaults } from 'ol/control';
import { Tile } from 'ol/layer';
import { Zoomify } from 'ol/source';

import MapContext, { MapObject } from '../context/MapContext';
import {LabelContext, LabelContextObject, LabelObject } from '../context';

export interface MapProviderState {
    labelList: LabelObject[]
}

type MapProviderProps = {
    dziUrl: string;
    children?: React.ReactNode;
};

function MapProvider({ dziUrl, children }: MapProviderProps, ref:Ref<MapProviderState>) {
    const [mapObj, setMapObj] = useState({isLoaded: false} as MapObject);
    const [labelContext, setLabelContext] = useState({labelList: [] as LabelObject[]} as LabelContextObject);
    const [state, refetch] = dziReader(dziUrl, []);
    const { loading, data, error } = state;

    useImperativeHandle(ref, () => {
        return {
            labelList: labelContext.labelList
        } as MapProviderState;
    });

    function refresh() {
        setLabelContext({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh});
    }

    function setSelectedFeatures(features?: Feature[]) {
        setLabelContext({...labelContext, selectedFeatures: features, setSelectedFeatures, addLabel, removeLabel, refresh})
    }

    function addLabel(feature: Feature, labelName?: string) {
        let labelInfo = labelName ? {labelName: labelName} : undefined;
        labelContext.labelList.push({feature: feature, labelInfo: labelInfo});
        setLabelContext({...labelContext, setSelectedFeatures, addLabel, removeLabel, refresh});
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
            setLabelContext({...labelContext, selectedFeatures: undefined, setSelectedFeatures, addLabel, removeLabel, refresh})
        }
    }

    useEffect(() => {
        const map = new Map({
            controls: defaults({ zoom: false, rotate: false }).extend([]),
            target: 'map'
        });
        setMapObj({...mapObj, map: map});
        setLabelContext({...labelContext, setSelectedFeatures, addLabel, removeLabel});
        return () => map.setTarget(undefined);
    }, []);

    useEffect(() => {
        if (data) {
            var layer = new Tile();

            let info = makeLayer(dziUrl, data);

            var source = new Zoomify({
                url: info.url,
                size: [info.width, info.height],
                tileSize: info.tileSize,
                crossOrigin: "anonymous"
            });

            source.setTileUrlFunction(info.tileUrlFunction);
            source.setTileLoadFunction(info.tileLoadFunction);

            layer.setExtent([0, -info.height, info.width, 0]);
            layer.setSource(source);

            let map = mapObj.map;
            map?.addLayer(layer);

            let sourceTmp = layer.getSource();
            let resolution : number[] | undefined = undefined;
            if (sourceTmp) {
                let tileGrid = sourceTmp.getTileGrid();
                if (tileGrid)
                    resolution = tileGrid.getResolutions();
            }

            map?.setView(
                new View({
                    resolutions: resolution,
                    extent: layer.getExtent(),
                    constrainOnlyCenter: true
                })
            );

            map?.getView().fit(layer.getExtent() as number[], { size: map.getSize() });
            setMapObj({...mapObj, isLoaded: true});
        }
    }, [data]);

    return (
        <MapContext.Provider value={mapObj}>
            <LabelContext.Provider value={labelContext}>
                {children}
            </LabelContext.Provider>
        </MapContext.Provider>
    );
}

const RefMapProvider = forwardRef(MapProvider);

export default RefMapProvider;