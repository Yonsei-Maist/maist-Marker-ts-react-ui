import { Feature } from "ol";
import { Geometry, SimpleGeometry } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector } from "ol/source";
import { ToolContext, Tools } from "../ToolNavigator";

class BasicDrawer {
    draw:Draw;
    modify:Modify;

    constructor() {
    }

    setDrawEvent() {

    }

    createFeature(location: any[], memo?: string) {
        return {} as Feature<SimpleGeometry>
    }

    createDraw(source:Vector<Geometry>) {
        return {} as Draw;
    }

    createModify(select:Select) {
        return {} as Modify;
    }

    getDraw() {
        return this.draw;
    }

    getModify() {
        return this.modify;
    }

    activeDraw(context: ToolContext) {
        context.drawerMap.forEach((value, key) => {
            if (value == this) {
                value.getDraw().setActive(true);
            } else {
                value.getDraw().setActive(false);
            }
        });
    }

    activeModify(context: ToolContext) {
        context.drawerMap.forEach((value, key) => {
            if (value == this) {
                value.getModify().setActive(true);
            } else {
                if (key != Tools.None)
                    value.getModify().setActive(false);
            }
        });
    }
}

export default BasicDrawer;