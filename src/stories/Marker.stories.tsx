import React from "react";
// import Marker from "./Marker";

import { Marker } from ".."
import { Tools } from "../components/marker/ui/ToolNavigator";

export default {
    title: "Marker",
    component: Marker,
};

const url = "http://localhost:8080/omarker/example/ser1005img01003.dzi"; //"https://maist.yonsei.ac.kr/example/faae04da-8627-4ae8-823e-fe3f002c8e93.dzi"

export const Default = () => <div style={{ height: "800px", width: "100%" }}>
    <Marker dziUrl={url}></Marker>
</div>;

export const LabelName = () => <div style={{ height: "800px", width: "100%" }}>
    <Marker labelNameList={[
        {toolType: Tools.Ellipse, labelNameList: ["CustomLabel1", "CustomLabel2"]},
        {toolType: Tools.Box, labelNameList: ["CustomLabel3", "CustomLabel4"]}
    ]} dziUrl={url}></Marker>
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
        data: "{\"first\":[482.4545926339285,-464.19788504464276],\"last\":[1190.1019587053572,-992.0064341517858]}",
        label: "Broken",
        toolType: "Ellipse" as Tools
    }
]} toolTypes={["Polygon" as Tools]} dziUrl={url}></Marker>
</div>;