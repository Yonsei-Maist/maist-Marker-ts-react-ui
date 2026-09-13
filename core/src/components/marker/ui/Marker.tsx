/**
 * read dzi format using openlayers
 * @author Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05. ~
 * @Date 2021.10.27
 */
import React, { ReactNode, Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MapProvider, { MapProviderState } from '../provider/MarkerProvider';
import MarkComponent from './MarkComponent';
import ToolNavigator from './nevigator/ToolNavigator';
import LabelNavigator from './nevigator/LabelNavigator';
import { Box, Button, IconButton, Snackbar, styled } from '@mui/material';
import { ArrowCircleLeft, Close } from '@mui/icons-material';
import PaletteNavigator from './nevigator/PaletteNavigator';
import BaseDrawer from './drawer/BaseDrawer';
import BaseMark, { LabelFormat, LabelInfo } from './mark/BaseMark';
import { MaskSettings } from './drawer/MaskDrawer';
import Confirm from './controls/Confirm';
import { AxiosInstance, AxiosRequestHeaders } from 'axios';

import 'ol/ol.css';
import PageControl from './controls/PageControl';
import { allocateColor } from '@/lib/colorAllocator';
import { LabelMemoType } from './controls/LabelMemoControl';
import { ClassInfo } from '../context';
import { TOOL_TYPE } from '@/constants/tag';

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

export interface MarkerState {
    /** 페이지별 라벨 목록 (단일 이미지도 페이지 1개짜리 배열). 각 항목에 id가 포함된다. */
    getLabelList: () => LabelInfo[][];
    getLabelNameList: () => ClassInfo[];
    /* ---- 1.4+: 호스트 UI 연동용 ---- */
    /** 현재 클래스 */
    getSelectedLabel: () => ClassInfo | undefined;
    /** 현재 클래스를 이름으로 지정. 목록에 없으면 false */
    setSelectedLabel: (labelName: string) => boolean;
    /** 도구 지정. 프리셋 id('Box', 'Polygon', 'Polyline', ...) 또는 ''(선택 모드) */
    setTool: (tool: string) => void;
    /** 선택된 마크 id 목록 */
    getSelectedIds: () => string[];
    selectMark: (id: string, exclusive?: boolean) => void;
    unselectMark: (id: string) => void;
    clearSelection: () => void;
    removeMark: (id: string) => void;
    setMarkLabel: (id: string, labelName: string) => boolean;
    setMarkMemo: (id: string, memo: string) => void;
    /* ---- 1.5+: 8종 어노테이션 타입 지원 ---- */
    /** 좌표 수치 직접 입력. 저장 형식(getLabelList의 data)과 같은 단위 */
    setMarkData: (id: string, data: LabelFormat) => boolean;
    /** Keypoint 순번 / 인스턴스 번호 변경 */
    setMarkOrder: (id: string, order: number) => void;
    /** 세그먼테이션 브러시 설정 */
    getMaskSettings: () => MaskSettings | undefined;
    setMaskSettings: (patch: Partial<MaskSettings>) => void;
    /** 다음 브러시 스트로크가 새 인스턴스를 만들도록 */
    newInstance: () => void;
}

export interface MarkerProps {
    fileUri?: string;
    fileBlob?: Blob;
    axiosInstance?: AxiosInstance;
    options?: MarkerOptions;
    children?: ReactNode;
    saveHandler?: (labelList: LabelInfo[][], memo?: string, callback?: () => void) => void;
    handleClassChanged?: (classInfoList: ClassInfo[]) => void;
    /* ---- 1.4+ ---- */
    /** 마크가 추가·수정·삭제되거나 라벨/메모가 바뀔 때마다 현재 목록을 전달 (저장과 무관) */
    onChange?: (labelList: LabelInfo[][]) => void;
    /** 현재 클래스 선택이 바뀔 때 */
    onSelectedLabelChange?: (label?: ClassInfo) => void;
    /** 선택된 마크 id 목록이 바뀔 때 */
    onSelectionChange?: (ids: string[]) => void;
    /** 사용자가 툴바에서 도구를 바꿨을 때 ('' = 선택 모드) */
    onToolChange?: (tool: string) => void;
};

export interface MarkerOptions {
    readOnly?: boolean;
    manageLabels?: boolean;
    savedLabelInfo?: LabelInfo[][];
    savedMemo?: string;
    labelNameList?: ClassInfo[] | string[];
    header?: AxiosRequestHeaders;
    withCredentials?: boolean;
    labelMemoType?: LabelMemoType;
    labelMemoOptions?: string[];
    localSave?: boolean;
    paletteButtons?: ReactNode;
    fitPoint?: boolean;
    modifyOnly?: boolean;
    /* ---- 1.4+ ---- */
    /** 우측 라벨 드로어(클래스 선택·마크 목록)를 렌더링하지 않음. 호스트가 자체 패널을 쓸 때 */
    hideLabelNavigator?: boolean;
    /** 상단 팔레트(저장·배경·격자·크기)를 렌더링하지 않음 */
    hidePalette?: boolean;
    /** 저장 버튼/Ctrl+S 시 확인 대화상자 표시 (기본 true) */
    confirmOnSave?: boolean;
    /** 저장 완료 스낵바 표시 (기본 true) */
    showSaveNotification?: boolean;
    /** 로드 직후 활성화할 도구 (프리셋 id). 기본은 선택 모드 */
    defaultTool?: string;
}

const defaultOptions: MarkerOptions = {
    readOnly: false,
    withCredentials: true,
    labelNameList: [],
    manageLabels: true,
    fitPoint: true,
    modifyOnly: false,
    hideLabelNavigator: false,
    hidePalette: false,
    confirmOnSave: true,
    showSaveNotification: true
}

function Marker({ fileUri, fileBlob, axiosInstance, saveHandler, handleClassChanged, options = defaultOptions, onChange, onSelectedLabelChange, onSelectionChange, onToolChange }: MarkerProps, ref: Ref<MarkerState>) {
    const combinedOption = { ...defaultOptions, ...options }
    const providerState = useRef(null as MapProviderState | null);

    // 콜백 최신 참조 (이펙트/핸들에서 stale closure 방지)
    const callbacks = useRef({ onChange, onSelectedLabelChange, onSelectionChange, onToolChange });
    callbacks.current = { onChange, onSelectedLabelChange, onSelectionChange, onToolChange };

    const [toolRequest, setToolRequest] = useState<{ tool: string; seq: number } | undefined>(
        combinedOption.defaultTool !== undefined ? { tool: combinedOption.defaultTool, seq: 0 } : undefined
    );

    const [open, setOpen] = useState(!combinedOption.hideLabelNavigator);
    const boxRef = useRef(null);
    // OpenLayers 맵 컨테이너. 고정 id 대신 ref를 넘겨 다중 인스턴스를 허용한다.
    const mapTargetRef = useRef<HTMLDivElement>(null);
    const [localLabelInfo, setLocalLabelInfo] = useState(combinedOption.savedLabelInfo);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [memo, setMemo] = useState(combinedOption.savedMemo);
    const [localCheck, setLocalCheck] = useState(true);

    const [globalLabelNameList, setGlobalLabelNameList] = useState<ClassInfo[] | undefined>(undefined);

    const [saveNotificationOpen, setSaveNotificationOpen] = useState(false);

    const storage_key = LOCAL_STORAGE_KEY + fileUri;
    const storage_memo_key = LOCAL_STORAGE_KEY + fileUri + "memo";

    const getLabel = (toObject: boolean) => {
        let labelList = [];
        let baseDrawer = new BaseDrawer<BaseMark>();
        
        if (providerState.current) {
            const pageLabelList = providerState.current.pageLabelList();
            for (let i = 0; i < pageLabelList.length; i++) {
                let currentLabelList = pageLabelList[i];
                let pageLabelList_ = [];
                for (let j = 0; j < currentLabelList.length; j++) {
                    let map = providerState.current.map();
                    let item = currentLabelList[j];
                    let markData = baseDrawer.createSaveData(map, item, combinedOption.fitPoint);

                    pageLabelList_.push({
                        data: toObject ? markData : JSON.stringify(markData),
                        toolType: item.feature.get(TOOL_TYPE),
                        label: item.label?.labelName,
                        id: String(item.feature.getId()),
                        memo: item.memo
                    } as LabelInfo);
                }

                labelList.push(pageLabelList_);
            }

        }

        return labelList;
    }

    const getMemo = () => {
        let memo = "";
        if (providerState.current) {
            memo = providerState.current.memo();
        }

        return memo;
    }

    const onSave = () => {
        let labels = getLabel(true);
        let memo = getMemo();

        const notify = () => { if (combinedOption.showSaveNotification) setSaveNotificationOpen(true); };
        if (saveHandler) {
            saveHandler(labels, memo, notify);
            localStorage.removeItem(storage_key);
            localStorage.removeItem(storage_memo_key);
        } else {
            notify();
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
                // 호스트가 넘긴 객체를 직접 고치지 않고 복사본에 색을 채운다.
                let labelNameList = combinedOption.labelNameList as ClassInfo[];
                setGlobalLabelNameList(labelNameList.map((o: ClassInfo, i: number) => (
                    o.color ? { ...o } : { ...o, color: allocateColor(i) }
                )));
            }
        } else {
            setGlobalLabelNameList([]);
        }

        setLocalLabelInfo(combinedOption.savedLabelInfo);
        // options 객체 자체가 아니라 실제로 로드에 영향을 주는 필드만 감시한다.
        // (인라인 options 객체 때문에 매 렌더마다 라벨이 리로드되어 편집 중 도형이 사라지던 문제)
    }, [combinedOption.labelNameList, combinedOption.savedLabelInfo]);

    useImperativeHandle(ref, () => ({
        getLabelList: () => {
            return getLabel(true);
        },
        getLabelNameList: () => {
            return providerState.current?.labelNameList() ?? [];
        },
        getSelectedLabel: () => providerState.current?.selectedLabel(),
        setSelectedLabel: (labelName: string) => providerState.current?.setSelectedLabel(labelName) ?? false,
        setTool: (tool: string) => setToolRequest(prev => ({ tool, seq: (prev?.seq ?? 0) + 1 })),
        getSelectedIds: () => providerState.current?.selectedIds() ?? [],
        selectMark: (id: string, exclusive?: boolean) => providerState.current?.selectMark(id, exclusive),
        unselectMark: (id: string) => providerState.current?.unselectMark(id),
        clearSelection: () => providerState.current?.clearSelection(),
        removeMark: (id: string) => providerState.current?.removeMark(id),
        setMarkLabel: (id: string, labelName: string) => providerState.current?.setMarkLabel(id, labelName) ?? false,
        setMarkMemo: (id: string, memoText: string) => providerState.current?.setMarkMemo(id, memoText),
        setMarkData: (id: string, data: LabelFormat) => providerState.current?.setMarkData(id, data) ?? false,
        setMarkOrder: (id: string, order: number) => providerState.current?.setMarkOrder(id, order),
        getMaskSettings: () => providerState.current?.getMaskSettings(),
        setMaskSettings: (patch: Partial<MaskSettings>) => providerState.current?.setMaskSettings(patch),
        newInstance: () => providerState.current?.newInstance()
    } as MarkerState));

    if (globalLabelNameList)
        return (
            <MapProvider
                load={localCheck}
                ref={providerState}
                fileUri={fileUri}
                fileBlob={fileBlob}
                axiosInstance={axiosInstance}
                labelNameList={globalLabelNameList}
                header={combinedOption.header}
                withCredentials={combinedOption.withCredentials}
                memo={memo}
                targetRef={mapTargetRef}
                onLabelsChange={() => callbacks.current.onChange?.(getLabel(true))}
                onSelectedLabelChange={(label) => callbacks.current.onSelectedLabelChange?.(label)}
                onSelectionChange={(features) => callbacks.current.onSelectionChange?.((features ?? []).map(f => String(f.getId())))}
            >
                <PageControl />
                <Box ref={boxRef} height={"100%"} position={"relative"}>
                    <MarkerMain ref={mapTargetRef} open={open && !combinedOption.hideLabelNavigator} />
                    {
                        !combinedOption.hideLabelNavigator &&
                        <IconButton color="secondary" sx={{ position: "absolute", right: "15px", top: "15px" }} onClick={() => { setOpen(true); }}>
                            <ArrowCircleLeft />
                        </IconButton>
                    }
                    {
                        !combinedOption.hidePalette &&
                        <PaletteNavigator root={boxRef} onSaveLocal={onLocalSave} onSaveServer={onSave} confirmOnSave={combinedOption.confirmOnSave}>
                            {combinedOption.paletteButtons}
                        </PaletteNavigator>
                    }
                    {
                        !combinedOption.readOnly &&
                        <ToolNavigator
                            pageLabelInfo={localLabelInfo}
                            fitPoint={combinedOption.fitPoint}
                            modifyOnly={combinedOption.modifyOnly}
                            toolRequest={toolRequest}
                            onToolChange={(tool) => callbacks.current.onToolChange?.(tool)}
                        />
                    }
                    {
                        !combinedOption.hideLabelNavigator &&
                        <LabelNavigator
                            open={open}
                            labelMemoType={combinedOption.labelMemoType}
                            labelMemoOptions={combinedOption.labelMemoOptions}
                            manageLabels={combinedOption.manageLabels}
                            handleClassChanged={handleClassChanged}
                            onOpenChange={() => {
                                setOpen(false);
                            }}
                        />
                    }
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
                            <Close />
                        </Button>
                    }
                />
            </MapProvider>
        );

    return <></>
}

const RefMarker = React.forwardRef<MarkerState, MarkerProps>(Marker);

export default RefMarker;