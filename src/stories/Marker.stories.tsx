import React from "react";
// import Marker from "./Marker";

import { Marker } from ".."
import { Tools } from "../components/marker/ui/ToolNavigator";

export default {
    title: "Marker",
    component: Marker,
};

const url = "https://maist.yonsei.ac.kr/example/faae04da-8627-4ae8-823e-fe3f002c8e93.dzi"

export const Default = () => <div style={{ height: "800px", width: "100%" }}>
    <Marker dziUrl={url}></Marker>
</div>;

export const LabelName = () => <div style={{ height: "800px", width: "100%" }}>
    <Marker labelNameList={["CustomLabel1", "CustomLabel2"]} dziUrl={url}></Marker>
</div>;

export const ToolPolygonOnly = () => <div style={{ height: "800px", width: "100%" }}>
    <Marker toolTypes={["Polygon" as Tools]} dziUrl={url}></Marker>
</div>;

export const ToolLengthOnly = () => <div style={{ height: "800px", width: "100%" }}>
    <Marker toolTypes={["Length" as Tools]} dziUrl={url}></Marker>
</div>;

export const Load = () => <div style={{ height: "800px", width: "100%" }}>
    <Marker labelInfo={[
        {
            "location": [
                [
                    [
                        895.2450166112958,
                        -570.3955564784054
                    ],
                    [
                        2047.0047757475086,
                        -282.94227574750835
                    ],
                    [
                        2307.5166112956813,
                        -802.1490863787377
                    ],
                    [
                        1753.3482142857144,
                        -1253.171719269103
                    ],
                    [
                        895.2450166112958,
                        -570.3955564784054
                    ]
                ]
            ],
            "memo": "{\"area\":717535.1764285503}",
            "name": "DefaultLabel1",
            "toolType": "Area"
        },
        {
            "location": [
                [
                    1815.9779900332228,
                    -1620.5149501661135
                ],
                [
                    2688.304609634552,
                    -2123.4997923588044
                ]
            ],
            "memo": "{\"length\":1005.8241834339357}",
            "name": "DefaultLabel1",
            "toolType": "Length"
        },
        {
            "location": [
                [
                    [
                        999.9888685940219,
                        -2935.5447894370636
                    ],
                    [
                        1329.036975298028,
                        -2935.5447894370636
                    ],
                    [
                        1329.036975298028,
                        -2310.843439390184
                    ],
                    [
                        999.9888685940219,
                        -2310.843439390184
                    ],
                    [
                        999.9888685940219,
                        -2935.5447894370636
                    ]
                ]
            ],
            "name": "DefaultLabel1",
            "toolType": "Box"
        },
        {
            "location": [
                [
                    [
                        1818.091740550383,
                        -2477.2831532605014
                    ],
                    [
                        2475.920652490723,
                        -2356.070847720255
                    ],
                    [
                        2789.946416711573,
                        -2774.290724039579
                    ],
                    [
                        2078.2295288885944,
                        -3061.8180027652297
                    ],
                    [
                        1818.091740550383,
                        -2477.2831532605014
                    ]
                ]
            ],
            "name": "DefaultLabel1",
            "toolType": "Polygon"
        }
    ]} toolTypes={["Polygon" as Tools]} dziUrl={url}></Marker>
</div>;