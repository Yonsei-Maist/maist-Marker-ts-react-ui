import React from "react";
// import Marker from "./Marker";

import { Marker } from ".."
import { Tools } from "../components/marker/ui/ToolNavigator";

export default {
    title: "Marker",
    component: Marker,
};

const url = "https://maist.yonsei.ac.kr/example/I0.dcm"; //"https://maist.yonsei.ac.kr/example/faae04da-8627-4ae8-823e-fe3f002c8e93.dzi"

export const Dzi = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href="https://openseadragon.github.io">Image from OpenSeadragon</a></div>
    <Marker dziUrl={"https://openseadragon.github.io/example-images/highsmith/highsmith.dzi"}></Marker>
</div>;

export const Image = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href="https://www.nasa.gov/">Image from NASA</a></div>
    <Marker dziUrl={"https://maist.yonsei.ac.kr/example/stephans_quintet.jpeg"}></Marker>
</div>;

export const Dicom = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker dziUrl={url} withCredentials={false}></Marker>
</div>;

export const LabelName = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker labelNameList={[
        {toolType: Tools.Ellipse, labelNameList: ["CustomEllipse1", "CustomEllipse2"]},
        {toolType: Tools.Box, labelNameList: ["CustomBox1", "CustomBox2"]}
    ]} dziUrl={url} toolTypes={["Ellipse" as Tools, "Box" as Tools]}></Marker>
</div>;

export const ToolPolygonOnly = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker toolTypes={["Polygon" as Tools]} dziUrl={url}></Marker>
</div>;

export const ToolLengthOnly = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker toolTypes={["Length" as Tools]} dziUrl={url}></Marker>
</div>;

export const Load = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker labelInfo={[
    {
        data: "{\"first\":[482.4545926339285,-464.19788504464276],\"last\":[1190.1019587053572,-992.0064341517858]}",
        label: "Broken",
        toolType: "Ellipse" as Tools
    }
]} toolTypes={["Polygon" as Tools]} dziUrl={url}></Marker>
</div>;