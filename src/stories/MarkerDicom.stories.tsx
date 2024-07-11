import React, { } from "react";
// import Marker from "./Marker";

import { LabelMemoType, Marker, MarkerProps, PresetBox } from "@yonsei-maist/react-maist-marker";
import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";
import { DicomReader } from "@yonsei-maist/marker-dicom-addon";

interface MarkerContainerProps extends MarkerProps {
    reference: string;
    referenceUrl: string;
}

const MarkerContainer = (args: MarkerContainerProps) => <div style={{ height: "800px", width: "100%" }}>
    <div><a href={args.referenceUrl}>{args.reference}</a></div>
    <Marker {...args}>
        <PresetBox />
        <DicomReader />
    </Marker>
</div>;

const meta: Meta<typeof MarkerContainer> = {
    title: 'Markers Dicom Addon',
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
// export const Dzi: Story = {
//     args: {
//         referenceUrl: "https://openseadragon.github.io",
//         reference: "Image from OpenSeadragon",
//         fileUri: "https://openseadragon.github.io/example-images/highsmith/highsmith.dzi",
//     },
// };

const url = "https://dev-demo.connected-in.co.kr/example/I0.dcm";

export const Dicom: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        fileUri: url,
        options: { dcmWithCredentials: false, labelNameList: [], localSave: false }
    },
};

export const DicomSetWindow: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        fileUri: url,
        options: { dcmWithCredentials: false, labelNameList: [], savedMemo: "{\"ww\": 40, \"wc\": 40}", localSave: false }
    },
};

// export const PDF: Story = {
//     args: {
//         referenceUrl: "http://www.africau.edu/images/default/sample.pdf",
//         reference: "PDF from africau",
//         fileUri: "https://dev-demo.connected-in.co.kr/example/sample.pdf",
//     },
// };

export const LabelName: Story = {
    args: {
        referenceUrl: "https://medimodel.com/sample-dicom-files/human_skull_2_dicom_file/",
        reference: "Image from Medimodel",
        fileUri: url,
        options: {
            dcmWithCredentials: false,
            labelNameList: [
                "Normal",
                "Abnormal"
            ],
            labelMemoType: LabelMemoType.select,
            labelMemoOptions: ["발목", "오른쪽 엄지발가락"]
        }
    },
};