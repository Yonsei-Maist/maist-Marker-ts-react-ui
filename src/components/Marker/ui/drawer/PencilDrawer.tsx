import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { primaryAction, platformModifierKeyOnly, always } from "ol/events/condition";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import BaseMark from "../mark/BaseMark";
import { Tools, TOOL_MEMO, TOOL_TYPE } from "../ToolNavigator";
import BasicDrawer from "./BaseDrawer";

class PencilMark extends BaseMark {
    location: Coordinate[][];
}

class PencilDrawer extends BasicDrawer<PencilMark> {

    createMark(saveData: string, memo?: string): PencilMark {
        let parsed = this.loadSaveData(saveData);
        let geo = new Polygon(parsed.location);
        parsed.feature = new Feature(geo);
        parsed.toolType = Tools.Pencil;
        parsed.feature.set(TOOL_MEMO, memo);
        parsed.feature.set(TOOL_TYPE, Tools.Pencil);

        return parsed;
    }

    fromFeature(feature: Feature<Geometry>): PencilMark {
        let mark = new PencilMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.location = (feature.getGeometry() as Polygon).getCoordinates();
        mark.toolType = feature.get(TOOL_TYPE);

        return mark;
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
            type: "Polygon",
            freehand: true
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

export default PencilDrawer;