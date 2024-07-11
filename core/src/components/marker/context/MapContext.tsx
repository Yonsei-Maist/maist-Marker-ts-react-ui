import React from 'react';
import { Feature, Map } from 'ol';
import BaseMark from '../ui/mark/BaseMark';
import VectorLayer from 'ol/layer/Vector';
import BaseLayer from 'ol/layer/Base';

export interface MapObject {
    map?: Map;
    isLoaded: boolean;
    redrawFeatures: () => void;
    clearSelection: () => void;
    select: (mark: BaseMark) => void;
    remove: (mark: BaseMark) => void;
    unselect: (mark: BaseMark) => void;
    findVectorLayer: () => VectorLayer<Feature> | undefined;
    findMainLayer: () => BaseLayer;
}

const MapContext = React.createContext({} as MapObject);

export default MapContext;