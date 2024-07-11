import { Feature } from "ol";
import { LabelInformation } from "../../context";

export interface LabelFormat {
    mark?: BaseMark;
    coco: number[];
    pascal_voc?: number[];
}

export interface LabelInfo {
    data: string | LabelFormat;
    toolType: string;
    label: string;
}

class BaseMark {
    memo: string;
    feature: Feature;
    toolType: string;
    label: LabelInformation;
    id: string;

    refresh(): LabelFormat {
        return {} as LabelFormat;
    }

    fromFormat(format: LabelFormat) {
        
    }

    static fillFromJSON<T extends BaseMark>(markType: new() => T, json: string) {
        let jsonObj: LabelFormat = JSON.parse(json);
        let mark = new markType();
        for (var propName in jsonObj.mark) {
            mark[propName] = jsonObj[propName]
        }

        return mark;
    }

    static fillFromLabelFormat<T extends BaseMark>(markType: new() => T, format: LabelFormat) {
        let mark = new markType();
        mark.fromFormat(format);
        return mark;
    }
}

export default BaseMark;