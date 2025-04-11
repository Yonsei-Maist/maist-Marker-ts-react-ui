import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { primaryAction, platformModifierKeyOnly, always, never } from "ol/events/condition";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import BaseDrawer from "./BaseDrawer";
import VectorLayer from "ol/layer/Vector";
import { TOOL_MEMO, TOOL_TYPE } from "@/constants/tag";

export function clipPolygon(extent: number[], polygon: Polygon) {
    const [xmin, ymin, xmax, ymax] = extent;

    function inside(p, edge) {
        switch (edge) {
            case 'left': return p[0] >= xmin;
            case 'right': return p[0] <= xmax;
            case 'bottom': return p[1] >= ymin;
            case 'top': return p[1] <= ymax;
        }
    }

    function intersection(p1, p2, edge) {
        const [x1, y1] = p1;
        const [x2, y2] = p2;
        let x, y;

        switch (edge) {
            case 'left':
                x = xmin;
                y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
                break;
            case 'right':
                x = xmax;
                y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
                break;
            case 'bottom':
                x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
                y = ymin;
                break;
            case 'top':
                x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
                y = ymax;
                break;
        }

        return [x, y];
    }

    function clip(subjectPolygon, edge) {
        const clippedPolygon = [];
        const n = subjectPolygon.length;

        for (let i = 0; i < n; i++) {
            const currentPoint = subjectPolygon[i];
            const prevPoint = subjectPolygon[(i + n - 1) % n];

            if (inside(currentPoint, edge)) {
                if (!inside(prevPoint, edge)) {
                    clippedPolygon.push(intersection(prevPoint, currentPoint, edge));
                }
                clippedPolygon.push(currentPoint);
            } else if (inside(prevPoint, edge)) {
                clippedPolygon.push(intersection(prevPoint, currentPoint, edge));
            }
        }

        return clippedPolygon;
    }

    let clippedPolygon = polygon.getCoordinates()[0];
    ['left', 'right', 'bottom', 'top'].forEach(edge => {
        clippedPolygon = clip(clippedPolygon, edge);
    });

    if (clippedPolygon.length > 0) {
        polygon.setCoordinates([clippedPolygon]);
    }
}

export class PolygonMark extends BaseMark {
    location: Coordinate[][];

    refresh(): LabelFormat {
        let feature = this.feature;
        if (feature) {
            this.location = (feature.getGeometry() as Polygon).getCoordinates();
            let location_one = this.location[0];
            const flattenedPoints = location_one.reduce((acc, point) => acc.concat(point), []);

            // Adjust y coordinates if they are negative
            const adjustedPoints = flattenedPoints.map((value, index) => index % 2 !== 0 && value < 0 ? Math.abs(value) : value);

            return {
                mark: this,
                coco: adjustedPoints
            };
        }

        return super.refresh();
    }

    fromFormat(format: LabelFormat): void {
        if (format.coco) {
            const originalPoints = format.coco.map((value, index) => index % 2 !== 0 ? -value : value);

            // Convert the flat array back to a nested array of points
            const points: Coordinate[] = [];
            for (let i = 0; i < originalPoints.length; i += 2) {
                points.push([originalPoints[i], originalPoints[i + 1]]);
            }

            this.location = [points];
        } else if ("location" in format.mark) {
            this.location = format.mark.location as Coordinate[][];
        }
    }
}

class PolygonDrawer extends BaseDrawer<PolygonMark> {

    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): PolygonMark {
        let mark = this.loadSaveData(PolygonMark, saveData);
        let geo = new Polygon(mark.location);
        mark.feature = new Feature(geo);
        mark.toolType = toolType;
        mark.feature.set(TOOL_MEMO, memo);
        mark.feature.set(TOOL_TYPE, toolType);

        return mark;
    }

    fromFeature(feature: Feature<Geometry>): PolygonMark {
        let mark = new PolygonMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.toolType = feature.get(TOOL_TYPE);

        mark.refresh();

        return mark;
    }

    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            type: "Polygon",
            condition: this.condition,
            freehand: false
        });
        
        this.draw.on('drawend', function(event) {
            clipPolygon(layer.getExtent(), event.feature.getGeometry() as Polygon);
        });

        return this.draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select:Select) {
        this.modify = new Modify({
            condition: function (event) {
                return primaryAction(event) && !platformModifierKeyOnly(event);
            },
            insertVertexCondition: select.getFeatures().getLength() == 1 ? always : never,
            features: select.getFeatures()
        });

        this.modify.on('modifystart', function(event) {
            event.features.forEach(function (feature) {
                if (feature instanceof Feature && feature.getGeometry() instanceof Polygon) {
                    let geometry = feature.getGeometry() as Polygon;
                    feature.set(
                        'modifyGeometry',
                        { geometry: geometry.clone() },
                        true
                    );
                }
            });
        })
        
        this.modify.on('modifyend', function(event) {
            event.features.forEach(function (feature) {
                if (feature instanceof Feature) {
                    const modifyGeometry = feature.get('modifyGeometry');
                    if (modifyGeometry) {
                        feature.setGeometry(modifyGeometry.geometry);
                        feature.unset('modifyGeometry', true);

                        clipPolygon(layer.getExtent(), feature.getGeometry() as Polygon);
                    }
                }
            });
        });

        this.modify.setActive(false);
        return this.modify;
    }
}

export default PolygonDrawer;