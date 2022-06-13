import { Feature } from "ol";
import { LabelInformation } from "../../context";
import { Tools } from "../ToolNavigator";

class BaseMark {
    memo: string;
    feature: Feature;
    toolType: Tools;
    label: LabelInformation;
    id: string;
}

export default BaseMark;