import { Geometry, Point, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import BasicDrawer from "./BaseDrawer";
import { createBox } from 'ol/interaction/Draw';
import { never, platformModifierKeyOnly, primaryAction } from "ol/events/condition";
import { Feature } from "ol";
import { TOOL_MEMO, TOOL_TYPE } from "@/constants/tag";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import { Coordinate } from "ol/coordinate";
import VectorLayer from "ol/layer/Vector";

function fitBox(extent: number[], geometry: Polygon) {

    var coords = geometry.getCoordinates()[0];

    var adjustedCoords = coords.map(function (coord) {
        var x = Math.max(extent[0], Math.min(coord[0], extent[2]));
        var y = Math.max(extent[1], Math.min(coord[1], extent[3]));
        return [x, y];
    });

    geometry.setCoordinates([adjustedCoords]);
}

export function calculateCenter(geometry: Polygon, point: number[]): any {
    let coordinates = geometry.getCoordinates()[0];
    let newCoord = [] as any;
    let closest = [] as any;
    let min = 100000000;
    coordinates.forEach(function (coordinate) {
        let distance = Math.sqrt(Math.pow((point[0] - coordinate[0]), 2) + Math.pow((point[1] - coordinate[1]), 2));
        if (distance == Math.min(distance, min)) {
            min = distance;
            closest = coordinate;
        }
    });

    coordinates.forEach(function (coordinate) {
        let x, y;
        if (coordinate[0] == closest[0] || coordinate[0] == point[0])
            x = point[0];
        else
            x = coordinate[0];

        if (coordinate[1] == closest[1] || coordinate[1] == point[1])
            y = point[1];
        else
            y = coordinate[1];

        newCoord.push([x, y]);
    });

    return newCoord;
}

class BoxMark extends BaseMark {
    location: Coordinate[][];

    refresh(): LabelFormat {
        if (!this.feature) {
            return super.refresh();
        }

        this.location = (this.feature.getGeometry() as Polygon).getCoordinates();
        let location_one = this.location[0];
        const xs = location_one.map(point => Math.abs(point[0]));
        const ys = location_one.map(point => Math.abs(point[1]));

        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;

        return {
            mark: this,
            coco: [minX, minY, width, height],  // x, y, w, h
            pascal_voc: [minX, minY, maxX, maxY],
            yolo: [centerX, centerY, width, height]
        }
    }

    fromFormat(format: LabelFormat): void {
        if (format.coco) {
            const minX = format.coco[0];
            const minY = format.coco[1];
            const maxX = format.coco[0] + format.coco[2];
            const maxY = format.coco[1] + format.coco[3];

            this.location = [[
                [minX, -minY],
                [maxX, -minY],
                [maxX, -maxY],
                [minX, -maxY],
                [minX, -minY]
            ]];
        } else if (format.pascal_voc) {
            const minX = format.coco[0];
            const minY = format.coco[1];
            const maxX = format.coco[2];
            const maxY = format.coco[3];

            this.location = [[
                [minX, -minY],
                [maxX, -minY],
                [maxX, -maxY],
                [minX, -maxY],
                [minX, -minY]
            ]];
        } else if (format.yolo) {
            // yolo format: [centerX, centerY, width, height]
            const centerX = format.yolo[0];
            const centerY = format.yolo[1];
            const width = format.yolo[2];
            const height = format.yolo[3];
            const minX = centerX - width / 2;
            const maxX = centerX + width / 2;
            const minY = centerY - height / 2;
            const maxY = centerY + height / 2;
            this.location = [[
                [minX, -minY],
                [maxX, -minY],
                [maxX, -maxY],
                [minX, -maxY],
                [minX, -minY]
            ]];
        } else if ("location" in format.mark) {
            // 이미 mark에 location이 포함된 경우 이를 사용
            this.location = format.mark.location as Coordinate[][];
        }
    }
}

class BoxDrawer extends BasicDrawer<BoxMark> {

    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): BoxMark {
        let parsed = this.loadSaveData(BoxMark, saveData);

        let geo = new Polygon(parsed.location);
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
            fitBox(layer.getExtent(), event.feature.getGeometry() as Polygon);
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
                        const geometry = feature.getGeometry() as Point;
                        const point = geometry.getCoordinates();
                        let coordinates = calculateCenter(modifyGeometry.geometry, point);

                        const newGeometry = modifyGeometry.geometry.clone() as Polygon;
                        newGeometry.setCoordinates([coordinates]);
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
                        { geometry: geometry.clone(), thumbFunc: () => { return geometry.getCoordinates(); } },
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

export default BoxDrawer;