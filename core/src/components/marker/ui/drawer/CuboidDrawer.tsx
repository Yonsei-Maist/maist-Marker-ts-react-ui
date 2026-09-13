/**
 * ⑧ Cuboid (3D, 확장 옵션) — 2D 이미지 위의 2.5D 직육면체 입력. (1.5+)
 * 앞면 박스를 드래그로 그리면 깊이 오프셋만큼 밀린 뒷면이 생기고, 두 면의 꼭짓점을 잇는다.
 * - 앞면 꼭짓점 드래그: 앞면 리사이즈(뒷면은 같은 오프셋 유지)
 * - 뒷면 꼭짓점 드래그: 깊이 오프셋 변경
 * 저장 형식: coco = 앞면 [x, y, w, h], depth = [dx, dy] (같은 단위)
 * 3D 스마트미러 확장 시 depth를 실제 z 축 값으로 대체할 수 있도록 데이터 모델을 분리했다.
 */
import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { never, platformModifierKeyOnly, primaryAction } from "ol/events/condition";
import { Geometry, GeometryCollection, LineString, MultiPoint, Point, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import VectorLayer from "ol/layer/Vector";
import { FeatureLike } from "ol/Feature";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";

import BaseDrawer from "./BaseDrawer";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import { MARK, TOOL_MEMO, TOOL_TYPE } from "@/constants/tag";

/** 앞면 4점 (TL, TR, BR, BL) + 닫힘 */
function rect(minX: number, minY: number, maxX: number, maxY: number): Coordinate[][] {
    return [[[minX, maxY], [maxX, maxY], [maxX, minY], [minX, minY], [minX, maxY]]];
}

function extentOf(coords: Coordinate[]) {
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function buildCollection(front: Coordinate[][], depth: Coordinate): GeometryCollection {
    const back = front[0].map(c => [c[0] + depth[0], c[1] + depth[1]]);
    return new GeometryCollection([new Polygon(front), new Polygon([back])]);
}

export class CuboidMark extends BaseMark {
    front: Coordinate[][];
    depth: Coordinate;

    refresh(): LabelFormat {
        const feature = this.feature;
        if (feature) {
            const geos = (feature.getGeometry() as GeometryCollection).getGeometries();
            this.front = (geos[0] as Polygon).getCoordinates();
            const backFirst = (geos[1] as Polygon).getCoordinates()[0][0];
            this.depth = [backFirst[0] - this.front[0][0][0], backFirst[1] - this.front[0][0][1]];
            const e = extentOf(this.front[0].map(p => [Math.abs(p[0]), Math.abs(p[1])]));
            return {
                mark: this,
                coco: [e.minX, e.minY, e.maxX - e.minX, e.maxY - e.minY],
                depth: [this.depth[0], -this.depth[1]]
            };
        }
        return super.refresh();
    }

    fromFormat(format: LabelFormat): void {
        if (format.coco && format.coco.length >= 4) {
            const [x, y, w, h] = format.coco;
            this.front = rect(x, -(y + h), x + w, -y);
            const d = format.depth ?? [w * 0.2, h * 0.2];
            this.depth = [d[0], -d[1]];
        } else if (format.mark instanceof CuboidMark) {
            this.front = format.mark.front;
            this.depth = format.mark.depth;
        }
    }
}

class CuboidDrawer extends BaseDrawer<CuboidMark> {
    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): CuboidMark {
        const mark = this.loadSaveData(CuboidMark, saveData);
        mark.feature = new Feature(buildCollection(mark.front, mark.depth));
        mark.toolType = toolType;
        mark.feature.set(TOOL_MEMO, memo);
        mark.feature.set(TOOL_TYPE, toolType);
        return mark;
    }

    fromFeature(feature: Feature<Geometry>): CuboidMark {
        const mark = new CuboidMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.toolType = feature.get(TOOL_TYPE);
        mark.refresh();
        return mark;
    }

    createDraw(layer: VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            freehand: false,
            type: "Circle",
            freehandCondition: this.condition,
            geometryFunction: createBox()
        });

        // 앞면 박스가 그려지면 기본 깊이(너비의 20%, 위쪽 방향)로 뒷면을 만든다.
        this.draw.on('drawend', (event) => {
            const poly = event.feature.getGeometry() as Polygon;
            const e = extentOf(poly.getCoordinates()[0]);
            const front = rect(e.minX, e.minY, e.maxX, e.maxY);
            const depth: Coordinate = [(e.maxX - e.minX) * 0.2, (e.maxY - e.minY) * 0.2];
            event.feature.setGeometry(buildCollection(front, depth));
        });

        return this.draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select: Select) {
        const defaultStyle = new Modify({ features: select.getFeatures() }).getOverlay().getStyleFunction();
        this.modify = new Modify({
            condition: (event) => primaryAction(event) && !platformModifierKeyOnly(event),
            deleteCondition: never,
            insertVertexCondition: never,
            style: (feature) => {
                feature.get('features').forEach((modifyFeature: Feature) => {
                    const mg = modifyFeature.get('modifyGeometry');
                    if (!mg) return;
                    const point = (feature.getGeometry() as Point).getCoordinates();
                    const front: Coordinate[] = mg.front;
                    const back: Coordinate[] = front.map(c => [c[0] + mg.depth[0], c[1] + mg.depth[1]]);
                    if (mg.handle === undefined) {
                        // 가장 가까운 꼭짓점: 앞면 0~3, 뒷면 4~7
                        let best = 0, min = Infinity;
                        [...front.slice(0, 4), ...back.slice(0, 4)].forEach((c, i) => {
                            const d = Math.hypot(c[0] - point[0], c[1] - point[1]);
                            if (d < min) { min = d; best = i; }
                        });
                        mg.handle = best;
                    }
                    let newFront = front;
                    let newDepth: Coordinate = mg.depth;
                    if (mg.handle < 4) {
                        // 앞면 리사이즈: 잡은 꼭짓점의 대각 꼭짓점을 고정
                        const opposite = front[(mg.handle + 2) % 4];
                        const e = extentOf([opposite, point]);
                        newFront = rect(e.minX, e.minY, e.maxX, e.maxY)[0];
                    } else {
                        const anchor = front[mg.handle - 4];
                        newDepth = [point[0] - anchor[0], point[1] - anchor[1]];
                    }
                    mg.geometry = buildCollection([newFront], newDepth);
                });
                return defaultStyle ? defaultStyle(feature, 0) : undefined;
            },
            features: select.getFeatures()
        });

        this.modify.on('modifystart', (event) => {
            event.features.forEach((feature) => {
                if (feature instanceof Feature && feature.getGeometry() instanceof GeometryCollection) {
                    const geos = (feature.getGeometry() as GeometryCollection).getGeometries();
                    const front = (geos[0] as Polygon).getCoordinates()[0].map(c => [...c] as Coordinate);
                    const b0 = (geos[1] as Polygon).getCoordinates()[0][0];
                    const depth: Coordinate = [b0[0] - front[0][0], b0[1] - front[0][1]];
                    feature.set('modifyGeometry', { geometry: feature.getGeometry().clone(), front, depth, handle: undefined }, true);
                }
            });
        });

        this.modify.on('modifyend', (event) => {
            event.features.forEach((feature) => {
                if (feature instanceof Feature) {
                    const mg = feature.get('modifyGeometry');
                    if (mg) {
                        feature.setGeometry(mg.geometry);
                        feature.unset('modifyGeometry', true);
                    }
                }
            });
        });

        this.modify.setActive(false);
        return this.modify;
    }

    private cuboidStyles(feature: FeatureLike, selected: boolean): Style[] {
        const mark = feature.get(MARK) as BaseMark | undefined;
        const color = mark?.label?.color ?? '#ff3333';
        const geo = (feature.getGeometry() as GeometryCollection);
        const geos = geo.getGeometries();
        const front = (geos[0] as Polygon).getCoordinates()[0];
        const back = (geos[1] as Polygon).getCoordinates()[0];
        const edges = new LineString([]);
        const lines: Coordinate[][] = [];
        for (let i = 0; i < 4; i++) lines.push([front[i], back[i]]);
        void edges;
        const styles: Style[] = [
            new Style({ geometry: geos[0], stroke: new Stroke({ color, width: selected ? 2 : 1.5 }), fill: new Fill({ color: 'rgba(255,255,255,0.08)' }) }),
            new Style({ geometry: geos[1], stroke: new Stroke({ color, width: 1, lineDash: [6, 4] }) }),
            ...lines.map(l => new Style({ geometry: new LineString(l), stroke: new Stroke({ color, width: 1, lineDash: [6, 4] }) }))
        ];
        if (selected) {
            styles.push(new Style({
                geometry: new MultiPoint([...front.slice(0, 4), ...back.slice(0, 4)]),
                image: new CircleStyle({ radius: 4, fill: new Fill({ color: '#33cc33' }) })
            }));
        }
        return styles;
    }

    getVectorStyle(feature?: FeatureLike): Style | Style[] {
        return feature ? this.cuboidStyles(feature, false) : super.getVectorStyle(feature);
    }

    getSelectStyle(feature: Feature): Style[] {
        return this.cuboidStyles(feature, true);
    }
}

export default CuboidDrawer;
