import { Feature } from "ol";
import { Geometry, Polygon } from "ol/geom";
import { Draw, Select } from "ol/interaction";
import { TOOL_TYPE } from "../nevigator/ToolNavigator";
import VectorLayer from "ol/layer/Vector";

import PolygonDrawer, { PolygonMark } from "./PolygonDrawer";
import { Extent } from "ol/extent";

class PencilDrawer extends PolygonDrawer {

    createMark(saveData: string, toolType: string, memo?: string): PolygonMark {
        let mark = super.createMark(saveData, memo);
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

function clipPolygon(arg0: Extent, arg1: Polygon) {
    throw new Error("Function not implemented.");
}
