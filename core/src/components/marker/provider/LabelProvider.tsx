import React, { Ref, forwardRef, useContext, useEffect, useImperativeHandle, useState } from "react";
import { LabelContext, ClassInfo } from "../context";
import BaseMark from "../ui/mark/BaseMark";
import { Feature } from "ol";
import { LabelInfo } from "../ui";

export interface LabelProviderState {
    pageLabelList: Map<number, BaseMark[]>;
    labelNameList: ClassInfo[];
}

interface LabelProviderProps {
    labelNameList: ClassInfo[];
    children?: React.ReactNode;
}

function LabelProvider({ labelNameList: originLabelNameList, children }: LabelProviderProps, ref:Ref<LabelProviderState>) {
    const [pageLabelList, setPageLabelList] = useState(new Map<number, BaseMark[]>());
    const [currentPageNo, setCurrentPageNo] = useState(1);
    const [labelNameList, setLabelNameList] = useState(originLabelNameList);
    const [selectedFeatures, setLocalSelectedFeatures] = useState<Feature[]>();
    const [selectedLabel, setSelectedLabel] = useState<ClassInfo>();

    function initPageLabelList(pages: number, pageLabelInfo?: LabelInfo[][], converter?: (label: LabelInfo) => BaseMark) {
        let localPageLabelList = pageLabelList
        if (localPageLabelList.size != pages && !pageLabelInfo) {
            localPageLabelList.clear();

            for (let i = 0; i < pages; i++) {
                localPageLabelList.set(i + 1, [] as BaseMark[]);
            }
        }

        if (pageLabelInfo && converter) {
            if (pageLabelInfo.length != pages) {
                throw Error("Saved label list and number of pages must be same: " + pageLabelInfo.length + ", " + pages + " or do not set this.");
            }

            localPageLabelList.clear();

            for (let i = 0; i < pageLabelInfo.length; i++) {
                let labelInfo = pageLabelInfo[i];
                let markList = [] as BaseMark[];
                for (let j = 0; j < labelInfo.length; j++) {
                    markList.push(converter(labelInfo[j]));
                }

                localPageLabelList.set(i + 1, markList);
            }
        }

        setPageLabelList(new Map(localPageLabelList));
        // refresh();
    }

    function setSelectedFeatures(features?: Feature[]) {
        setLocalSelectedFeatures(features ? [...features] : features);
    }

    function addLabel(mark: BaseMark) {
        pageLabelList.get(currentPageNo).push(mark);
        setPageLabelList(new Map(pageLabelList));
    }

    function removeLabel(feature: Feature) {
        let removeIdx = -1;
        let labelList = pageLabelList.get(currentPageNo);
        for (let i = 0; i < labelList.length; i++) {
            let originListId = labelList[i].feature.getId();
            let candidateRemovingId = feature.getId();
            if (originListId == candidateRemovingId)
                removeIdx = i;
        }

        if (removeIdx > -1) {
            labelList.splice(removeIdx, 1);
            setSelectedFeatures(undefined);
            setPageLabelList(new Map(pageLabelList));
        }
    }

    function refreshLabels() {
        setPageLabelList(new Map(pageLabelList));
    }

    useEffect(() => {
        if (originLabelNameList.length > 0) {
            setSelectedLabel(originLabelNameList[0]);
        }

        setLabelNameList(originLabelNameList);
    }, [originLabelNameList]);

    useImperativeHandle(ref, () => {
        return {
            pageLabelList: pageLabelList,
            labelNameList: labelNameList
        } as LabelProviderState;
    });

    return <LabelContext.Provider value={{
        pageLabelList, currentPageNo, labelNameList, selectedFeatures, selectedLabel,
        setSelectedFeatures, addLabel, removeLabel, setCurrentPageNo, initPageLabelList, setLabelNameList, setSelectedLabel, refreshLabels
    }}>
        {children}
    </LabelContext.Provider>
}

export const useLabel = () => {
    const context = useContext(LabelContext);
    if (!context) {
        throw new Error('useAddon must be used within an AddonProvider');
    }

    return context;
}

const RefLabelProvider = forwardRef(LabelProvider);

export default RefLabelProvider;