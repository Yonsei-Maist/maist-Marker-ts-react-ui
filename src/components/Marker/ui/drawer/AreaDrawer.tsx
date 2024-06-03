import { Feature } from "ol";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Style } from "ol/style";
import { Tools, TOOL_TYPE } from "../nevigator/ToolNavigator";
import { measureStyleFunciton } from "./Styler";
import VectorLayer from "ol/layer/Vector";
import { FeatureLike } from "ol/Feature";

import PolygonDrawer, { PolygonMark, clipPolygon } from "./PolygonDrawer";

class AreaDrawer extends PolygonDrawer {
    formatArea: (line:any) =>string

    setFormatArea(formatArea: (length:number) =>string) {
        this.formatArea = formatArea
    }

    createMark(saveData: string, memo?: string): PolygonMark {
        let mark = super.createMark(saveData, memo);
        mark.feature.set(TOOL_TYPE, Tools.Area);
        mark.toolType = Tools.Area;
        return mark;
    }

    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            type: "Polygon",
            freehand: false,
            condition: this.condition,
            style: (feature) => {
                return measureStyleFunciton(feature, this.formatArea);
            }
        });
        
        this.draw.on('drawend', function(event) {
            clipPolygon(layer.getExtent(), event.feature.getGeometry() as Polygon);
        });

        return this.draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select:Select) {
        this.modify = new Modify({
            condition: function (event) {
                return primaryAction(event) && !platformModifierKeyOnly(event);
            },
            insertVertexCondition: never,
            features: select.getFeatures()
        });

        return this.modify;
    }

    getVectorStyle(feature?: FeatureLike, customFunc?: any): Style | Style[] {
        return measureStyleFunciton(feature, customFunc);
    }
}

export default AreaDrawer;