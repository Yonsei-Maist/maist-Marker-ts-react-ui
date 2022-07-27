import { MapBrowserEvent } from "ol";
import { Coordinate } from "ol/coordinate";
import PointerInteraction from "ol/interaction/Pointer";
import ImageLayer from "ol/layer/Image";
import ImageCanvasSource from "ol/source/ImageCanvas";
import Static from "ol/source/ImageStatic";
import { DicomObject } from "../../../../lib/dicomReader";

export const DICOM_OBJECT = "DICOM_OBJECT";

class DicomRightMouseDrag extends PointerInteraction {
    public windowCenter: number;
    public windowWidth: number;
    private clicked: boolean;
    private coordinate: undefined | Coordinate;

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
            dicomObject.ww = this.windowWidth + (evt.coordinate[0] - this.coordinate[0]);
            dicomObject.wc = this.windowCenter + (evt.coordinate[1] - this.coordinate[1]);
            let layers = map.getLayers();
            if (dicomObject.ww < 0)
                dicomObject.ww = 0;
            
            for (let i in layers.getArray()) {
                let layerItem = layers.getArray()[i];

                // console.log(evt.coordinate, this.coordinate);

                if (layerItem instanceof ImageLayer) {
                    let vectorLayer = layerItem as ImageLayer<ImageCanvasSource>;
                    let source = vectorLayer.getSource();
                    // this.coordinate = evt.coordinate;
                    // source.refresh();
                    source.changed();
                    //dicomObject.retouch();
                    break;
                }
            }
        }

        return true;
    }
}

export default DicomRightMouseDrag;