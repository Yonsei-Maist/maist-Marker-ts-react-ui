import { Feature } from "ol";
import { Geometry, MultiPoint, Polygon, SimpleGeometry } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import { Style, Fill, Stroke, Circle } from "ol/style";
import { ToolContext, Tools } from "../ToolNavigator";

class BasicDrawer {
    draw:Draw;
    modify:Modify;

    constructor() {
    }

    setDrawEvent() {

    }

    createFeature(location: any[], memo?: string) {
        return {} as Feature<SimpleGeometry>
    }

    createDraw(source:Vector<Geometry>) {
        return {} as Draw;
    }

    createModify(select:Select) {
        return {} as Modify;
    }

    getDraw() {
        return this.draw;
    }

    getModify() {
        return this.modify;
    }

    activeDraw(context: ToolContext) {
        context.drawerMap.forEach((value, key) => {
            if (value == this) {
                value.getDraw().setActive(true);
            } else {
                value.getDraw().setActive(false);
            }
        });
    }

    activeModify(context: ToolContext) {
        context.drawerMap.forEach((value, key) => {
            if (value == this) {
                value.getModify().setActive(true);
            } else {
                if (key != Tools.None)
                    value.getModify().setActive(false);
            }
        });
    }

    getVectorStyle(feature?: any, customFunc?: any): Style | Style[] {
        return new Style({
            //text: new Text({}),
            fill: new Fill({
                color: 'rgba(255, 204, 51, 0.4)',
            }),
            stroke: new Stroke({
                color: '#ffcc33',
                width: 2,
            }),
            image: new Circle({
                radius: 7,
                fill: new Fill({
                    color: '#ffcc33',
                }),
            }),
        })
    }

    getSelectBodyStyle(feature: Feature): Style {
        return new Style({
            geometry: function (feature) {
                const modifyGeometry = feature.get('modifyGeometry');
                return modifyGeometry ? modifyGeometry.geometry : feature.getGeometry();
            },
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.4)',
            }),
            stroke: new Stroke({
                color: '#ffcc33',
                lineDash: [10, 10],
                width: 2,
            }),
            image: new Circle({
                radius: 7,
                fill: new Fill({
                    color: '#ffcc33',
                }),
            }),
        });
    }

    getSelectThumbStyle(feature: Feature): Style | undefined {
        const modifyGeometry = feature.get('modifyGeometry');
        const modifyGeo = modifyGeometry ? modifyGeometry.geometry : feature.getGeometry();
        const thumb = modifyGeo.get("thumbFunc") || (modifyGeometry ? modifyGeometry.thumbFunc : undefined);
        let coordinates;
        if (thumb) {
            coordinates = thumb();
        } else {
            let geo = feature.getGeometry() as Polygon;
            if (geo instanceof Polygon)
                coordinates = geo.getCoordinates()[0];
        }
        
        if (coordinates) {
            return new Style({
                geometry: new MultiPoint(coordinates),
                image: new Circle({
                    radius: 4,
                    fill: new Fill({
                        color: '#33cc33',
                    }),
                }),
            })
        }

        return undefined;
    }

    getSelectStyle(feature: Feature): Style[] {
        let result = [] as Style[];
        let bodyStyle = this.getSelectBodyStyle(feature);
        let thumbStyle = this.getSelectThumbStyle(feature);

        result.push(bodyStyle);
        if (thumbStyle)
            result.push(thumbStyle);

        return result;
    }
}

export default BasicDrawer;