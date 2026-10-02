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
    /* ---- 1.6+: 되돌리기 ---- */
    /** 직전 상태로 되돌린다. 되돌릴 것이 없으면 false */
    undo: () => boolean;
    /** 되돌린 것을 다시 적용한다. 없으면 false */
    redo: () => boolean;
    /** 되돌리기·다시하기 가능 여부 (버튼 활성화용) */
    canUndo: () => boolean;
    canRedo: () => boolean;
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
    /**
     * 보기 전용. 저장된 마크를 표시하고 클릭·`selectMark`로 선택만 할 수 있다.
     * 툴바·브러시 설정·저장 버튼(Ctrl+S)·삭제 키가 없고, ref의 편집 메서드(setTool, removeMark,
     * setMarkLabel, setMarkMemo, setMarkData, setMarkOrder, newInstance)는 아무것도 하지 않는다.
     * 인터랙션 구성은 마운트 시점 값으로 정해지므로, 바꾸려면 `key`를 바꿔 다시 마운트한다.
     */
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
    /* ---- 1.6+ ---- */
    /**
     * 좌측 도구 막대와 브러시 설정 패널을 렌더링하지 않음. 호스트가 자체 도구 UI를 쓸 때.
     * 도구 전환은 `setTool`, 브러시는 `getMaskSettings`/`setMaskSettings`/`newInstance`로 한다.
     * 선택 도형 삭제(Delete)와 되돌리기 단축키는 그대로 동작한다.
     */
    hideToolbar?: boolean;
    /** 되돌리기 단축키(Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y)를 끔. 호스트가 직접 처리할 때 */
    disableUndoShortcut?: boolean;
    /** 되돌리기 이력 길이 (기본 50) */
    historyLimit?: number;
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

    /**
     * 되돌리기 이력. 마크 목록 전체를 스냅샷으로 쌓고, 되돌릴 때는 저장 데이터를 다시 로드하는
     * 경로(`pageLabelInfo`)를 그대로 쓴다. 도형·마스크가 같은 길로 복원되므로 타입별 처리가 없다.
     * `restoring`은 복원 때문에 발생하는 변경을 이력에 다시 쌓지 않기 위한 표시다.
     */
    const history = useRef<{
        past: LabelInfo[][][];
        future: LabelInfo[][][];
        current?: LabelInfo[][];
        restoring: boolean;
    }>({ past: [], future: [], restoring: false });

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

    /** 마크 목록이 바뀔 때마다 이력에 쌓고 호스트에 알린다 */
    const handleLabelsChange = () => {
        const snapshot = getLabel(true);
        const h = history.current;
        if (h.restoring) {
            h.restoring = false;
        } else if (h.current) {
            h.past.push(h.current);
            const limit = combinedOption.historyLimit ?? 50;
            if (h.past.length > limit) h.past.shift();
            h.future = [];
        }
        h.current = snapshot;
        callbacks.current.onChange?.(snapshot);
    };

    /** 저장 데이터 로드 경로로 되돌린다. 참조가 같으면 로드가 돌지 않으므로 항상 새 배열을 만든다 */
    const restoreSnapshot = (next: LabelInfo[][]) => {
        history.current.restoring = true;
        history.current.current = next;
        setLocalLabelInfo(next.map((page) => page.map((item) => ({ ...item }))));
    };

    const undo = () => {
        const h = history.current;
        if (combinedOption.readOnly || h.past.length === 0 || !h.current) return false;
        h.future.push(h.current);
        restoreSnapshot(h.past.pop() as LabelInfo[][]);
        return true;
    };

    const redo = () => {
        const h = history.current;
        if (combinedOption.readOnly || h.future.length === 0 || !h.current) return false;
        h.past.push(h.current);
        restoreSnapshot(h.future.pop() as LabelInfo[][]);
        return true;
    };

    useEffect(() => {
        if (combinedOption.readOnly || combinedOption.disableUndoShortcut) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            const key = e.key.toLowerCase();
            if (key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
            } else if (key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [combinedOption.readOnly, combinedOption.disableUndoShortcut]);

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

        // 다른 이미지·저장본을 받으면 되돌리기 이력도 새로 시작한다
        history.current = { past: [], future: [], restoring: false };
        setLocalLabelInfo(combinedOption.savedLabelInfo);
        // options 객체 자체가 아니라 실제로 로드에 영향을 주는 필드만 감시한다.
        // (인라인 options 객체 때문에 매 렌더마다 라벨이 리로드되어 편집 중 도형이 사라지던 문제)
    }, [combinedOption.labelNameList, combinedOption.savedLabelInfo]);

    const readOnlyRef = useRef(!!combinedOption.readOnly);
    readOnlyRef.current = !!combinedOption.readOnly;

    useImperativeHandle(ref, () => ({
        getLabelList: () => {
            return getLabel(true);
        },
        getLabelNameList: () => {
            return providerState.current?.labelNameList() ?? [];
        },
        getSelectedLabel: () => providerState.current?.selectedLabel(),
        setSelectedLabel: (labelName: string) => providerState.current?.setSelectedLabel(labelName) ?? false,
        setTool: (tool: string) => readOnlyRef.current ? undefined : setToolRequest(prev => ({ tool, seq: (prev?.seq ?? 0) + 1 })),
        getSelectedIds: () => providerState.current?.selectedIds() ?? [],
        selectMark: (id: string, exclusive?: boolean) => providerState.current?.selectMark(id, exclusive),
        unselectMark: (id: string) => providerState.current?.unselectMark(id),
        clearSelection: () => providerState.current?.clearSelection(),
        removeMark: (id: string) => readOnlyRef.current ? undefined : providerState.current?.removeMark(id),
        setMarkLabel: (id: string, labelName: string) => readOnlyRef.current ? false : providerState.current?.setMarkLabel(id, labelName) ?? false,
        setMarkMemo: (id: string, memoText: string) => readOnlyRef.current ? undefined : providerState.current?.setMarkMemo(id, memoText),
        setMarkData: (id: string, data: LabelFormat) => readOnlyRef.current ? false : providerState.current?.setMarkData(id, data) ?? false,
        setMarkOrder: (id: string, order: number) => readOnlyRef.current ? undefined : providerState.current?.setMarkOrder(id, order),
        getMaskSettings: () => providerState.current?.getMaskSettings(),
        setMaskSettings: (patch: Partial<MaskSettings>) => providerState.current?.setMaskSettings(patch),
        newInstance: () => readOnlyRef.current ? undefined : providerState.current?.newInstance(),
        undo,
        redo,
        canUndo: () => history.current.past.length > 0,
        canRedo: () => history.current.future.length > 0
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
                onLabelsChange={handleLabelsChange}
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
                        <PaletteNavigator root={boxRef} onSaveLocal={onLocalSave} onSaveServer={onSave} confirmOnSave={combinedOption.confirmOnSave} readOnly={combinedOption.readOnly}>
                            {combinedOption.paletteButtons}
                        </PaletteNavigator>
                    }
                    {
                        <ToolNavigator
                            readOnly={combinedOption.readOnly}
                            pageLabelInfo={localLabelInfo}
                            hideToolbar={combinedOption.hideToolbar}
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
                            manageLabels={combinedOption.manageLabels && !combinedOption.readOnly}
                            readOnly={combinedOption.readOnly}
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