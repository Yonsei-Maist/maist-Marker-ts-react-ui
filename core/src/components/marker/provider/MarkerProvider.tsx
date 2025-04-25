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
import { IS_DRAWER_VECTOR, IS_MAIN_LAYER, MAP_MEMO } from '@/constants/tag';

export interface MapProviderState {
    pageLabelList: () => BaseMark[][];
    labelNameList: () => ClassInfo[];
    map: () => OlMap;
    memo: () => string;
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
};

function MapProvider({ fileUri, fileBlob, children, axiosInstance, labelNameList, header, withCredentials, memo, load }: MapProviderProps, ref: Ref<MapProviderState>) {
    const labelRef = useRef<LabelProviderState>();
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

    useImperativeHandle(ref, () => {
        return {
            pageLabelList: getPageLabelList,
            memo: getMemo,
            labelNameList: () => labelNameList,
            map: () => map
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
                target: 'map'
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
            <LabelProvider ref={labelRef} labelNameList={labelNameList}>
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