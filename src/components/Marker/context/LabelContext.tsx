import React from 'react';
import { Feature } from 'ol';
import { SimpleGeometry } from 'ol/geom';

export interface LabelObject {
    feature: Feature;
    labelInfo?: LabelInformation;
}

export interface LabelInformation {
    labelName: string;
}

export interface LabelContextObject {
    labelList: LabelObject[];
    selectedFeatures?: Feature[];
    setSelectedFeatures?: (feature?: Feature[]) => void;
    addLabel: (feature: Feature, labelName?:string) => void;
    removeLabel: (feature: Feature) => void;
    refresh: () => void;
}

const LabelContext = React.createContext({} as LabelContextObject);

export default LabelContext;