import { Feature } from "ol";
import { LabelInformation } from "../../context";
import { Tools } from "../nevigator/ToolNavigator";

export interface LabelFormat {
    mark: BaseMark;
    coco: number[];
    pascal_voc?: number[];
}

class BaseMark {
    memo: string;
    feature: Feature;
    toolType: Tools;
    label: LabelInformation;
    id: string;

    refresh(): LabelFormat {
        return {} as LabelFormat;
    }

    static fillFromJSON<T extends BaseMark>(markType: new() => T, json: string) {
        let jsonObj = JSON.parse(json);
        let mark = new markType();
        for (var propName in jsonObj) {
            mark[propName] = jsonObj[propName]
        }

        return mark;
    }
}

export default BaseMark;