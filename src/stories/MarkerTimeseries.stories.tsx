import React, { } from "react";
// import Marker from "./Marker";

import { Marker, MarkerProps } from "@yonsei-maist/react-maist-marker";
import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";
import { TimeseriesReader } from "../../addons/marker-timeseries-addon";

interface MarkerContainerProps extends MarkerProps {
    reference: string;
    referenceUrl: string;
}

const MarkerContainer = (args: MarkerContainerProps) => <div style={{ height: "800px", width: "100%" }}>
    <Marker {...args}>
        {/* <PresetBox /> */}
        <TimeseriesReader/>
    </Marker>
</div>;

const meta: Meta<typeof MarkerContainer> = {
    title: 'Markers Time series Addon',
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

export const PDF: Story = {
    args: {
        fileUri: "text.txt",
        fileBlob: new Blob(
            ["1,2,3,4,5,6,7,8,9,10,11,12,13,14,15"],
            { type: "text/plain" }
        )
    },
};// comma‑separated series data → Blob
