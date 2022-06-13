import { Geometry } from "ol/geom";
import { Draw } from "ol/interaction";
import { Vector } from "ol/source";
import BaseMark from "../mark/BaseMark";
import { ToolContext, Tools } from "../ToolNavigator";
import BasicDrawer from "./BaseDrawer";

class NoneDrawer extends BasicDrawer<BaseMark> {
    createDraw(source:Vector<Geometry>) {
        this.draw = new Draw({
            source: source,
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
            if (key != Tools.None)
                value.getModify().setActive(false);
        });
    }
}

export default NoneDrawer;