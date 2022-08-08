import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import { Style } from "ol/style";
import BaseMark from "../mark/BaseMark";
import { Tools, TOOL_MEMO, TOOL_TYPE } from "../ToolNavigator";
import BasicDrawer from "./BaseDrawer";
import { measureStyleFunciton } from "./Styler";

class AreaMark extends BaseMark {
    location: Coordinate[][];

    refresh() {
        let feature = this.feature;
        if (feature) {
            this.location = (feature.getGeometry() as Polygon).getCoordinates();
        }
    }
}

class AreaDrawer extends BasicDrawer<AreaMark> {
    formatArea: (line:any) =>string

    setFormatArea(formatArea: (length:number) =>string) {
        this.formatArea = formatArea
    }

    createMark(saveData: string, memo?: string): AreaMark {
        let parsed = this.loadSaveData(AreaMark, saveData);
        let geo = new Polygon(parsed.location);
        parsed.feature = new Feature(geo);
        parsed.feature.set(TOOL_MEMO, memo);
        parsed.feature.set(TOOL_TYPE, Tools.Area);
        parsed.toolType = Tools.Area;
        return parsed;
    }

    fromFeature(feature: Feature<Geometry>): AreaMark {
        let mark = new AreaMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.toolType = feature.get(TOOL_TYPE);

        mark.refresh();

        return mark;
    }

    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
            type: "Polygon",
            freehand: false,
            condition: this.condition,
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

    getVectorStyle(feature?: any, customFunc?: any): Style | Style[] {
        return measureStyleFunciton(feature, customFunc);
    }
}

export default AreaDrawer;