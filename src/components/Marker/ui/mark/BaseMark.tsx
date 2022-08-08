import { Feature } from "ol";
import { LabelInformation } from "../../context";
import { Tools } from "../ToolNavigator";

class BaseMark {
    memo: string;
    feature: Feature;
    toolType: Tools;
    label: LabelInformation;
    id: string;

    refresh() {
        
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