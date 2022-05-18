import { Geometry, LineString } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import BasicDrawer from "./BasicDrawer";

import { Feature } from "ol";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { measureStyleFunciton } from "./Styler";
import { Tools, TOOL_MEMO, TOOL_TYPE } from "../ToolNavigator";

class LengthDrawer extends BasicDrawer {
    formatLength: (line:any) =>string;

    createFeature(location: any[], memo?: string) {
        let geo = new LineString(location);
        let feature = new Feature(geo);
        feature.set(TOOL_TYPE, Tools.Length);
        feature.set(TOOL_MEMO, memo);

        return feature;
    }

    setFormatLength(formatLength: (length:number) =>string) {
        this.formatLength = formatLength
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
            type: "LineString",
            freehand: false,
            style: (feature) => {
                return measureStyleFunciton(feature, this.formatLength);
            }
        });

        return this.draw;
    }

    createModify(select:Select) {
        this.modify = new Modify({
            condition: function (event) {
                return primaryAction(event) && !platformModifierKeyOnly(event);
            },
            insertVertexCondition: never,
            features: select.getFeatures()
        });

        return this.modify;
    }
}

export default LengthDrawer;