import { Feature } from "ol";
import { ClassInfo } from "../../context";
import { Coordinate } from "ol/coordinate";

export interface LabelFormat {
    mark?: BaseMark;
    coco: number[];
    pascal_voc?: number[];
    yolo?: number[];
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
    label: ClassInfo;
    id: string;

    refresh(): LabelFormat {
        return {} as LabelFormat;
    }

    fromFormat(format: LabelFormat) {
        
    }

    /**
     * createSaveData()가 만든 LabelFormat의 JSON 문자열에서 마크를 복원한다.
     * 직렬화된 mark 필드(location, first/last 등)를 우선 복사하고,
     * mark 필드가 없으면 좌표 포맷(coco 등)으로 복원한다.
     */
    static fillFromJSON<T extends BaseMark>(markType: new() => T, json: string) {
        let jsonObj: LabelFormat = JSON.parse(json);
        let mark = new markType();
        const saved = jsonObj.mark as unknown as Record<string, unknown> | undefined;
        if (saved && Object.keys(saved).length > 0) {
            for (const propName in saved) {
                (mark as unknown as Record<string, unknown>)[propName] = saved[propName];
            }
        } else {
            mark.fromFormat(jsonObj);
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