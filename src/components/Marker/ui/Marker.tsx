/**
 * read dzi format using openlayers
 * @author Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05. ~
 * @Date 2021.10.27
 */
import React, { Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MapProvider, { LabelNameInfo, MapProviderState } from './MarkerProvider';
import MarkComponent from './MarkComponent';
import ToolNavigator, { ToolNavigatorProps, ToolOption, Tools, TOOL_TYPE } from './ToolNavigator';
import LabelNavigator from './LabelNavigator';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, styled } from '@mui/material';
import { ArrowCircleLeft } from '@mui/icons-material';
import PaletteNavigator from './PaletteNavigator';
import BaseDrawer from './drawer/BaseDrawer';
import BaseMark from './mark/BaseMark';
import Confirm from './Confirm';
import { AxiosInstance } from 'axios';

const LOCAL_STORAGE_KEY = "marker_label_list";
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
    data: string;
    toolType: Tools;
    label: string;
}

export interface MarkerState {
    getLabelList: () => LabelInfo[];
}

export interface MarkerProps extends ToolNavigatorProps {
    dziUrl: string;
    readOnly?: boolean;
    toolTypes?: Tools[];
    labelNameList?: LabelNameInfo[];
    saveHandler?: (labelList: LabelInfo[]) => void;
    axiosInstance?: AxiosInstance;
};

function Marker({ dziUrl, readOnly, toolTypes, lengthFormat, areaFormat, labelInfo, labelNameList, saveHandler, axiosInstance }: MarkerProps, ref: Ref<MarkerState>) {
    const providerState = useRef(null as MapProviderState | null);
    const [option, setOption] = useState(undefined as ToolOption | undefined);
    const [open, setOpen] = useState(true);
    const boxRef = useRef();
    const [localLabelInfo, setLocalLabelInfo] = useState(labelInfo);
    const [openConfirm, setOpenConfirm] = useState(false);

    const storage_key = LOCAL_STORAGE_KEY + dziUrl;

    const getLabel = (toObject: boolean) => {
        let labelList = [];
        let baseDrawer = new BaseDrawer<BaseMark>();
        if (providerState.current) {
            for (let i = 0; i < providerState.current.labelList.length; i++) {
                let item = providerState.current.labelList[i];

                labelList.push({
                    data: baseDrawer.createSaveData(item, toObject),
                    toolType: item.feature.get(TOOL_TYPE),
                    label: item.label.labelName
                } as LabelInfo);
            }

        }
        
        return labelList;
    }

    const onSave = () => {
        let labels = getLabel(true);

        if (saveHandler) {
            saveHandler(labels);
            localStorage.removeItem(storage_key);
        }
    };

    const onLocalSave = () => {
        let labels = getLabel(false);
        // save to local
        localStorage.setItem(storage_key, JSON.stringify(labels));
    }

    const getLoadData = () => {
        let data = localStorage.getItem(storage_key);
        if (data && data.length > 2) {
            setOpenConfirm(true);
        }
    }

    const onLocalLoad = () => {
        // get from local
        let data = localStorage.getItem(storage_key);
        if (data && data.length > 2) {
            setLocalLabelInfo(JSON.parse(data));
        }
    }

    const onHandleOpen = () => {
        setOpenConfirm(false);
    }

    const onHandleLocalLoad = (confirm: boolean) => {
        setOpenConfirm(false);
        if (confirm) {
            onLocalLoad();
        } else {
            localStorage.setItem(storage_key, JSON.stringify(localLabelInfo || []));
        }
    }

    useEffect(() => {
        getLoadData();
        let id = setInterval(onLocalSave, 60 * 10 * 1000);

        return () => clearInterval(id);
    }, []);

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
    }, [toolTypes]);

    useEffect(() => {
        setLocalLabelInfo(labelInfo);
    }, [labelInfo]);

    useImperativeHandle(ref, () => ({
        getLabelList: () => {

            return getLabel(true);
        }
    } as MarkerState));

    return (
        <MapProvider ref={providerState} dziUrl={dziUrl} axiosInstance={axiosInstance} labelNameList={labelNameList}>
            <Box ref={boxRef} height={"100%"} position={"relative"}>
                <MarkerMain open={open} />
                <IconButton color="secondary" sx={{ position: "absolute", right: "15px", top: "15px" }} onClick={() => { setOpen(true); }}>
                    <ArrowCircleLeft />
                </IconButton>
                <PaletteNavigator root={boxRef} onSaveLocal={onLocalSave} onSaveServer={onSave}>

                </PaletteNavigator>
                {
                    !readOnly &&
                    <ToolNavigator option={option} lengthFormat={lengthFormat} areaFormat={areaFormat} labelInfo={localLabelInfo} />
                }
                <LabelNavigator open={open} onOpenChange={() => {
                    setOpen(false);
                }} />
            </Box>
            <Confirm open={openConfirm} title={"?????? ????????? ??????"} content={"????????? ????????? ???????????? ?????????????????????. ?????????????????????????"} onHandleOpen={onHandleOpen} onHandleConfirm={onHandleLocalLoad} />
        </MapProvider>
    );
}

const RefMarker = React.forwardRef<MarkerState, MarkerProps>(Marker);

RefMarker.defaultProps = {
    dziUrl: "",
    readOnly: false
};

export {
    Tools,
    ToolOption
}

export default RefMarker;