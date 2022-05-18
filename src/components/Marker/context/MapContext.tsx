import React from 'react';
import { Map } from 'ol';

export interface MapObject {
    map?: Map;
    isLoaded: boolean;
}

const MapContext = React.createContext({} as MapObject);

export default MapContext;