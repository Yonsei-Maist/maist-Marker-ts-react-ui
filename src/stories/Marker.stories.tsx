import React, { useEffect, useState } from "react";
// import Marker from "./Marker";

import { LabelInfo, LabelMemoType, Marker, MarkerProps } from ".."
import { Tools } from "../components/marker/ui/ToolNavigator";
import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";

interface MarkerContainerProps extends MarkerProps {
    reference: string;
    referenceUrl: string;
}

const MarkerContainer = (args: MarkerContainerProps) => <div style={{ height: "800px", width: "100%" }}>
    <div><a href={args.referenceUrl}>{args.reference}</a></div>
    <Marker {...args}></Marker>
</div>;

const meta: Meta<typeof MarkerContainer> = {
    title: 'Markers',
    component: MarkerContainer,
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
    parameters: {
        // More on Story layout: https://storybook.js.org/docs/configure/story-layout
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof MarkerContainer>;
export const Dzi: Story = {
    args: {
        referenceUrl: "https://openseadragon.github.io",
        reference: "Image from OpenSeadragon",
        dziUrl: "https://openseadragon.github.io/example-images/highsmith/highsmith.dzi",
    },
};

export const Image: Story = {
    args: {
        referenceUrl: "https://www.nasa.gov/",
        reference: "Image from NASA",
        dziUrl: "https://dev-demo.connected-in.co.kr/example/stephans_quintet.jpeg",
    },
};

const url = "https://dev-demo.connected-in.co.kr/example/I0.dcm";

export const Dicom: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        dziUrl: url,
        options: { dcmWithCredentials: false, labelNameList: [], localSave: false }
    },
};

export const DicomSetWindow: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        dziUrl: url,
        options: { dcmWithCredentials: false, labelNameList: [], savedMemo: "{\"ww\": 40, \"wc\": 40}", localSave: false }
    },
};

export const PDF: Story = {
    args: {
        referenceUrl: "http://www.africau.edu/images/default/sample.pdf",
        reference: "PDF from africau",
        dziUrl: "https://dev-demo.connected-in.co.kr/example/sample.pdf",
    },
};

export const LabelName: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        dziUrl: url,
        options: {
            dcmWithCredentials: false,
            labelNameList: [
                "Normal",
                "Abnormal"
            ],
            toolTypes: ["Ellipse" as Tools, "Box" as Tools],
            labelMemoType: LabelMemoType.select,
            labelMemoOptions: ["발목", "오른쪽 엄지발가락"]
        }
    },
};

export const ToolPolygonOnly: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        dziUrl: url,
        options: { toolTypes: ["Polygon" as Tools] }
    },
};

export const ToolLengthOnly: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        dziUrl: url,
        options: { toolTypes: ["Length" as Tools] }
    },
};



// export const Load = () => {
//     const [loadedLabelInfo, setLoadedLabelInfo] = useState([] as LabelInfo[][]);

//     useEffect(() => {
//         setTimeout(() => {
//             setLoadedLabelInfo([
//                 [{
//                     data: "{\"first\":[242760.73593477486,-294951.9929333207],\"last\":[464026.82356328866,-547805.6825006837],\"memo\":\"MEMO\"}",
//                     label: "Broken",
//                     toolType: "Ellipse" as Tools
//                 }]
//             ])
//         }, 1000);
//     }, []);

//     return <div style={{ height: "800px", width: "100%" }}>
//         <div><a href='https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/'>Image from Medimodel</a></div>
//         <Marker dziUrl={url} options={{
//             savedLabelInfo: loadedLabelInfo,
//             toolTypes: ["Polygon" as Tools],
//             labelNameList: [{ toolType: Tools.Ellipse, labelNameList: ["Broken", "Fracture"] }]
//         }}></Marker>
//     </div>
// };

// export const LoadPdf = () => <div style={{ height: "800px", width: "100%" }}>
//     <div><a href="http://www.africau.edu/images/default/sample.pdf">PDF from africau</a></div>
//     <Marker dziUrl={"https://maist.yonsei.ac.kr/example/sample.pdf"} options={{
//         savedLabelInfo: [
//             [{
//                 data: "{\"location\":[[[77417.88912540296,-355556.6615353565],[229135.83564294223,-355556.6615353565],[229135.83564294223,-108493.07686059561],[77417.88912540296,-108493.07686059561],[77417.88912540296,-355556.6615353565]]]}",
//                 toolType: "Box" as Tools,
//                 label: "Broken"
//             }],
//             [{
//                 data: "{\"location\":[[[469386.97017178684,-290069.2375520318],[639803.3247335872,-290069.2375520318],[639803.3247335872,-156323.54731004464],[469386.97017178684,-156323.54731004464],[469386.97017178684,-290069.2375520318]]]}",
//                 toolType: "Box" as Tools,
//                 label: "Broken"
//             }]],
//         toolTypes: ["Polygon" as Tools],
//         labelNameList: [{ toolType: Tools.Box, labelNameList: ["Broken", "Fracture"] }]
//     }}></Marker>
// </div>;