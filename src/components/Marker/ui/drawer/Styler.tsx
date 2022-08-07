import { Feature } from "ol";
import { LineString, Point, Polygon, SimpleGeometry } from "ol/geom";
import RenderFeature from "ol/render/Feature";
import { getArea, getLength } from "ol/sphere";
import { Style, Fill, Stroke, RegularShape, Text } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { TOOL_MEMO } from "../ToolNavigator";

export const style = new Style({
    fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
    }),
    stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
    }),
    image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
        }),
    }),
});

export const labelStyle = new Style({
    text: new Text({
        font: '14px Calibri,sans-serif',
        fill: new Fill({
            color: 'rgba(255, 255, 255, 1)',
        }),
        backgroundFill: new Fill({
            color: 'rgba(0, 0, 0, 0.7)',
        }),
        padding: [3, 3, 3, 3],
        textBaseline: 'bottom',
        offsetY: -15,
    }),
    image: new RegularShape({
        radius: 8,
        points: 3,
        angle: Math.PI,
        displacement: [0, 10],
        fill: new Fill({
            color: 'rgba(0, 0, 0, 0.7)',
        }),
    }),
});

export const modifyStyle = new Style({
    image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
            color: 'rgba(0, 0, 0, 0.4)',
        }),
    }),
    text: new Text({
        text: 'Drag to modify',
        font: '12px Calibri,sans-serif',
        fill: new Fill({
            color: 'rgba(255, 255, 255, 1)',
        }),
        backgroundFill: new Fill({
            color: 'rgba(0, 0, 0, 0.7)',
        }),
        padding: [2, 2, 2, 2],
        textAlign: 'left',
        offsetX: 15,
    }),
});

export function measureStyleFunciton(feature: RenderFeature | Feature, formatLabel: (measuredValue:number)=> string) {
    const styles = [style];
    const featureObj = feature as Feature<SimpleGeometry>;
    const geometry = feature.getGeometry() as LineString | Polygon;
    let point, label, line;
        
    let measuredValue = 0;
    let type = geometry.getType();
    if (type == "Polygon") {
        let geo = geometry as Polygon;
        point = geo.getInteriorPoint();
        line = new LineString(geometry.getCoordinates()[0]);
        measuredValue = getArea(geometry);

        featureObj.set(TOOL_MEMO, JSON.stringify({area: measuredValue}));
        label = formatLabel(measuredValue);
    } else if (type == "LineString") {
        measuredValue = getLength(geometry);
        point = new Point(geometry.getLastCoordinate());
        line = geometry;

        featureObj.set(TOOL_MEMO, JSON.stringify({length: measuredValue}));
        label = formatLabel(measuredValue);
    }

    if (label && point) {
        labelStyle.setGeometry(point);
        labelStyle.getText().setText(label);
        styles.push(labelStyle);
    }
    return styles;
}