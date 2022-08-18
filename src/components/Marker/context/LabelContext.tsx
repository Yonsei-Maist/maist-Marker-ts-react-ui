import React from 'react';
import { Feature } from 'ol';
import BaseMark from '../ui/mark/BaseMark';
import { LabelInfo, Tools } from '../ui';

export interface LabelInformation {
    labelName: string;
}

export interface LabelContextObject {
    currentPageNo: number;
    pageLabelList: Map<number, BaseMark[]>;
    selectedFeatures?: Feature[];
    globalLabelNameList: string[];
    setCurrentPageNo: (page: number) => void;
    initPageLabelList: (pages: number, initPageLabelList?: LabelInfo[][], converter?: (mark: LabelInfo) => BaseMark) => void;
    setSelectedFeatures?: (feature?: Feature[]) => void;
    addLabel: (feature: BaseMark, labelName?:string) => void;
    removeLabel: (feature: Feature) => void;
    refresh: () => void;
    toolTypeChanged: (toolType: Tools) => void;
    getLabelNameList: (toolType: Tools) => string[];
}

const LabelContext = React.createContext({} as LabelContextObject);

export default LabelContext;