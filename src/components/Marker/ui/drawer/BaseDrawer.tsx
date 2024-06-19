import { Feature, MapBrowserEvent } from "ol";
import { Geometry, MultiPoint, Polygon } from "ol/geom";
import { Draw, Modify, Select } from "ol/interaction";
import { Style, Fill, Stroke, Circle } from "ol/style";
import BaseMark, { LabelFormat } from "../mark/BaseMark";
import { MARK, ToolContext } from "../nevigator/ToolNavigator";
import VectorLayer from "ol/layer/Vector";
import { FeatureLike } from "ol/Feature";

import { Map} from "ol"
import { MAP_HEIGHT, MAP_WIDTH } from "../../../../api/SourceReader";
import { fitPoints } from "../../../../lib/sizeConverter";

class BasicDrawer<T extends BaseMark> {
    draw:Draw;
    modify:Modify;

    constructor() {
    }

    condition(e: MapBrowserEvent<UIEvent>) {
        let event = e.originalEvent as PointerEvent;
        return event.button == 0; // left only
    }

    setDrawEvent() {

    }

    /**
     * 
     * @param type 
     * @param saveData coco dataset format: x, y, x, y ...
     * @returns 
     */
    loadSaveData(type: new() => T, saveData: string) {
        return BaseMark.fillFromJSON<T>(type, saveData);
    }

    createMark(saveData: string, toolType: string, memo?: string) {
        return {} as T;
    }

    fromFeature(feature: Feature) {
        return {} as T;
    }

    createSaveData(map: Map, mark: BaseMark): LabelFormat {
        let savedData = mark.refresh();
        let saving = {...savedData.mark} as BaseMark;
        
        delete saving.feature;
        delete saving.id;
        delete saving.label;
        delete saving.toolType;

        savedData.mark = saving

        let width = map.get(MAP_WIDTH);
        let height = map.get(MAP_HEIGHT);

        savedData.coco = fitPoints(width, height, savedData.coco, true);
        savedData.pascal_voc = savedData.pascal_voc ? fitPoints(width, height, savedData.pascal_voc, true): savedData.pascal_voc;

        return savedData;
    }

    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        return {} as Draw;
    }

    createModify(layer: VectorLayer<Feature<Geometry>>, select:Select) {
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
                if (key != "")
                    value.getModify().setActive(false);
            }
        });
    }

    getVectorStyle(feature?: FeatureLike): Style | Style[] {
        let defaultColor = '#ff3333';
        if (feature) {

            let mark = feature.get(MARK) as BaseMark;
            if (mark.label && mark.label.color) {
                defaultColor = mark.label.color
            }
        }

        return new Style({
            //text: new Text({}),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.1)',
            }),
            stroke: new Stroke({
                color: defaultColor,
                width: 1,
            }),
            image: new Circle({
                radius: 7,
                fill: new Fill({
                    color: defaultColor,
                }),
            }),
        }); 
    }

    getSelectBodyStyle(feature: Feature): Style {
        let defaultColor = '#ff3333';
        if (feature) {

            let mark = feature.get(MARK) as BaseMark;
            if (mark.label && mark.label.color) {
                defaultColor = mark.label.color
            }
        }

        return new Style({
            geometry: function (feature) {
                const modifyGeometry = feature.get('modifyGeometry');
                return modifyGeometry ? modifyGeometry.geometry : feature.getGeometry();
            },
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.1)',
            }),
            stroke: new Stroke({
                color: defaultColor,
                lineDash: [10, 10],
                width: 1,
            }),
            image: new Circle({
                radius: 7,
                fill: new Fill({
                    color: defaultColor,
                }),
            }),
        });
    }

    getSelectThumbStyle(feature: Feature): Style | undefined {
        const modifyGeometry = feature.get('modifyGeometry');
        const modifyGeo = modifyGeometry ? modifyGeometry.geometry : feature.getGeometry();
        const thumb = modifyGeo.get("thumbFunc") || (modifyGeometry ? modifyGeometry.thumbFunc : undefined);
        let coordinates;
        if (thumb) {
            coordinates = thumb();
        } else {
            let geo = feature.getGeometry() as Polygon;
            if (geo instanceof Polygon)
                coordinates = geo.getCoordinates()[0];
        }
        
        if (coordinates) {
            return new Style({
                geometry: new MultiPoint(coordinates),
                image: new Circle({
                    radius: 4,
                    fill: new Fill({
                        color: '#33cc33',
                    }),
                }),
            })
        }

        return undefined;
    }

    getSelectStyle(feature: Feature): Style[] {
        let result = [] as Style[];
        let bodyStyle = this.getSelectBodyStyle(feature);
        let thumbStyle = this.getSelectThumbStyle(feature);

        result.push(bodyStyle);
        if (thumbStyle)
            result.push(thumbStyle);

        return result;
    }
}

export default BasicDrawer;