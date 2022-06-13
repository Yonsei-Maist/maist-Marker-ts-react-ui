import React from 'react';
import { Map } from 'ol';
import BaseMark from '../ui/mark/BaseMark';

export interface MapObject {
    map?: Map;
    isLoaded: boolean;
    clearSelection: () => void;
    select: (mark: BaseMark) => void;
    remove: (mark: BaseMark) => void;
    unselect: (mark: BaseMark) => void;
}

const MapContext = React.createContext({} as MapObject);

export default MapContext;