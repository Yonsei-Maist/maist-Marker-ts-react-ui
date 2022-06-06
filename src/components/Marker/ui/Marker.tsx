/**
 * read dzi format using openlayers
 * @author Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05. ~
 * @Date 2021.10.27
 */
import React, { Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MapProvider, { MapProviderState } from './MarkerProvider';
import MarkComponent from './MarkComponent';
import ToolNavigator, { ToolNavigatorProps, ToolOption, Tools, TOOL_MEMO, TOOL_TYPE } from './ToolNavigator';
import LabelNavigator from './LabelNavigator';

import { LabelObject } from '../context';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import { Feature } from 'ol';
import { Box, IconButton, styled } from '@mui/material';
import { ArrowCircleLeft } from '@mui/icons-material';

const drawerWidth = 200;

const MarkerMain = styled(MarkComponent, { shouldForwardProp: (prop) => prop !== 'open' })<{
    open?: boolean;
}>(({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    marginRight: -drawerWidth,
    ...(open && {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginRight: 0,
    }),
}));

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

function Marker({ dziUrl, readOnly, toolTypes, width, height, lengthFormat, areaFormat, labelInfo, labelNameList }: MarkerProps, ref: Ref<MarkerState>) {
    const providerState = useRef(null as MapProviderState | null);
    const [option, setOption] = useState(undefined as ToolOption | undefined);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (toolTypes) {
            let typeOption = {} as ToolOption;
            for (let i = 0; i < toolTypes.length; i++) {
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
                    case Tools.Ellipse:
                        typeOption.ellipse = true;
                        break;
                }
            }

            setOption(typeOption);
        }
    }, [toolTypes])

    useImperativeHandle(ref, () => ({
        getLabelList: () => {
            if (providerState.current) {

                let labelList = [];
                for (let i = 0; i < providerState.current.labelList.length; i++) {
                    let item = providerState.current.labelList[i] as LabelObject;
                    let feature = item.feature as Feature<SimpleGeometry>;
                    let coordinates = null;
                    if (feature) {
                        let geometry = feature.getGeometry();
                        if (geometry)
                            coordinates = geometry.getCoordinates();
                    }

                    let info = item.labelInfo;

                    labelList.push({
                        location: coordinates,
                        memo: item.feature.get(TOOL_MEMO),
                        toolType: item.feature.get(TOOL_TYPE),
                        name: info ? info.labelName : ""
                    } as LabelInfo)
                }
                return labelList;
            }
        }
    } as MarkerState))

    return (
        <MapProvider ref={providerState} dziUrl={dziUrl}>
            <Box height={"100%"} position={"relative"}>
                <MarkerMain open={open}/>
                <IconButton color="secondary" sx={{position: "absolute", right: "15px", top: "15px"}} onClick={() => {setOpen(true);}}>
                    <ArrowCircleLeft/>
                </IconButton>
                {
                    !readOnly &&
                    <ToolNavigator option={option} lengthFormat={lengthFormat} areaFormat={areaFormat} labelInfo={labelInfo} />
                }
                <LabelNavigator labelNameList={labelNameList} open={open} onOpenChange={() => {
                    setOpen(false);
                }} />
            </Box>
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

export {
    Tools,
    ToolOption
}

export default RefMarker;