import { PolygonDrawer } from "@yonsei-maist/react-maist-marker";
import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { Draw } from "ol/interaction";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

class MagicPicker extends PolygonDrawer {
    createDraw(layer:VectorLayer<Feature<Geometry>>) {
        this.draw = new Draw({
            source: layer.getSource() as VectorSource<Feature<Geometry>>,
            type: "Polygon",
            condition: this.condition,
            freehand: false
        });
        
        this.draw.on('drawend', function(event) {
            event.preventDefault();
        });
        
        this.draw.on('drawstart', function(event) {
            event.preventDefault();
        });

        return this.draw;
    }
}

export default MagicPicker;