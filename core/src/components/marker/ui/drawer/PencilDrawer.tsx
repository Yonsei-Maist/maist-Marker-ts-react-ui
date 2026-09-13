import { Feature } from "ol";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Select } from "ol/interaction";
import VectorLayer from "ol/layer/Vector";

import PolygonDrawer, { PolygonMark, clipPolygon } from "./PolygonDrawer";
import { TOOL_TYPE } from "@/constants/tag";
import { LabelFormat } from "../mark/BaseMark";

class PencilDrawer extends PolygonDrawer {

    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): PolygonMark {
        let mark = super.createMark(saveData, toolType, memo);
        mark.toolType = toolType;
        mark.feature.set(TOOL_TYPE, toolType);

        return mark;
    }

    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            type: "Polygon",
            condition: this.condition,
            freehand: true
        });

        this.draw.on('drawend', function(event) {
            clipPolygon(layer.getExtent(), event.feature.getGeometry() as Polygon);
        });

        return this.draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select:Select) {
        this.modify = super.createModify(layer, select);
        this.modify.setActive(false);
        return this.modify;
    }
}

export default PencilDrawer;
