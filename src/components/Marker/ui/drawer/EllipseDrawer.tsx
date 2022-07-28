import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { primaryAction, platformModifierKeyOnly, always, never, mouseOnly, shiftKeyOnly } from "ol/events/condition";
import { Geometry, Circle, Polygon, Point, GeometryCollection, SimpleGeometry, LineString, MultiPoint } from "ol/geom";
import { Draw, Select, Modify } from "ol/interaction";
import { Vector } from "ol/source";
import { TOOL_TYPE, Tools, TOOL_MEMO } from "../ToolNavigator";
import BasicDrawer from "./BaseDrawer";
import { circular, fromCircle } from 'ol/geom/Polygon'
import { calculateCenter } from "./BoxDrawer";
import { transform } from "ol/proj";
import { getDistance } from "ol/sphere";
import { getCenter } from "ol/extent";
import { Style } from "ol/style";
import BaseMark from "../mark/BaseMark";

const isThumb = (coordinates: Coordinate[], point: Coordinate) => {
    for (let i in coordinates) {
        let coord = coordinates[i];
        if (coord[0] == point[0] && coord[1] == point[1]) {
            return true;
        }
    }

    return false;
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

class EllipseMark extends BaseMark {
    first: Coordinate;
    last: Coordinate;
}

class EllipseDrawer extends BasicDrawer<EllipseMark> {
    createMark(saveData: string, memo?: string): EllipseMark {
        let parsed = this.loadSaveData(saveData);
        var first = parsed.first;
        var last = parsed.last;

        const circle = calculateEllipse(first, last);
        let geo = new GeometryCollection([
            new Point(first),
            new Point(last),
            new Polygon(circle.getCoordinates())
        ]);

        parsed.feature = new Feature(geo);
        parsed.toolType = Tools.Ellipse;
        parsed.feature.set(TOOL_MEMO, memo);
        parsed.feature.set(TOOL_TYPE, Tools.Ellipse);

        return parsed;
    }

    fromFeature(feature: Feature<Geometry>): EllipseMark {
        let mark = new EllipseMark();
        let geo = feature.getGeometry() as GeometryCollection;
        let geos = geo.getGeometries();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.first = (geos[0] as Point).getCoordinates();
        mark.last = (geos[1] as Point).getCoordinates();
        mark.toolType = feature.get(TOOL_TYPE);

        return mark;
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
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

                geometryCollection.set("thumbFunc", () => {
                    let geometries = geometryCollection.getGeometries();
                    return [(geometries[0] as Point).getCoordinates(), (geometries[1] as Point).getCoordinates()];
                }, true);
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
    
    createModify(select:Select) {
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
                            const circle = calculateEllipse(newFirst, newLast);

                            (geometries[0] as Point).setCoordinates(newFirst);
                            (geometries[1] as Point).setCoordinates(newLast);
                            //modifyGeo.set("thumbFunc", () => {return [newFirst, newLast];}, true);
                            modifyGeo.set("thumbFunc", () => {
                                let geometries = modifyGeo.getGeometries();
                                return [(geometries[0] as Point).getCoordinates(), (geometries[1] as Point).getCoordinates()];
                            }, true);
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
    
    getVectorStyle(feature?: any, customFunc?: any): Style | Style[] {
        const style = super.getVectorStyle() as Style;
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