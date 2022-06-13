import { Feature, Graticule, Map, View } from 'ol';
import React, { forwardRef, Ref, useEffect, useImperativeHandle, useState } from 'react';
import dziReader, { makeLayer } from "../../../api/DziReader";

import { defaults } from 'ol/control';
import { Tile } from 'ol/layer';
import { Vector, Zoomify } from 'ol/source';

import MapContext, { MapObject } from '../context/MapContext';
import {LabelContext, LabelContextObject } from '../context';
import { Select } from 'ol/interaction';
import VectorLayer from 'ol/layer/Vector';
import { Geometry } from 'ol/geom';
import { Stroke } from 'ol/style';
import BaseMark from './mark/BaseMark';

export interface MapProviderState {
    labelList: BaseMark[]
}

type MapProviderProps = {
    dziUrl: string;
    children?: React.ReactNode;
};

function MapProvider({ dziUrl, children }: MapProviderProps, ref:Ref<MapProviderState>) {
    const [mapObj, setMapObj] = useState({isLoaded: false} as MapObject);
    const [labelContext, setLabelContext] = useState({labelList: [] as BaseMark[]} as LabelContextObject);
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

    function addLabel(mark: BaseMark, labelName?: string) {
        let labelInfo = labelName ? {labelName: labelName} : undefined;
        mark.label = labelInfo;
        labelContext.labelList.push(mark);
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
            let map = mapObj.map;
            map?.addLayer(layer);
            map?.addLayer(graticuleLayer);
            map?.setView(
                new View({
                    maxResolution: layer.getSource().getTileGrid().getResolutions()[0],
                    ///resolutions: resolution,
                    extent: layer.getExtent(),
                    constrainOnlyCenter: true,
                    zoom: 2
                })
            );

            map?.getView().fit(layer.getExtent() as number[], { size: map.getSize() });
            setMapObj({...mapObj, isLoaded: true, select, remove, unselect, clearSelection});
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