import React, { useContext, useEffect, useState } from 'react';
import LabelContext, { LabelInformation } from '../context/LabelContext';
import { TOOL_TYPE } from './ToolNavigator';

import styled from '@emotion/styled';

const MarkerLabelNavigator = styled.div`
    width: 200px;
    background-color: #404040;
    padding: 10px;
`

const MarkerSelect = styled.select`
    width: 100%;
    font-size: 15px;
    background-color: #404040;
    color: #FFFFFF;
    border: 0px;
    border-bottom: 1px solid #FFFFFF;
    height: 30px;
`

const MarkerLabelInformation = styled.div`
    position: relative;
    width: 100%;
`

const MarkerLabelBtnDelete = styled.div`
    cursor:pointer;
    position:absolute;
    top: 6px;
    right: 0px;
    width: 15px;
    height: 15px;
    background: url('../image/marker-delete-btn-icon.png') no-repeat;
    background-size: contain;

    &: hover {
        color: #a1a1a1;
        width: 15px;
        height: 15px;
        background: url('../image/marker-delete-btn-icon-hover.png') no-repeat;
        background-size: contain;
    }
`

const MarkerLabelToolName = styled.div`
    font-size: 20px;
    margin:4px;
`

const MarkerLabelMeta = styled.div`
    height: 10%;
    ${MarkerSelect} {
        margin-bottom: 5px;
    }
`

const MarkerLabelList = styled.div`
    height: 90%;
    padding: 5px;
`

const MarkerLabelContainer = styled.div`
    width: 100%;
    padding: 5px;
    border-radius: 5px;
    border: 1px solid #ffffff;
    margin-bottom: 5px;
    color: #FFFFFF;
`

const MarkerLabelContainerSelected = styled.div`
    width: 100%;
    padding: 5px;
    border-radius: 5px;
    margin-bottom: 5px;
    background-color: #FFFFFF;
    color: #404040;

    ${MarkerSelect} {
        color: #404040;
        border-bottom: 1px solid #404040;
        background-color: #FFFFFF;
    }

    ${MarkerLabelBtnDelete} {
        width: 15px;
        height: 15px;
        background: url('../image/marker-delete-btn-icon-selected.png') no-repeat;
        background-size: contain;
    }
`

type LabelNavigatorProps = {
    labelNameList: string[]
};

function LabelNavigator({labelNameList}: LabelNavigatorProps) {
    const {labelList, selectedFeatures, setSelectedFeatures, removeLabel, refresh} = useContext(LabelContext);
    const [selectedLabel, setSelectedLabel] = useState(labelNameList[0]);

    useEffect(() => {
    }, [labelList]);
    return (
        <MarkerLabelNavigator>
            <MarkerLabelMeta>
                <MarkerSelect value={selectedLabel} onChange={(e) => {setSelectedLabel(e.target.value);}}>
                    {
                        labelNameList.map((o, i) => {
                            return (
                                <option>{o}</option>
                            )
                        })
                    }
                </MarkerSelect>
            </MarkerLabelMeta>
            <MarkerLabelList>
                {
                    labelList.map((o, i) => {
                        let MarkerLabelContainerTmp = MarkerLabelContainer;
                        if (selectedFeatures) {
                            for (let i =0;i<selectedFeatures.length;i++) {
                                if (selectedFeatures[i] == o.feature) {
                                    MarkerLabelContainerTmp = MarkerLabelContainerSelected;
                                    break;
                                }
                            }
                        }

                        if (!o.labelInfo)
                            o.labelInfo = {labelName: selectedLabel} as LabelInformation;

                        let feature = o.feature;

                        return (
                            <MarkerLabelContainerTmp key={i}>
                                <MarkerLabelInformation>
                                    <MarkerLabelToolName>{feature.get(TOOL_TYPE)}</MarkerLabelToolName>
                                    <MarkerLabelBtnDelete></MarkerLabelBtnDelete>
                                </MarkerLabelInformation>
                                <MarkerSelect value={o.labelInfo.labelName} onChange={(e) => {if (o.labelInfo) o.labelInfo.labelName = e.target.value; refresh()}}>
                                    {
                                        labelNameList.map((o, i) => {
                                            return (
                                                <option>{o}</option>
                                            )
                                        })
                                    }
                                </MarkerSelect>
                            </MarkerLabelContainerTmp>
                        )
                    })
                }
            </MarkerLabelList>
        </MarkerLabelNavigator>
    );
}

LabelNavigator.defaultProps = {
    labelNameList: ["DefaultLabel1", "DefaultLabel2"],
    labelTypeList: ["Type1", "Type2"]
};

export default LabelNavigator;