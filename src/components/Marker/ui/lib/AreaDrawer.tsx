import { Feature } from "ol";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import { Tools, TOOL_MEMO, TOOL_TYPE } from "../ToolNavigator";
import BasicDrawer from "./BasicDrawer";
import { measureStyleFunciton } from "./Styler";

class AreaDrawer extends BasicDrawer {
    formatArea: (line:any) =>string

    setFormatArea(formatArea: (length:number) =>string) {
        this.formatArea = formatArea
    }

    createFeature(location: any[], memo?:string) {
        let geo = new Polygon(location);
        let feature = new Feature(geo);
        feature.set(TOOL_TYPE, Tools.Area);
        feature.set(TOOL_MEMO, memo);
        return feature;
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
            type: "Polygon",
            freehand: false,
            style: (feature) => {
                return measureStyleFunciton(feature, this.formatArea);
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

export default AreaDrawer;