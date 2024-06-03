/**
 * read dzi format using openlayers
 * @author Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05. ~
 * @Date 2021.10.27
 */
import React, { ReactNode, Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MapProvider, { MapProviderState } from '../provider/MarkerProvider';
import MarkComponent from './MarkComponent';
import ToolNavigator, { ToolOption, Tools, TOOL_TYPE } from './nevigator/ToolNavigator';
import LabelNavigator from './nevigator/LabelNavigator';
import { Box, Button, IconButton, Snackbar, styled } from '@mui/material';
import { ArrowCircleLeft, Close } from '@mui/icons-material';
import PaletteNavigator from './nevigator/PaletteNavigator';
import BaseDrawer from './drawer/BaseDrawer';
import BaseMark, { LabelFormat } from './mark/BaseMark';
import Confirm from './dialog/Confirm';
import { AxiosInstance } from 'axios';

import 'ol/ol.css';
import { HeaderString } from '../../../lib/dicomReader';
import PDFPageControl from './controls/PDFPageControl';
import { isPDF } from '../../../lib/PDFObject';
import { allocateColor } from '../../../lib/colorAllocator';
import { LabelMemoType } from './controls/LabelMemoControl';
import { LabelInformation } from '../context';

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
    getLabelNameList: () => LabelInformation[];
}

export interface MarkerProps {
    dziUrl: string;
    saveHandler?: (labelList: LabelInfo[][], memo?: string, callback?: () => void) => void;
    axiosInstance?: AxiosInstance;
    options?: MarkerOptions;
    lengthFormat?: (length: number) => string;
    areaFormat?: (area: number) => string;
};

export interface MarkerOptions {
    readOnly?: boolean;
    toolTypes?: Tools[];
    savedLabelInfo?: LabelInfo[][];
    savedMemo?: string;
    labelNameList?: LabelInformation[] | string[];
    dcmConnectHeader?: HeaderString[];
    dcmWithCredentials?: boolean;
    labelMemoType?: LabelMemoType;
    labelMemoOptions?: string[];
    localSave?: boolean;
    paletteButtons?: ReactNode;
}

const defaultOptions: MarkerOptions = {
    readOnly: false,
    dcmWithCredentials: true,
    labelNameList: []
}

function Marker({ dziUrl = "", lengthFormat, areaFormat, saveHandler, axiosInstance, options = defaultOptions }: MarkerProps, ref: Ref<MarkerState>) {
    const combinedOption = {...defaultOptions, ...options}
    const providerState = useRef(null as MapProviderState | null);
    const [option, setOption] = useState(undefined as ToolOption | undefined);
    const [open, setOpen] = useState(true);
    const boxRef = useRef();
    const [localLabelInfo, setLocalLabelInfo] = useState(combinedOption.savedLabelInfo);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [memo, setMemo] = useState(combinedOption.savedMemo);
    const [localCheck, setLocalCheck] = useState(true);

    const [globalLabelNameList, setGlobalLabelNameList] = useState<LabelInformation[] | undefined>(undefined);

    const [saveNotificationOpen, setSaveNotificationOpen] = useState(false);

    const storage_key = LOCAL_STORAGE_KEY + dziUrl;
    const storage_memo_key = LOCAL_STORAGE_KEY + dziUrl + "memo";

    const getLabel = (toObject: boolean) => {
        let labelList = [];
        let baseDrawer = new BaseDrawer<BaseMark>();
        if (providerState.current) {
            for (let i = 0; i < providerState.current.pageLabelList.length; i++) {
                let currentLabelList = providerState.current.pageLabelList[i];
                let pageLabelList = [];
                for (let j = 0; j < currentLabelList.length; j++) {
                    let map = providerState.current.map;
                    let item = currentLabelList[j];
                    let markData = baseDrawer.createSaveData(map, item);

                    pageLabelList.push({
                        data: toObject ? markData: JSON.stringify(markData),
                        toolType: item.feature.get(TOOL_TYPE),
                        label: item.label.labelName
                    });
                }

                labelList.push(pageLabelList);
            }

        }
        console.log(labelList);
        return labelList;
    }

    const getMemo = () => {
        let memo = "";
        if (providerState.current) {
            memo = providerState.current.getMemo();
        }

        return memo;
    }

    const onSave = () => {
        let labels = getLabel(true);
        let memo = getMemo();

        if (saveHandler) {
            saveHandler(labels, memo, () => {setSaveNotificationOpen(true);});
            localStorage.removeItem(storage_key);
            localStorage.removeItem(storage_memo_key);
        } else {
            setSaveNotificationOpen(true);
        }
    };

    const onLocalSave = () => {
        let labels = getLabel(false);
        let memo = getMemo();
        // save to local
        if (combinedOption.localSave) {
            localStorage.setItem(storage_key, labels ? JSON.stringify(labels) : "");
            localStorage.setItem(storage_memo_key, memo ? memo : "");
        }
    }

    const getLoadData = () => {
        if (combinedOption.localSave) {
            let data = localStorage.getItem(storage_key);
            let memo = localStorage.getItem(storage_memo_key);

            if ((data && data.length > 2) || (memo && memo.length > 0)) {
                setOpenConfirm(true);
            } else {
                setLocalCheck(false);
            }
        }
    }

    const onLocalLoad = () => {
        // get from local
        let data = localStorage.getItem(storage_key);
        let memo = localStorage.getItem(storage_memo_key);
        if (data && data.length > 2) {
            setLocalLabelInfo(JSON.parse(data));
        }
        if (memo) {
            setMemo(memo);
        }

        setLocalCheck(false);
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
            localStorage.setItem(storage_memo_key, memo ? memo : "");

            setLocalCheck(false);
        }
    }

    const onHandleCloseSaveNotification = () => {
        setSaveNotificationOpen(false);
    }

    useEffect(() => {
        if (combinedOption.localSave) {
            getLoadData();
            let id = setInterval(onLocalSave, 60 * 10 * 1000);

            return () => clearInterval(id);
        } else {
            setLocalCheck(false);
        }
    }, []);

    useEffect(() => {
        if (combinedOption.toolTypes) {
            let typeOption = {} as ToolOption;
            for (let i = 0; i < combinedOption.toolTypes.length; i++) {
                let type = combinedOption.toolTypes[i];
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
        if (combinedOption.labelNameList && combinedOption.labelNameList.length > 0) {
            let item = combinedOption.labelNameList[0];
            if (typeof item === 'string') {
                let labelNameList = combinedOption.labelNameList as string[];
                let newLabelNameList = labelNameList.map((o, i) => {
                    return {
                        labelName: o,
                        color: allocateColor(i)
                    }
                });

                setGlobalLabelNameList([...newLabelNameList]);
            } else {
                let labelNameList = combinedOption.labelNameList as LabelInformation[];
                labelNameList.map((o: LabelInformation, i: number) => {
                    if (!o.color) {
                        o.color = allocateColor(i);
                    }
                });
                setGlobalLabelNameList(labelNameList);
            }
        } else {
            setGlobalLabelNameList([]);
        }

        setLocalLabelInfo(combinedOption.savedLabelInfo);
    }, [options]);

    useImperativeHandle(ref, () => ({
        getLabelList: () => {
            return getLabel(true);
        },
        getLabelNameList: () => {
            return providerState.current.labelNameList
        }
    } as MarkerState));

    if (globalLabelNameList)
        return (
            <MapProvider 
                load={localCheck} 
                ref={providerState} 
                dziUrl={dziUrl} 
                axiosInstance={axiosInstance} 
                labelNameList={globalLabelNameList} 
                header={combinedOption.dcmConnectHeader} 
                withCredentials={combinedOption.dcmWithCredentials} 
                memo={memo}
            >
                {
                    isPDF(dziUrl) &&
                    <PDFPageControl />
                }
                <Box ref={boxRef} height={"100%"} position={"relative"}>
                    <MarkerMain open={open} />
                    <IconButton color="secondary" sx={{ position: "absolute", right: "15px", top: "15px" }} onClick={() => { setOpen(true); }}>
                        <ArrowCircleLeft />
                    </IconButton>
                    <PaletteNavigator root={boxRef} onSaveLocal={onLocalSave} onSaveServer={onSave}>
                        {combinedOption.paletteButtons}
                    </PaletteNavigator>
                    {
                        !combinedOption.readOnly &&
                        <ToolNavigator option={option} lengthFormat={lengthFormat} areaFormat={areaFormat} pageLabelInfo={localLabelInfo}/>
                    }
                    <LabelNavigator open={open} labelMemoType={combinedOption.labelMemoType} labelMemoOptions={combinedOption.labelMemoOptions} onOpenChange={() => {
                        setOpen(false);
                    }} />
                </Box>
                <Confirm open={openConfirm} title={"로컬 데이터 확인"} content={"로컬에 저장된 데이터가 발견되었습니다. 불러오시겠습니까?"} onHandleOpen={onHandleOpen} onHandleConfirm={onHandleLocalLoad} />
                <Snackbar
                    open={saveNotificationOpen}
                    autoHideDuration={2000}
                    onClose={onHandleCloseSaveNotification}
                    color="white"
                    message="저장 완료"
                    action={
                        <Button onClick={onHandleCloseSaveNotification}>
                            <Close/>
                        </Button>
                    }
                />
            </MapProvider>
        );

    return <></>
}

const RefMarker = React.forwardRef<MarkerState, MarkerProps>(Marker);

export {
    Tools,
    ToolOption
}

export default RefMarker;