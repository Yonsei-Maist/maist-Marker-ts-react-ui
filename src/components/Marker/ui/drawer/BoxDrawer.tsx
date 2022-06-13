import { Geometry, Point, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import BasicDrawer from "./BaseDrawer";
import { createBox } from 'ol/interaction/Draw';
import { never, platformModifierKeyOnly, primaryAction } from "ol/events/condition";
import { Feature } from "ol";
import { Tools, TOOL_MEMO, TOOL_TYPE } from "../ToolNavigator";
import BaseMark from "../mark/BaseMark";
import { Coordinate } from "ol/coordinate";

export function calculateCenter(geometry: Polygon, point: number[]): any {
    let coordinates = geometry.getCoordinates()[0];
    let newCoord = [] as any;
    let closest = [] as any;
    let min = 10000;
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
}

class BoxDrawer extends BasicDrawer<BoxMark> {

    createMark(saveData: string, memo?: string): BoxMark {
        let parsed = this.loadSaveData(saveData);

        let geo = new Polygon(parsed.location);
        parsed.feature = new Feature(geo);
        parsed.feature.set(TOOL_MEMO, memo);
        parsed.feature.set(TOOL_TYPE, Tools.Box);
        parsed.toolType = Tools.Box;
        return parsed;
    }

    fromFeature(feature: Feature<Geometry>): BoxMark {
        let mark = new BoxMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.location = (feature.getGeometry() as Polygon).getCoordinates();

        return mark;
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
            freehand: true,
            type: "Circle",
            geometryFunction: createBox()
        });

        return this.draw;
    }
    
    createModify(select:Select) {
        const defaultStyle = new Modify({features:select.getFeatures()}).getOverlay().getStyleFunction();
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
                        { geometry: geometry.clone(), thumbFunc: () => {return geometry.getCoordinates();}},
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
                    }
                }
            });
        });
        this.modify.setActive(false);
        return this.modify;
    }
}

export default BoxDrawer;