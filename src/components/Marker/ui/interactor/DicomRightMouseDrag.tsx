import { MapBrowserEvent } from "ol";
import { Coordinate } from "ol/coordinate";
import PointerInteraction from "ol/interaction/Pointer";
import ImageSource from "ol/source/Image";
import Static from "ol/source/ImageStatic";
import { DicomObject } from "../../../../lib/dicomReader";

export const DICOM_OBJECT = "DICOM_OBJECT";

class DicomRightMouseDrag extends PointerInteraction {
    public windowCenter: number;
    public windowWidth: number;
    private clicked: boolean;
    private coordinate: undefined | Coordinate;
    private source: ImageSource;

    constructor(source: ImageSource) {
        super();

        this.source = source;
    }

    handleUpEvent(evt: MapBrowserEvent<UIEvent>) {
        const map = evt.map;
        const dicomObject = map.get(DICOM_OBJECT);
        this.clicked = false;
        this.coordinate = undefined;
        this.windowCenter = dicomObject.wc;
        this.windowWidth = dicomObject.ww;
        return true;
    }

    handleDownEvent(evt: MapBrowserEvent<UIEvent>) {
        if (evt.originalEvent instanceof MouseEvent) {
            let event = evt.originalEvent as MouseEvent;

            if (event.button == 2) {
                evt.originalEvent.preventDefault();
                const map = evt.map;
                const dicomObject = map.get(DICOM_OBJECT);
                this.clicked = true;
                this.coordinate = evt.coordinate;

                this.windowCenter = dicomObject.wc;
                this.windowWidth = dicomObject.ww;
                return true;
            }

            return false;
        } else {
            return false;
        }
    }

    handleDragEvent(evt: MapBrowserEvent<UIEvent>) {

        if (this.clicked && this.coordinate) {
            const map = evt.map;
            const dicomObject = map.get(DICOM_OBJECT) as DicomObject;
            dicomObject.ww = this.windowWidth + (evt.coordinate[0] - this.coordinate[0])  / 1000// dicomObject.width;
            dicomObject.wc = this.windowCenter + (evt.coordinate[1] - this.coordinate[1]) / 1000// dicomObject.height;
            if (dicomObject.ww < 0)
                dicomObject.ww = 0;
            
            this.source.setAttributions(['ww: ' + dicomObject.ww.toFixed(5), ' wc: ' + dicomObject.wc.toFixed(5)]);
            this.source.changed();
        }

        return true;
    }
}

export default DicomRightMouseDrag;