import { Polygon } from "ol/geom";

export const MAP_SIZE = 1000000;

export function fitPoint(width: number, height: number, point: number[], to_ratio?: boolean) {
    if (point.length != 2) {
        throw new Error("Point must have size 2");
    }

    return to_ratio ? [point[0] / width, point[1] / height]: [point[0] * width, point[1] * height];
}

export function fitPoints(width: number, height: number, points: number[], to_ratio?: boolean) {
    if (points.length % 2 == 1) {
        throw new Error("Point must have even size");
    }

    return points.map((o, i) => {
        let factor = i % 2 == 0 ? width : height;
        return to_ratio ? o / factor : o * factor;
    });
}

export function fitSize(width: number, height: number) {
    let mapSize = [MAP_SIZE, MAP_SIZE];

    let newWidth = mapSize[0];
    let newHeight = mapSize[1] * height / width;

    return [newWidth, newHeight];
}

// def get_rect(location_rect, shape: Union[list, float]):
//     if isinstance(shape, int):
//         ratio = 1000000 / shape
//     else:
//         ratio = [1000000 / shape[0], 1000000 / shape[1]]
//     rect_location = np.array(location_rect['location'][0])

//     if isinstance(ratio, float):
//         rect_location = rect_location / ratio
//     else:
//         rect_location[:, 0] /= ratio[0]
//         rect_location[:, 1] /= ratio[1]
//     start_position = list(rect_location[3])
//     width = rect_location[1][0] - rect_location[0][0]
//     height = rect_location[3][1] - rect_location[0][1]

//     start_position[1] = -start_position[1]

//     return [int(start_position[0]), int(start_position[1])], abs(width), abs(height)


// def get_ellipse(location_ellipse, ratio):
//     first = np.array(location_ellipse["first"]) / ratio
//     last = np.array(location_ellipse["last"]) / ratio

//     max_xy = np.amax([first, last], axis=0)
//     min_xy = np.amin([first, last], axis=0)
//     start_position = [min_xy[0], max_xy[1]]
//     width = max_xy[0] - min_xy[0]
//     height = min_xy[1] - max_xy[1]

//     start_position[1] = -start_position[1]
// def get_polygon(location_polygon, ratio):
//     polygon_location = np.array(location_polygon['location'][0])

//     polygon_location = polygon_location / ratio

//     max_xy = np.amax(polygon_location, axis=0)
//     min_xy = np.amin(polygon_location, axis=0)
//     start_position = [min_xy[0], max_xy[1]]
//     width = max_xy[0] - min_xy[0]
//     height = min_xy[1] - max_xy[1]

//     start_position[1] = -start_position[1]

//     return [int(start_position[0]), int(start_position[1])], abs(width), abs(height)

export function fromXYXY(xyxy: number[]) {

}

export function toXYXY() {

}

export function constrainGeometry(geometry: Polygon, extent: number[]) {
    var coords = geometry.getCoordinates()[0];
    var dx = 0, dy = 0;

    coords.forEach(function (coord) {
        if (coord[0] < extent[0]) dx = Math.max(dx, extent[0] - coord[0]);
        if (coord[0] > extent[2]) dx = Math.min(dx, extent[2] - coord[0]);
        if (coord[1] < extent[1]) dy = Math.max(dy, extent[1] - coord[1]);
        if (coord[1] > extent[3]) dy = Math.min(dy, extent[3] - coord[1]);
    });

    var constrainedCoords = coords.map(function (coord) {
        return [coord[0] + dx, coord[1] + dy];
    });

    geometry.setCoordinates([constrainedCoords]);
}