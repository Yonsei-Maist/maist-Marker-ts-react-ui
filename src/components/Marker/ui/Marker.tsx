/**
 * read dzi format using openlayers
 * @author Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05. ~
 * @Date 2021.10.27
 */
import React, { forwardRef, MutableRefObject, Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MapProvider from './MarkerProvider';
import MarkComponent from './MarkComponent';
import ToolNavigator, { ToolNavigatorProps, ToolOption, Tools, TOOL_MEMO, TOOL_TYPE } from './ToolNavigator';
import LabelNavigator from './LabelNavigator';

import styled from '@emotion/styled';

import { LabelObject } from '../context/LabelContext';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import { Feature } from 'ol';

const MarkerMain = styled.div`
    border-radius: 5px;
    display: flex;
`

export interface LabelInfo {
    location: any[];
    memo?: string;
    name: string;
    toolType: string;
}

export interface MarkerState {
    getLabelList: () => LabelInfo[];
}

export interface MarkerProps extends ToolNavigatorProps {
    dziUrl: string;
    readOnly?: boolean;
    width?: string;
    height?: string;
    labelInfo?: LabelInfo[];
    toolTypes?: Tools[];
    labelNameList?: string[];
};

function Marker({ dziUrl, readOnly, toolTypes, width, height, lengthFormat, areaFormat, labelInfo, labelNameList }: MarkerProps, ref:Ref<MarkerState>) {
    const providerState = useRef(null);
    const [option, setOption] = useState(undefined as ToolOption);

    useEffect(() => {
        if (toolTypes) {
            let typeOption = {} as ToolOption;
            for (let i = 0;i<toolTypes.length;i++) {
                let type = toolTypes[i];
                switch (type) {
                    case Tools.Area:
                        typeOption.area = true;
                        break;
                    case Tools.Box:
                        typeOption.box = true;
                        break;
                    case Tools.Length:
                        typeOption.length = true;
                        break;
                    case Tools.Pencil:
                        typeOption.pencil = true;
                        break;
                    case Tools.Polygon:
                        typeOption.polygon = true;
                        break;
                }
            }

            setOption(typeOption);
        }
    }, [toolTypes])

    useImperativeHandle(ref, () => ({
        getLabelList: () => {
            let labelList = [];
            for (let i =0;i <providerState.current.labelList.length;i++) {
                let item = providerState.current.labelList[i] as LabelObject;
                labelList.push({
                    location: (item.feature as Feature<SimpleGeometry>).getGeometry().getCoordinates(),
                    memo: item.feature.get(TOOL_MEMO),
                    toolType: item.feature.get(TOOL_TYPE),
                    name: item.labelInfo.labelName
                } as LabelInfo)
            }
            return labelList;
        }
    } as MarkerState))

    return (
        <MapProvider ref={providerState} dziUrl={dziUrl}>
            <MarkerMain style={{width: width, height: height}}>
                {
                    !readOnly &&
                    <ToolNavigator option={option} lengthFormat={lengthFormat} areaFormat={areaFormat} labelInfo={labelInfo}/>
                }
                <MarkComponent/>
                <LabelNavigator labelNameList={labelNameList}/>
            </MarkerMain>
        </MapProvider>
    );
}

const RefMarker = React.forwardRef<MarkerState, MarkerProps>(Marker);

RefMarker.defaultProps = {
    dziUrl: "",
    readOnly: false,
    width: '100%',
    height: '100%'
};

export default RefMarker;