/**
 * ⑤ Semantic Segmentation / ⑥ Instance Segmentation — 픽셀 단위 브러시 마스크. (1.5+)
 *
 * - 마스크는 원본 픽셀 크기의 캔버스에 클래스 색으로 칠한다. 브러시/소거, 브러시 크기, 투명도.
 * - Semantic: 클래스당 마스크 1장. 선택된 클래스의 마스크가 없으면 첫 스트로크에서 만든다.
 * - Instance: 인스턴스마다 마스크 1장, 인스턴스 번호(order) 자동 부여, 중첩 허용(그린 순서대로 겹침).
 *   newInstance() 후 첫 스트로크가 새 인스턴스를 만든다.
 * - 렌더링은 ToolNavigator가 만든 MASK_LAYER(ImageCanvas)가 벡터 소스의 MaskMark를 모두 합성한다.
 * - 저장 형식: mask = PNG data URL, maskSize = [w, h], order = 인스턴스 번호, coco = []
 *
 * 브러시 인터랙션은 ol의 Draw가 아니라 PointerInteraction이지만 ToolNavigator가 기대하는
 * 'drawend' 이벤트(새 마크 생성 시)를 같은 방식으로 발생시킨다.
 */
import { Feature, Map as OlMap } from "ol";
import { Coordinate } from "ol/coordinate";
import { Geometry, Point } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import PointerInteraction from "ol/interaction/Pointer";
import { MapBrowserEvent } from "ol";
import VectorLayer from "ol/layer/Vector";
import { FeatureLike } from "ol/Feature";
import { Style } from "ol/style";
import Event from "ol/events/Event";
import { v4 as uuidv4 } from "uuid";

import BaseDrawer from "./BaseDrawer";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import { DrawObject } from "@/lib/CanvasDrawer";
import { CURRENT_INSTANCE, DRAW_OBJECT, MAP_HEIGHT, MAP_WIDTH, MARK, MASK_LAYER, MASK_SETTINGS, SELECTED_LABEL, TOOL_MEMO, TOOL_TYPE } from "@/constants/tag";
import { ClassInfo } from "../../context";

export interface MaskSettings {
    /** 브러시 반지름 (원본 픽셀) */
    size: number;
    mode: 'paint' | 'erase';
    /** 마스크 표시 투명도 0~1 */
    opacity: number;
}

export const DEFAULT_MASK_SETTINGS: MaskSettings = { size: 16, mode: 'paint', opacity: 0.5 };

export function getMaskSettings(map: OlMap): MaskSettings {
    let s = map.get(MASK_SETTINGS) as MaskSettings | undefined;
    if (!s) {
        s = { ...DEFAULT_MASK_SETTINGS };
        map.set(MASK_SETTINGS, s);
    }
    return s;
}

/** 캔버스는 직렬화 대상이 아니므로 마크 객체 밖에 둔다 (createSaveData가 마크를 spread 함) */
const canvases = new WeakMap<MaskMark, HTMLCanvasElement>();

export class MaskMark extends BaseMark {
    /** 마스크 캔버스 크기 (원본 픽셀) */
    maskSize: number[];
    /** 인스턴스 번호 (Instance Segmentation) */
    order?: number;
    /** 로드 시 받은 data URL (캔버스 디코딩 전까지 보관) */
    pendingMask?: string;

    get canvas(): HTMLCanvasElement | undefined {
        return canvases.get(this);
    }

    ensureCanvas(width: number, height: number): HTMLCanvasElement {
        let c = canvases.get(this);
        if (!c) {
            c = document.createElement('canvas');
            c.width = width;
            c.height = height;
            canvases.set(this, c);
            this.maskSize = [width, height];
        }
        return c;
    }

    /** 마스크 픽셀을 현재 라벨 색으로 다시 칠한다 (클래스 변경 시) */
    recolor(color: string) {
        const c = canvases.get(this);
        if (!c) return;
        const ctx = c.getContext('2d')!;
        ctx.save();
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.restore();
    }

    refresh(): LabelFormat {
        const c = canvases.get(this);
        return {
            mark: this,
            coco: [],
            mask: c ? c.toDataURL('image/png') : this.pendingMask,
            maskSize: this.maskSize,
            order: this.order
        };
    }

    fromFormat(format: LabelFormat): void {
        this.pendingMask = format.mask;
        this.maskSize = format.maskSize;
        this.order = format.order;
    }
}

/** 새 마크가 생겼음을 ToolNavigator에 알리는 이벤트 (Draw의 drawend와 같은 모양) */
class MaskDrawEndEvent extends Event {
    feature: Feature;
    constructor(feature: Feature) {
        super('drawend');
        this.feature = feature;
    }
}

/** 맵 좌표 → 원본 픽셀 */
function toPixel(map: OlMap, coord: Coordinate): [number, number] {
    const w = map.get(MAP_WIDTH) as number;
    const h = map.get(MAP_HEIGHT) as number;
    const d = map.get(DRAW_OBJECT) as DrawObject;
    return [coord[0] / w * d.width, -coord[1] / h * d.height];
}

class MaskBrushInteraction extends PointerInteraction {
    private layer: VectorLayer<Feature<Geometry>>;
    private instance: boolean;
    private target?: MaskMark;
    private last?: [number, number];
    private drawer: MaskDrawer;

    constructor(layer: VectorLayer<Feature<Geometry>>, instance: boolean, drawer: MaskDrawer) {
        super();
        this.layer = layer;
        this.instance = instance;
        this.drawer = drawer;
    }

    private findSemanticTarget(label?: ClassInfo): MaskMark | undefined {
        for (const f of this.layer.getSource().getFeatures()) {
            const m = f.get(MARK);
            if (m instanceof MaskMark && f.get(TOOL_TYPE) === this.drawer.toolTypeName && m.label?.labelName === label?.labelName) return m;
        }
        return undefined;
    }

    private findInstanceTarget(map: OlMap): MaskMark | undefined {
        const id = map.get(CURRENT_INSTANCE);
        if (!id) return undefined;
        const f = this.layer.getSource().getFeatureById(id);
        const m = f?.get(MARK);
        return m instanceof MaskMark ? m : undefined;
    }

    private createTarget(map: OlMap, label?: ClassInfo): MaskMark {
        const d = map.get(DRAW_OBJECT) as DrawObject;
        const mark = new MaskMark();
        mark.ensureCanvas(d.width, d.height);
        mark.label = label;
        if (this.instance) {
            let count = 0;
            for (const f of this.layer.getSource().getFeatures()) {
                const m = f.get(MARK);
                if (m instanceof MaskMark && f.get(TOOL_TYPE) === this.drawer.toolTypeName) count++;
            }
            mark.order = count + 1;
        }
        // 선택용 대표 지점: 이미지 중앙 (마스크는 벡터 지오메트리가 없다)
        const w = map.get(MAP_WIDTH) as number;
        const h = map.get(MAP_HEIGHT) as number;
        const feature = new Feature(new Point([w / 2, -h / 2]));
        feature.setId(uuidv4());
        feature.set(TOOL_TYPE, this.drawer.toolTypeName);
        feature.set(MARK, mark);
        mark.feature = feature;
        mark.toolType = this.drawer.toolTypeName;
        this.layer.getSource().addFeature(feature);
        // ToolNavigator가 라벨 목록에 등록하도록 알린다
        this.dispatchEvent(new MaskDrawEndEvent(feature));
        if (this.instance) map.set(CURRENT_INSTANCE, feature.getId());
        return mark;
    }

    handleDownEvent(evt: MapBrowserEvent<PointerEvent>): boolean {
        if (evt.originalEvent.button !== 0) return false;
        const map = evt.map;
        const label = map.get(SELECTED_LABEL) as ClassInfo | undefined;
        const settings = getMaskSettings(map);
        let target = this.instance ? this.findInstanceTarget(map) : this.findSemanticTarget(label);
        if (!target) {
            if (settings.mode === 'erase') return false; // 지울 대상 없음
            target = this.createTarget(map, label);
        }
        this.target = target;
        this.last = toPixel(map, evt.coordinate);
        this.paint(map, this.last, this.last);
        return true;
    }

    handleDragEvent(evt: MapBrowserEvent<PointerEvent>): void {
        if (!this.target || !this.last) return;
        const p = toPixel(evt.map, evt.coordinate);
        this.paint(evt.map, this.last, p);
        this.last = p;
    }

    handleUpEvent(): boolean {
        if (this.target) {
            this.dispatchEvent(new Event('strokeend'));
        }
        this.target = undefined;
        this.last = undefined;
        return false;
    }

    private paint(map: OlMap, from: [number, number], to: [number, number]) {
        const mark = this.target!;
        const d = map.get(DRAW_OBJECT) as DrawObject;
        const c = mark.ensureCanvas(d.width, d.height);
        const ctx = c.getContext('2d')!;
        const settings = getMaskSettings(map);
        ctx.save();
        ctx.globalCompositeOperation = settings.mode === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = mark.label?.color ?? '#ff3333';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = settings.size * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(to[0], to[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(to[0], to[1], settings.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const maskLayer = map.get(MASK_LAYER);
        maskLayer?.getSource()?.changed();
    }
}

class MaskDrawer extends BaseDrawer<MaskMark> {
    readonly instance: boolean;
    toolTypeName: string;

    constructor(instance: boolean, toolTypeName: string) {
        super();
        this.instance = instance;
        this.toolTypeName = toolTypeName;
    }

    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): MaskMark {
        const mark = this.loadSaveData(MaskMark, saveData);
        mark.feature = new Feature(new Point([0, 0]));
        mark.toolType = toolType;
        mark.feature.set(TOOL_MEMO, memo);
        mark.feature.set(TOOL_TYPE, toolType);
        // data URL → 캔버스 (비동기 디코딩)
        if (mark.pendingMask && mark.maskSize) {
            const c = mark.ensureCanvas(mark.maskSize[0], mark.maskSize[1]);
            const img = new Image();
            img.onload = () => {
                c.getContext('2d')!.drawImage(img, 0, 0);
                mark.pendingMask = undefined;
                const map = this.draw?.getMap?.();
                map?.get(MASK_LAYER)?.getSource()?.changed();
            };
            img.src = mark.pendingMask;
        }
        return mark;
    }

    fromFeature(feature: Feature<Geometry>): MaskMark {
        const existing = feature.get(MARK);
        if (existing instanceof MaskMark) return existing;
        const mark = new MaskMark();
        mark.feature = feature;
        mark.toolType = feature.get(TOOL_TYPE);
        return mark;
    }

    createDraw(layer: VectorLayer<Feature<Geometry>>) {
        // PointerInteraction이지만 ToolNavigator는 setActive/on('drawend')만 쓴다
        this.draw = new MaskBrushInteraction(layer, this.instance, this) as unknown as Draw;
        return this.draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select: Select) {
        this.modify = new Modify({ features: select.getFeatures() });
        this.modify.setActive(false);
        return this.modify;
    }

    /** 마스크는 ImageCanvas 레이어가 그리므로 벡터 스타일은 비운다 */
    getVectorStyle(feature?: FeatureLike): Style | Style[] {
        void feature;
        return new Style({});
    }

    getSelectStyle(feature: Feature): Style[] {
        void feature;
        return [new Style({})];
    }
}

/** ToolNavigator가 벡터 레이어 생성 시 호출: 모든 MaskMark를 합성하는 캔버스 함수 */
export function createMaskCanvasFunction(map: OlMap, layer: VectorLayer<Feature<Geometry>>) {
    let canvas: HTMLCanvasElement | undefined;
    return (extent: number[], resolution: number, pixelRatio: number, size: number[]) => {
        void resolution;
        if (!canvas) canvas = document.createElement('canvas');
        canvas.width = size[0];
        canvas.height = size[1];
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, size[0], size[1]);
        const w = map.get(MAP_WIDTH) as number;
        const h = map.get(MAP_HEIGHT) as number;
        if (!w || !h) return canvas;
        // 요청 extent 안에서 이미지 extent [0,-h,w,0]의 픽셀 위치
        const sx = size[0] / (extent[2] - extent[0]);
        const sy = size[1] / (extent[3] - extent[1]);
        const x = (0 - extent[0]) * sx;
        const y = (extent[3] - 0) * sy;
        const dw = w * sx;
        const dh = h * sy;
        const settings = getMaskSettings(map);
        ctx.globalAlpha = settings.opacity;
        for (const f of layer.getSource().getFeatures()) {
            const m = f.get(MARK);
            if (m instanceof MaskMark && m.canvas) {
                ctx.drawImage(m.canvas, x, y, dw, dh);
            }
        }
        ctx.globalAlpha = 1;
        void pixelRatio;
        return canvas;
    };
}

export default MaskDrawer;
