import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { primaryAction, platformModifierKeyOnly, always } from "ol/events/condition";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import BaseMark from "../mark/BaseMark";
import { Tools, TOOL_MEMO, TOOL_TYPE } from "../ToolNavigator";
import BaseDrawer from "./BaseDrawer";

class PolygonMark extends BaseMark {
    location: Coordinate[][];

    refresh() {
        let feature = this.feature;
        if (feature) {
            this.location = (feature.getGeometry() as Polygon).getCoordinates();
        }
    }
}

class PolygonDrawer extends BaseDrawer<PolygonMark> {

    createMark(saveData: string, memo?: string): PolygonMark {
        let parsed = this.loadSaveData(PolygonMark, saveData);
        let geo = new Polygon(parsed.location);
        parsed.feature = new Feature(geo);
        parsed.toolType = Tools.Polygon;
        parsed.feature.set(TOOL_MEMO, Tools.Polygon);
        parsed.feature.set(TOOL_TYPE, Tools.Polygon);

        return parsed;
    }

    fromFeature(feature: Feature<Geometry>): PolygonMark {
        let mark = new PolygonMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.toolType = feature.get(TOOL_TYPE);

        mark.refresh();

        return mark;
    }

    createFeature(location: any[], memo?: string) {
        let geo = new Polygon(location);
        let feature = new Feature(geo);

        feature.set(TOOL_TYPE, Tools.Polygon);

        return feature;
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
            type: "Polygon",
            condition: this.condition,
            freehand: false
        });

        return this.draw;
    }

    createModify(select:Select) {
        this.modify = new Modify({
            condition: function (event) {
                return primaryAction(event) && !platformModifierKeyOnly(event);
            },
            insertVertexCondition: always,
            features: select.getFeatures()
        });
        this.modify.setActive(false);
        return this.modify;
    }
}

export default PolygonDrawer;