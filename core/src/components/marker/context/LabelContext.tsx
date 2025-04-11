import React from 'react';
import { Feature } from 'ol';
import BaseMark from '../ui/mark/BaseMark';
import { LabelInfo } from '../ui';

export interface LabelInformation {
    labelName: string;
    color?: string;
}

export interface LabelContextObject {
    currentPageNo: number;
    pageLabelList: Map<number, BaseMark[]>;
    selectedFeatures?: Feature[];
    labelNameList: LabelInformation[];
    selectedLabel: LabelInformation;
    setSelectedLabel: (label: LabelInformation) => void;
    setLabelNameList: (labelNameList: LabelInformation[]) => void;
    setCurrentPageNo: (page: number) => void;
    initPageLabelList: (pages: number, initPageLabelList?: LabelInfo[][], converter?: (mark: LabelInfo) => BaseMark) => void;
    setSelectedFeatures?: (feature?: Feature[]) => void;
    addLabel: (feature: BaseMark, labelName?:string) => void;
    removeLabel: (feature: Feature) => void;
    refreshLabels: () => void;
}

const LabelContext = React.createContext({} as LabelContextObject);

export default LabelContext;