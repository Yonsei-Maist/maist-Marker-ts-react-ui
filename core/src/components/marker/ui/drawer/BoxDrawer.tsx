import { Geometry, Point, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import BasicDrawer from "./BaseDrawer";
import { createBox } from 'ol/interaction/Draw';
import { never, platformModifierKeyOnly, primaryAction } from "ol/events/condition";
import { Feature } from "ol";
import { TOOL_MEMO, TOOL_TYPE } from "@/constants/tag";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import { Coordinate } from "ol/coordinate";
import VectorLayer from "ol/layer/Vector";

/**
 * 박스는 8개 핸들(꼭짓점 4 + 변 중점 4)을 가진 폴리곤으로 표현한다.
 * 순서: TL, T, TR, R, BR, B, BL, L (+ 닫힘점)
 */
export function boxCoords(minX: number, minY: number, maxX: number, maxY: number): Coordinate[][] {
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    return [[
        [minX, maxY], [midX, maxY], [maxX, maxY], [maxX, midY],
        [maxX, minY], [midX, minY], [minX, minY], [minX, midY],
        [minX, maxY]
    ]];
}

function extentOf(coords: Coordinate[]) {
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** 임의의 폴리곤(createBox 결과 5점 등)을 8핸들 박스로 정규화 */
export function normalizeBox(geometry: Polygon) {
    const e = extentOf(geometry.getCoordinates()[0]);
    geometry.setCoordinates(boxCoords(e.minX, e.minY, e.maxX, e.maxY));
}

function fitBox(extent: number[], geometry: Polygon) {
    const e = extentOf(geometry.getCoordinates()[0]);
    const minX = Math.max(extent[0], Math.min(e.minX, extent[2]));
    const maxX = Math.max(extent[0], Math.min(e.maxX, extent[2]));
    const minY = Math.max(extent[1], Math.min(e.minY, extent[3]));
    const maxY = Math.max(extent[1], Math.min(e.maxY, extent[3]));
    geometry.setCoordinates(boxCoords(minX, minY, maxX, maxY));
}

/**
 * 핸들 인덱스와 드래그 지점으로 새 박스를 계산한다 (8방향 리사이즈).
 * 꼭짓점은 두 변, 변 중점은 한 변만 움직인다.
 */
export function resizeBox(origin: Coordinate[], handleIdx: number, point: Coordinate): Coordinate[][] {
    let { minX, minY, maxX, maxY } = extentOf(origin);
    const [px, py] = point;
    switch (handleIdx % 8) {
        case 0: minX = px; maxY = py; break; // TL
        case 1: maxY = py; break;            // T
        case 2: maxX = px; maxY = py; break; // TR
        case 3: maxX = px; break;            // R
        case 4: maxX = px; minY = py; break; // BR
        case 5: minY = py; break;            // B
        case 6: minX = px; minY = py; break; // BL
        case 7: minX = px; break;            // L
    }
    return boxCoords(Math.min(minX, maxX), Math.min(minY, maxY), Math.max(minX, maxX), Math.max(minY, maxY));
}

export function nearestHandle(origin: Coordinate[], point: Coordinate): number {
    let best = 0;
    let min = Infinity;
    for (let i = 0; i < 8 && i < origin.length; i++) {
        const d = Math.hypot(point[0] - origin[i][0], point[1] - origin[i][1]);
        if (d < min) { min = d; best = i; }
    }
    return best;
}

class BoxMark extends BaseMark {
    location: Coordinate[][];

    refresh(): LabelFormat {
        if (!this.feature) {
            return super.refresh();
        }

        this.location = (this.feature.getGeometry() as Polygon).getCoordinates();
        const e = extentOf(this.location[0].map(p => [Math.abs(p[0]), Math.abs(p[1])]));
        const width = e.maxX - e.minX;
        const height = e.maxY - e.minY;

        return {
            mark: this,
            coco: [e.minX, e.minY, width, height],  // x, y, w, h
            pascal_voc: [e.minX, e.minY, e.maxX, e.maxY],
            yolo: [e.minX + width / 2, e.minY + height / 2, width, height]
        }
    }

    fromFormat(format: LabelFormat): void {
        let minX: number, minY: number, maxX: number, maxY: number;
        if (format.coco && format.coco.length >= 4) {
            [minX, minY] = format.coco;
            maxX = format.coco[0] + format.coco[2];
            maxY = format.coco[1] + format.coco[3];
        } else if (format.pascal_voc) {
            [minX, minY, maxX, maxY] = format.pascal_voc;
        } else if (format.yolo) {
            const [cx, cy, w, h] = format.yolo;
            minX = cx - w / 2; maxX = cx + w / 2; minY = cy - h / 2; maxY = cy + h / 2;
        } else if (format.mark instanceof BoxMark) {
            this.location = format.mark.location as Coordinate[][];
            return;
        } else {
            return;
        }
        // 화면 좌표는 y가 음수
        this.location = boxCoords(minX, -maxY, maxX, -minY);
    }
}

class BoxDrawer extends BasicDrawer<BoxMark> {

    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): BoxMark {
        let parsed = this.loadSaveData(BoxMark, saveData);

        let geo = new Polygon(parsed.location);
        normalizeBox(geo);
        parsed.feature = new Feature(geo);
        parsed.feature.set(TOOL_MEMO, memo);
        parsed.feature.set(TOOL_TYPE, toolType);
        parsed.toolType = toolType;
        return parsed;
    }

    fromFeature(feature: Feature<Geometry>): BoxMark {
        let mark = new BoxMark();
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

        this.draw.on("drawend", function (event) {
            const geo = event.feature.getGeometry() as Polygon;
            normalizeBox(geo);
            fitBox(layer.getExtent(), geo);
        });

        return this.draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select: Select) {
        const defaultStyle = new Modify({ features: select.getFeatures() }).getOverlay().getStyleFunction();
        this.modify = new Modify({
            condition: function (event) {
                return primaryAction(event) && !platformModifierKeyOnly(event);
            },
            deleteCondition: never,
            insertVertexCondition: never,
            style: function (feature) {
                feature.get('features').forEach(function (modifyFeature: Feature) {
                    const modifyGeometry = modifyFeature.get('modifyGeometry');
                    if (modifyGeometry) {
                        const point = (feature.getGeometry() as Point).getCoordinates();
                        if (modifyGeometry.handle === undefined) {
                            modifyGeometry.handle = nearestHandle(modifyGeometry.origin, point);
                        }
                        const newGeometry = modifyGeometry.geometry.clone() as Polygon;
                        newGeometry.setCoordinates(resizeBox(modifyGeometry.origin, modifyGeometry.handle, point));
                        modifyGeometry.geometry = newGeometry;
                    }
                });

                return defaultStyle ? defaultStyle(feature, 0) : undefined;
            },
            features: select.getFeatures()
        });

        this.modify.on('modifystart', function (event) {
            event.features.forEach(function (feature) {
                if (feature instanceof Feature && feature.getGeometry() instanceof Polygon) {
                    let geometry = feature.getGeometry() as Polygon;
                    feature.set(
                        'modifyGeometry',
                        {
                            geometry: geometry.clone(),
                            origin: geometry.getCoordinates()[0].map(c => [...c]),
                            handle: undefined,
                            thumbFunc: () => { return geometry.getCoordinates(); }
                        },
                        true
                    );
                }
            });
        });

        this.modify.on('modifyend', function (event) {
            event.features.forEach(function (feature) {
                if (feature instanceof Feature) {
                    const modifyGeometry = feature.get('modifyGeometry');
                    if (modifyGeometry) {
                        feature.setGeometry(modifyGeometry.geometry);
                        feature.unset('modifyGeometry', true);

                        fitBox(layer.getExtent(), modifyGeometry.geometry as Polygon);
                    }
                }
            });
        });

        this.modify.setActive(false);
        return this.modify;
    }
}

export { BoxMark };
export default BoxDrawer;
