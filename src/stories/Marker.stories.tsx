import React, { useEffect, useState } from "react";
// import Marker from "./Marker";

import { LabelMemoType, Marker, MarkerProps, PresetBox } from "../../core/src";
import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";

interface MarkerContainerProps extends MarkerProps {
    reference: string;
    referenceUrl: string;
}

const MarkerContainer = (args: MarkerContainerProps) => {

    return <div style={{ height: "800px", width: "100%" }}>

        <div><a href={args.referenceUrl}>{args.reference}</a></div>
        <Marker {...args}>
            <PresetBox/>
        </Marker>
    </div>
};

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

const args = {
    referenceUrl: "https://www.nasa.gov/",
    reference: "Image from NASA",
    fileUri: "https://dev-demo.connected-in.co.kr/example/stephans_quintet.jpeg",
}
export const Image: Story = {
    args: args,
};

export const LabelName: Story = {
    args: {
        ...args,
        saveHandler: (label) => console.log(label),
        options: {
            modifyOnly: true,
            fitPoint: false,
            withCredentials: false,
            labelNameList: [
                "나선은하",
                "타원형은하"
            ],
            labelMemoType: LabelMemoType.select,
            labelMemoOptions: ["1000000ly 이하", "1000000ly 이상"],
            savedLabelInfo: [
                [
                    {
                        label: "나선은하",
                        toolType: "Box",
                        data: {
                            coco: [25, 80, 160, 180]
                        }
                    }
                ]
            ],
        }
    },
};