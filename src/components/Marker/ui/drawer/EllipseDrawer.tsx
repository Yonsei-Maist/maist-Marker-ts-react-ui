import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { Geometry, Circle, Polygon, Point, GeometryCollection, LineString, MultiPoint } from "ol/geom";
import { Draw, Select, Modify } from "ol/interaction";
import { TOOL_TYPE, TOOL_MEMO } from "../nevigator/ToolNavigator";
import BasicDrawer from "./BaseDrawer";
import { fromCircle } from 'ol/geom/Polygon'
import { getCenter } from "ol/extent";
import { Style } from "ol/style";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import VectorLayer from "ol/layer/Vector";
import { FeatureLike } from "ol/Feature";

import { Map} from "ol"

const isThumb = (coordinates: Coordinate[], point: Coordinate) => {
    for (let i in coordinates) {
        let coord = coordinates[i];
        if (coord[0] == point[0] && coord[1] == point[1]) {
            return true;
        }
    }

    return false;
}

const thumbFunc = (geometries: any) => {
    return () => [(geometries[0] as Point).getCoordinates(), (geometries[1] as Point).getCoordinates()];
}

const calculateEllipse = (first: Coordinate, last: Coordinate): Polygon => {
    var line = new LineString([first, last]);
    var center = getCenter(line.getExtent());

    var dx = center[0] - last[0];
    var dy = center[1] - last[1];
    const radius = Math.sqrt(dx * dx + dy * dy);
    const firstCircle = new Circle(center, radius);
    const circle = fromCircle(firstCircle, 128);
    circle.scale(dx/radius, dy/radius);

    return circle;
}

export function constrainEllipse(ellipse: GeometryCollection, extent: number[]) {
    const geometries = ellipse.getGeometries();
    const first = (geometries[0] as Point).getCoordinates();
    const last = (geometries[1] as Point).getCoordinates();
    const coords = [first, last]
    var dx = 0, dy = 0;

    coords.forEach(function (coord) {
        if (coord[0] < extent[0]) dx = Math.max(dx, extent[0] - coord[0]);
        if (coord[0] > extent[2]) dx = Math.min(dx, extent[2] - coord[0]);
        if (coord[1] < extent[1]) dy = Math.max(dy, extent[1] - coord[1]);
        if (coord[1] > extent[3]) dy = Math.min(dy, extent[3] - coord[1]);
    });

    var constrainedCoords = coords.map(function (coord) {
        return [coord[0] + dx, coord[1] + dy];
    });
    
    (geometries[0] as Point).setCoordinates(constrainedCoords[0]);
    (geometries[1] as Point).setCoordinates(constrainedCoords[1]);

    ellipse.setGeometries(geometries);
    ellipse.set("thumbFunc", thumbFunc(ellipse.getGeometries()), true);
}

class EllipseMark extends BaseMark {
    first: Coordinate;
    last: Coordinate;

    refresh(): LabelFormat {
        let feature = this.feature;
        if (this.feature) {
            let geo = feature.getGeometry() as GeometryCollection;
            let geos = geo.getGeometries();
            this.first = (geos[0] as Point).getCoordinates();
            this.last = (geos[1] as Point).getCoordinates();

            const xs = [this.first, this.last].map(point => point[0]);
            const ys = [this.first, this.last].map(point => point[1]);
    
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
    
            const width = maxX - minX;
    
            // If y coordinates are negative, adjust to positive
            const adjustedMinY = Math.abs(minY);
            const adjustedMaxY = Math.abs(maxY);
    
            const adjustedHeight = adjustedMaxY - adjustedMinY;

            return {
                mark: this,
                coco: [minX, adjustedMinY, width, adjustedHeight],  // x, y, w, h
                pascal_voc: [minX, minY, maxX, maxY]
            };
        }

        return super.refresh();
    }
}

class EllipseDrawer extends BasicDrawer<EllipseMark> {
    createMark(saveData: string, toolType: string, memo?: string): EllipseMark {
        let mark = this.loadSaveData(EllipseMark, saveData);
        let first = mark.first;
        let last = mark.last;

        const circle = calculateEllipse(first, last);
        let geo = new GeometryCollection([
            new Point(first),
            new Point(last),
            new Polygon(circle.getCoordinates())
        ]);

        geo.set("thumbFunc", thumbFunc(geo.getGeometries()), true);

        mark.feature = new Feature(geo);
        mark.toolType = toolType;
        mark.feature.set(TOOL_MEMO, memo);
        mark.feature.set(TOOL_TYPE, toolType);

        return mark;
    }

    fromFeature(feature: Feature<Geometry>): EllipseMark {
        let mark = new EllipseMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.toolType = feature.get(TOOL_TYPE);
        mark.refresh();

        return mark;
    }

    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            freehand: false,
            type: "Circle",
            freehandCondition: this.condition,
            geometryFunction: function (coordinates: Coordinate[], geometry?, projection?) {
                let geometryCollection: any = geometry;
                
                if (!geometryCollection) {
                    geometryCollection = new GeometryCollection([
                        new Point([]),
                        new Point([]),
                        new Polygon([])
                    ]);
                }

                const geometries = geometryCollection.getGeometries();
                var first = coordinates[0];
                var last = coordinates[1];

                const circle = calculateEllipse(first, last);
                (geometries[0] as Point).setCoordinates(first);
                (geometries[1] as Point).setCoordinates(last);
                (geometries[2] as Polygon).setCoordinates(circle.getCoordinates());
                geometryCollection.setGeometries(geometries);

                geometryCollection.set("thumbFunc", thumbFunc(geometryCollection.getGeometries()), true);
                return geometryCollection;
            }
        });

        this.draw.on('drawend', function(event) {
            const feature = event.feature;

            if (feature instanceof Feature && feature.getGeometry() instanceof GeometryCollection) {
                const geometry = feature.getGeometry() as GeometryCollection;
                const geometries = geometry.getGeometries();
                geometry.setGeometries([geometries[0], geometries[1]]);
            }
        });

        return this.draw;
    }
    
    createModify(layer: VectorLayer<Feature<Geometry>>, select:Select) {
        const defaultStyle = new Modify({features:select.getFeatures()}).getOverlay().getStyleFunction();
        this.modify = new Modify({
            condition: function (event) {
                return primaryAction(event) && !platformModifierKeyOnly(event);
            },
            hitDetection: true,
            deleteCondition: never,
            insertVertexCondition: never,
            style: (feature) => {
                feature.get('features').forEach((modifyFeature: Feature) => {
                    const modifyGeometry = modifyFeature.get('modifyGeometry');
                    if (modifyGeometry) {
                        const geometry = feature.getGeometry() as Point;
                        const modifyPoint = geometry.getCoordinates();
                        const modifyGeo = modifyGeometry.geometry as GeometryCollection;
                        const geometries = modifyGeo.getGeometries();
                        const first = (geometries[0] as Point).getCoordinates();
                        const last = (geometries[1] as Point).getCoordinates();
                        const multiPoint = new MultiPoint([first, last])

                        const closest = multiPoint.getClosestPoint(modifyPoint);
                        if (isThumb([first, last], closest)) {
                            let newFirst, newLast;
                            if (first[0] == closest[0] && first[1] == closest[1]) {
                                newFirst = last;
                            } else {
                                newFirst = first;
                            }

                            newLast = modifyPoint;

                            (geometries[0] as Point).setCoordinates(newFirst);
                            (geometries[1] as Point).setCoordinates(newLast);
                            //modifyGeo.set("thumbFunc", () => {return [newFirst, newLast];}, true);
                            modifyGeo.set("thumbFunc", thumbFunc(modifyGeo.getGeometries()), true);
                        }

                        modifyGeo.setGeometries(geometries);
                        modifyGeometry.geometry = modifyGeo;
                    }
                });
                return defaultStyle(feature, 0);
            },
            features: select.getFeatures()
        });

        this.modify.on('modifystart', function (event) {
            event.features.forEach(function (feature) {
                if (feature instanceof Feature && feature.getGeometry() instanceof GeometryCollection) {
                    const geometry = feature.getGeometry() as GeometryCollection;
                    feature.set('modifyGeometry', {
                        geometry: geometry.clone()
                    }, true);
                }
            });
        });

        this.modify.on('modifyend', function (event) {
            event.features.forEach(function (feature) {
                if (feature instanceof Feature && feature.getGeometry() instanceof GeometryCollection) {
                    const modifyGeometry = feature.get('modifyGeometry');
                    if (modifyGeometry) {
                        feature.setGeometry(modifyGeometry.geometry);
                        feature.unset('modifyGeometry', true);
                    }
                }
            });
        });
        this.modify.setActive(false);
        return this.modify;
    }
    
    getVectorStyle(feature?: FeatureLike): Style | Style[] {
        const style = super.getVectorStyle(feature) as Style;
        const collection = feature.getGeometry() as GeometryCollection;
        const first = (collection.getGeometries()[0] as Point).getCoordinates();
        const last = (collection.getGeometries()[1] as Point).getCoordinates();
        const polygon = calculateEllipse(first, last);
        style.setGeometry(polygon);

        return style;
    }

    getSelectBodyStyle(feature: Feature): Style {
        const style = super.getSelectBodyStyle(feature);
        const collection = feature.getGeometry() as GeometryCollection;
        const first = (collection.getGeometries()[0] as Point).getCoordinates();
        const last = (collection.getGeometries()[1] as Point).getCoordinates();
        const polygon = calculateEllipse(first, last);
        style.setGeometry(polygon);
        return style;
    }
}

export default EllipseDrawer;