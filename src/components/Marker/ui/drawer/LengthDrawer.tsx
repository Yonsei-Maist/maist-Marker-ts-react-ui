import { Geometry, LineString } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import BasicDrawer from "./BaseDrawer";

import { Feature } from "ol";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { measureStyleFunciton } from "./Styler";
import { Tools, TOOL_MEMO, TOOL_TYPE } from "../ToolNavigator";
import { Style } from "ol/style";
import BaseMark from "../mark/BaseMark";
import { Coordinate } from "ol/coordinate";

class LengthMark extends BaseMark {
    location: Coordinate[];
}

class LengthDrawer extends BasicDrawer<LengthMark> {
    formatLength: (line:any) =>string;

    createMark(saveData: string, memo?: string): LengthMark {
        let parsed = this.loadSaveData(saveData);
        let geo = new LineString(parsed.location);
        parsed.feature = new Feature(geo);
        parsed.toolType = Tools.Length;
        parsed.feature.set(TOOL_MEMO, memo);
        parsed.feature.set(TOOL_TYPE, Tools.Length);

        return parsed;
    }

    fromFeature(feature: Feature<Geometry>): LengthMark {
        let mark = new LengthMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.location = (feature.getGeometry() as LineString).getCoordinates();
        mark.toolType = feature.get(TOOL_TYPE);

        return mark;
    }

    setFormatLength(formatLength: (length:number) =>string) {
        this.formatLength = formatLength
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
            type: "LineString",
            freehand: false,
            condition: this.condition,
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

    getVectorStyle(feature?: any, customFunc?: any): Style | Style[] {
        return measureStyleFunciton(feature, customFunc);
    }
}

export default LengthDrawer;