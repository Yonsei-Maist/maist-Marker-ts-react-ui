import React from 'react';
import { Feature } from 'ol';
import BaseMark from '../ui/mark/BaseMark';

export interface LabelInformation {
    labelName: string;
}

export interface LabelContextObject {
    labelList: BaseMark[];
    selectedFeatures?: Feature[];
    setSelectedFeatures?: (feature?: Feature[]) => void;
    addLabel: (feature: BaseMark, labelName?:string) => void;
    removeLabel: (feature: Feature) => void;
    refresh: () => void;
}

const LabelContext = React.createContext({} as LabelContextObject);

export default LabelContext;