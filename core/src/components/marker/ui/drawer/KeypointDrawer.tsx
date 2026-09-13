/**
 * ④ Keypoint — 단일/다중 포인트 지정, 포인트별 라벨(클래스)·순번 부여. (1.5+)
 * 순번은 같은 클래스의 기존 포인트 수 + 1로 자동 부여되고, setMarkOrder로 바꿀 수 있다.
 * 저장 형식: coco = [x, y], order = 순번
 */
import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { Geometry, Point } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import VectorLayer from "ol/layer/Vector";
import { FeatureLike } from "ol/Feature";
import { Style, Fill, Stroke, Text, Circle as CircleStyle } from "ol/style";

import BaseDrawer from "./BaseDrawer";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import { MARK, SELECTED_LABEL, TOOL_MEMO, TOOL_TYPE } from "@/constants/tag";
import { ClassInfo } from "../../context";

const KP_ORDER = "KP_ORDER";

export class KeypointMark extends BaseMark {
    location: Coordinate;
    order: number;

    refresh(): LabelFormat {
        const feature = this.feature;
        if (feature) {
            this.location = (feature.getGeometry() as Point).getCoordinates();
            return {
                mark: this,
                coco: [this.location[0], Math.abs(this.location[1])],
                order: this.order
            };
        }
        return super.refresh();
    }

    fromFormat(format: LabelFormat): void {
        if (format.coco && format.coco.length >= 2) {
            this.location = [format.coco[0], -format.coco[1]];
        } else if (format.mark instanceof KeypointMark) {
            this.location = format.mark.location;
        }
        if (format.order !== undefined) this.order = format.order;
    }
}

class KeypointDrawer extends BaseDrawer<KeypointMark> {
    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): KeypointMark {
        const mark = this.loadSaveData(KeypointMark, saveData);
        mark.feature = new Feature(new Point(mark.location));
        mark.toolType = toolType;
        mark.feature.set(TOOL_MEMO, memo);
        mark.feature.set(TOOL_TYPE, toolType);
        return mark;
    }

    fromFeature(feature: Feature<Geometry>): KeypointMark {
        const mark = new KeypointMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.toolType = feature.get(TOOL_TYPE);
        mark.order = feature.get(KP_ORDER) ?? 1;
        mark.refresh();
        return mark;
    }

    createDraw(layer: VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            type: "Point",
            condition: this.condition
        });

        // 이 리스너는 ToolNavigator의 drawend(마크 생성)보다 먼저 실행된다.
        // 같은 클래스의 기존 포인트 수 + 1을 순번으로 붙여 둔다.
        this.draw.on('drawend', (event) => {
            const map = this.draw.getMap();
            const selected = map?.get(SELECTED_LABEL) as ClassInfo | undefined;
            const toolType = event.feature.get(TOOL_TYPE);
            let count = 0;
            for (const f of layer.getSource().getFeatures()) {
                const m = f.get(MARK) as BaseMark | undefined;
                if (m instanceof KeypointMark && (!selected || m.label?.labelName === selected.labelName)) count++;
            }
            event.feature.set(KP_ORDER, count + 1);
            void toolType;
        });

        return this.draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select: Select) {
        this.modify = new Modify({
            condition: (event) => primaryAction(event) && !platformModifierKeyOnly(event),
            insertVertexCondition: never,
            deleteCondition: never,
            features: select.getFeatures()
        });
        this.modify.setActive(false);
        return this.modify;
    }

    private pointStyle(feature: FeatureLike, selected: boolean): Style[] {
        const mark = feature.get(MARK) as KeypointMark | undefined;
        const color = mark?.label?.color ?? '#ff3333';
        const text = mark ? `${mark.order ?? ''}` : '';
        return [
            new Style({
                image: new CircleStyle({
                    radius: selected ? 8 : 6,
                    fill: new Fill({ color }),
                    stroke: new Stroke({ color: '#ffffff', width: selected ? 3 : 2 })
                }),
                text: new Text({
                    text,
                    font: 'bold 12px sans-serif',
                    offsetY: -14,
                    fill: new Fill({ color: '#ffffff' }),
                    backgroundFill: new Fill({ color }),
                    padding: [1, 4, 1, 4]
                })
            })
        ];
    }

    getVectorStyle(feature?: FeatureLike): Style | Style[] {
        return feature ? this.pointStyle(feature, false) : super.getVectorStyle(feature);
    }

    getSelectStyle(feature: Feature): Style[] {
        return this.pointStyle(feature, true);
    }
}

export default KeypointDrawer;
