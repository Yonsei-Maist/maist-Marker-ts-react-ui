import React from 'react';
import { Collection, Feature, Map } from 'ol';

export interface MapObject {
    map?: Map;
    isLoaded: boolean;
    clearSelection: () => void;
    select: (feature: Feature) => void;
    remove: (feature: Feature) => void;
    unselect: (feature: Feature) => void;
}

const MapContext = React.createContext({} as MapObject);

export default MapContext;