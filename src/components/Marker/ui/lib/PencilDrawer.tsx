import { Feature } from "ol";
import { primaryAction, platformModifierKeyOnly, always } from "ol/events/condition";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import { Tools, TOOL_TYPE } from "../ToolNavigator";
import BasicDrawer from "./BasicDrawer";

class PencilDrawer extends BasicDrawer {

    createFeature(location: any[], memo?: string) {
        let geo = new Polygon(location);
        let feature = new Feature(geo);
        feature.set(TOOL_TYPE, Tools.Pencil);
        return feature;
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