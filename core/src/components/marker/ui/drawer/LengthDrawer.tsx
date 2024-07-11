import { Geometry, LineString } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";

import { Feature } from "ol";
import { primaryAction, platformModifierKeyOnly, never } from "ol/events/condition";
import { measureStyleFunciton } from "./Styler";
import { Style } from "ol/style";
import VectorLayer from "ol/layer/Vector";
import { FeatureLike } from "ol/Feature";

import BaseMark, { LabelFormat } from "../mark/BaseMark";
import { Coordinate } from "ol/coordinate";
import BaseDrawer from "./BaseDrawer";
import { TOOL_MEMO, TOOL_TYPE } from "../../../../constants/tag";

class LengthMark extends BaseMark {
    location: Coordinate[];

    refresh(): LabelFormat {
        let feature = this.feature;

        if (feature) {
            this.location = (feature.getGeometry() as LineString).getCoordinates();
            const flattenedPoints = this.location.reduce((acc, point) => acc.concat(point), []);

            // Adjust y coordinates if they are negative
            const adjustedPoints = flattenedPoints.map((value, index) => index % 2 !== 0 && value < 0 ? Math.abs(value) : value);

            return {
                mark: this,
                coco: adjustedPoints
            };
        }

        return super.refresh();
    }
}

class LengthDrawer extends BaseDrawer<LengthMark> {
    constructor(formatLength: (line: number) => string) {
        super();
        this.formatLength = formatLength
    }

    formatLength: (line:any) =>string;

    createMark(saveData: LabelFormat | string, toolType: string, memo?: string): LengthMark {
        let mark = this.loadSaveData(LengthMark, saveData);
        let geo = new LineString(mark.location);
        mark.feature = new Feature(geo);
        mark.toolType = toolType;
        mark.feature.set(TOOL_MEMO, memo);
        mark.feature.set(TOOL_TYPE, toolType);

        return mark;
    }

    fromFeature(feature: Feature<Geometry>): LengthMark {
        let mark = new LengthMark();
        mark.feature = feature;
        mark.feature.set(TOOL_TYPE, feature.get(TOOL_TYPE));
        mark.toolType = feature.get(TOOL_TYPE);

        mark.refresh();

        return mark;
    }

    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource(),
            type: "LineString",
            freehand: false,
            condition: this.condition,
            style: (feature) => {
                return measureStyleFunciton(feature, this.formatLength);
            }
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

    getVectorStyle(feature?: FeatureLike): Style | Style[] {
        return measureStyleFunciton(feature, this.formatLength);
    }
}

export default LengthDrawer;