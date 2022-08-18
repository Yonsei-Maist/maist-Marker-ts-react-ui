import React, { useEffect, useState } from "react";
// import Marker from "./Marker";

import { LabelInfo, Marker } from ".."
import { Tools } from "../components/marker/ui/ToolNavigator";
import "ol/ol.css";

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
    <Marker dziUrl={url} options={{ dcmWithCredentials: false, labelNameList: []}}></Marker>
</div>;

export const DicomSetWindow = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker dziUrl={url} options={{ dcmWithCredentials: false, labelNameList: [], savedMemo: "{\"ww\": 40, \"wc\": 40}" }}></Marker>
</div>;

export const PDF = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href="http://www.africau.edu/images/default/sample.pdf">PDF from africau</a></div>
    <Marker dziUrl={"https://maist.yonsei.ac.kr/example/sample.pdf"} options={{savedLabelInfo:[[]]}}></Marker>
</div>;

export const LabelName = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker
        options={{
            dcmWithCredentials: false,
            labelNameList: [
                { toolType: Tools.Ellipse, labelNameList: ["CustomEllipse1", "CustomEllipse2"] },
                { toolType: Tools.Box, labelNameList: ["CustomBox1", "CustomBox2"] }
            ],
            toolTypes: ["Ellipse" as Tools, "Box" as Tools]
        }} dziUrl={url}></Marker>
</div>;

export const ToolPolygonOnly = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker dziUrl={url} options={{ toolTypes: ["Polygon" as Tools] }}></Marker>
</div>;

export const ToolLengthOnly = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker dziUrl={url} options={{ toolTypes: ["Length" as Tools] }}></Marker>
</div>;

export const Load = () => {
    const [loadedLabelInfo, setLoadedLabelInfo] = useState([] as LabelInfo[][]);

    useEffect(() => {
        setTimeout(() => {
            setLoadedLabelInfo([
                [{
                    data: "{\"first\":[242760.73593477486,-294951.9929333207],\"last\":[464026.82356328866,-547805.6825006837]}",
                    label: "Broken",
                    toolType: "Ellipse" as Tools
                }]
            ])
        }, 1000);
    }, []);
    
    return <div style={{ height: "800px", width: "100%" }}>
    <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
    <Marker dziUrl={url} options={{
        savedLabelInfo: loadedLabelInfo,
        toolTypes: ["Polygon" as Tools],
        labelNameList: [{ toolType: Tools.Ellipse, labelNameList: ["Broken", "Fracture"] }]
    }}></Marker>
</div>};

export const LoadPdf = () => <div style={{ height: "800px", width: "100%" }}>
    <div><a href="http://www.africau.edu/images/default/sample.pdf">PDF from africau</a></div>
    <Marker dziUrl={"https://maist.yonsei.ac.kr/example/sample.pdf"} options={{
        savedLabelInfo: [
            [{
                data: "{\"location\":[[[77417.88912540296,-355556.6615353565],[229135.83564294223,-355556.6615353565],[229135.83564294223,-108493.07686059561],[77417.88912540296,-108493.07686059561],[77417.88912540296,-355556.6615353565]]]}",
                toolType: "Box" as Tools,
                label: "Broken"
            }],
            [{
                data: "{\"location\":[[[469386.97017178684,-290069.2375520318],[639803.3247335872,-290069.2375520318],[639803.3247335872,-156323.54731004464],[469386.97017178684,-156323.54731004464],[469386.97017178684,-290069.2375520318]]]}",
                toolType: "Box" as Tools,
                label: "Broken"}]],
        toolTypes: ["Polygon" as Tools],
        labelNameList: [{ toolType: Tools.Box, labelNameList: ["Broken", "Fracture"] }]
    }}></Marker>
</div>;