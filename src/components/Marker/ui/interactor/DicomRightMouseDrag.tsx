import { MapBrowserEvent } from "ol";
import { Coordinate } from "ol/coordinate";
import PointerInteraction from "ol/interaction/Pointer";
import ImageLayer from "ol/layer/Image";
import ImageCanvasSource from "ol/source/ImageCanvas";
import Static from "ol/source/ImageStatic";

export const DICOM_OBJECT = "DICOM_OBJECT";

class DicomRightMouseDrag extends PointerInteraction {
    public windowCenter: number;
    public windowWidth: number;
    private clicked: boolean;
    private coordinate: undefined | Coordinate;

    handleUpEvent(evt: MapBrowserEvent<UIEvent>) {
        this.clicked = false;
        this.coordinate = undefined;
        return true;
    }

    handleDownEvent(evt: MapBrowserEvent<UIEvent>) {
        if (evt.originalEvent instanceof MouseEvent) {
            let event = evt.originalEvent as MouseEvent;

            if (event.button == 2) {
                evt.originalEvent.preventDefault();
                this.clicked = true;
                this.coordinate = evt.coordinate;
                console.log("bye");
                return true;
            }

            return false;
        } else {
            return false;
        }
    }

    handleDragEvent(evt: MapBrowserEvent<UIEvent>) {

        if (this.clicked && this.coordinate) {
            console.log("hi")
            const map = evt.map;
            const dicomObject = map.get(DICOM_OBJECT);
            dicomObject.ww = 500;
            dicomObject.wc = 500;
            let layers = map.getLayers();
            for (let i in layers.getArray()) {
                let layerItem = layers.getArray()[i];

                if (layerItem instanceof ImageLayer) {
                    let vectorLayer = layerItem as ImageLayer<Static>;
                    let source = vectorLayer.getSource();
                    source.refresh();
                }
            }
        }

        return true;
    }
}

export default DicomRightMouseDrag;