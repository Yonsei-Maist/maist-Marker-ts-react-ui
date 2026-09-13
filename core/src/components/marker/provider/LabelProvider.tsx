import React, { Ref, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LabelContext, ClassInfo } from "../context";
import BaseMark from "../ui/mark/BaseMark";
import { Feature } from "ol";
import { LabelInfo } from "../ui";
import { MARK } from "@/constants/tag";

export interface LabelProviderState {
    pageLabelList: Map<number, BaseMark[]>;
    labelNameList: ClassInfo[];
    currentPageNo: number;
    selectedLabel?: ClassInfo;
    selectedFeatures?: Feature[];
    setSelectedLabel: (label: ClassInfo) => void;
    setSelectedFeatures: (features?: Feature[]) => void;
    removeLabel: (feature: Feature) => void;
    refreshLabels: () => void;
}

interface LabelProviderProps {
    labelNameList: ClassInfo[];
    children?: React.ReactNode;
    /** 마크 목록(추가·삭제·수정·라벨 변경)이 바뀔 때 (1.4+) */
    onLabelsChange?: () => void;
    /** 현재 클래스 선택이 바뀔 때 (1.4+) */
    onSelectedLabelChange?: (label?: ClassInfo) => void;
    /** 선택된 도형이 바뀔 때 (1.4+) */
    onSelectionChange?: (features?: Feature[]) => void;
}

function LabelProvider({ labelNameList: originLabelNameList, children, onLabelsChange, onSelectedLabelChange, onSelectionChange }: LabelProviderProps, ref:Ref<LabelProviderState>) {
    const [pageLabelList, setPageLabelList] = useState(new Map<number, BaseMark[]>());
    const [currentPageNo, setCurrentPageNo] = useState(1);
    const [labelNameList, setLabelNameList] = useState(originLabelNameList);
    const [selectedFeatures, setLocalSelectedFeatures] = useState<Feature[]>();
    const [selectedLabel, setSelectedLabel] = useState<ClassInfo>();

    // 콜백은 ref로 잡아 두어 이펙트 의존성에 넣지 않아도 최신 것을 호출한다.
    const callbacks = useRef({ onLabelsChange, onSelectedLabelChange, onSelectionChange });
    callbacks.current = { onLabelsChange, onSelectedLabelChange, onSelectionChange };

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
                    const mark = converter(labelInfo[j]);
                    if (mark) markList.push(mark);
                }

                localPageLabelList.set(i + 1, markList);
            }
        }

        setPageLabelList(new Map(localPageLabelList));
    }

    function setSelectedFeatures(features?: Feature[]) {
        setLocalSelectedFeatures(features ? [...features] : features);
    }

    function addLabel(mark: BaseMark) {
        // 새 도형은 현재 선택된 클래스를 기본 라벨로 갖는다.
        if (!mark.label && selectedLabel) {
            mark.label = selectedLabel;
            mark.feature?.set(MARK, mark);
        }
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
        // 함수형 갱신: 오래된 클로저(ToolNavigator의 ol 이벤트 핸들러)에서 호출해도 안전하다.
        setPageLabelList(prev => new Map(prev));
    }

    useEffect(() => {
        if (originLabelNameList.length > 0) {
            setSelectedLabel(originLabelNameList[0]);
        }

        setLabelNameList(originLabelNameList);
    }, [originLabelNameList]);

    useEffect(() => {
        callbacks.current.onLabelsChange?.();
    }, [pageLabelList]);

    useEffect(() => {
        callbacks.current.onSelectedLabelChange?.(selectedLabel);
    }, [selectedLabel]);

    useEffect(() => {
        callbacks.current.onSelectionChange?.(selectedFeatures);
    }, [selectedFeatures]);

    useImperativeHandle(ref, () => {
        return {
            pageLabelList,
            labelNameList,
            currentPageNo,
            selectedLabel,
            selectedFeatures,
            setSelectedLabel,
            setSelectedFeatures,
            removeLabel,
            refreshLabels
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
        throw new Error('useLabel must be used within a LabelProvider');
    }

    return context;
}

const RefLabelProvider = forwardRef(LabelProvider);

export default RefLabelProvider;
