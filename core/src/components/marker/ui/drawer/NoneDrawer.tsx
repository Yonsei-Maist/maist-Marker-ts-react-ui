import { Geometry } from "ol/geom";
import { Draw } from "ol/interaction";
import { Vector } from "ol/source";
import BaseMark from "../mark/BaseMark";
import { ToolContext } from "../nevigator/ToolNavigator";
import BasicDrawer from "./BaseDrawer";
import Feature from "ol/Feature";
import VectorLayer from "ol/layer/Vector";

class NoneDrawer extends BasicDrawer<BaseMark> {
    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            type: "LineString",
            freehand: false
        });
        this.draw.setActive(false);
        return this.draw;
    }

    activeDraw(context: ToolContext) {
        context.drawerMap.forEach((value, key) => {
            value.getDraw().setActive(false);
        });
    }

    activeModify(context: ToolContext) {
        context.drawerMap.forEach((value, key) => {
            if (key != "")
                value.getModify().setActive(false);
        });
    }
}

export default NoneDrawer;