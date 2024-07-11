import React, { } from "react";
// import Marker from "./Marker";

import { LabelMemoType, Marker, MarkerProps, PresetBox } from "@yonsei-maist/react-maist-marker";
import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";
import { PdfReader } from "@yonsei-maist/marker-pdf-addon";

interface MarkerContainerProps extends MarkerProps {
    reference: string;
    referenceUrl: string;
}

const MarkerContainer = (args: MarkerContainerProps) => <div style={{ height: "800px", width: "100%" }}>
    <div><a href={args.referenceUrl}>{args.reference}</a></div>
    <Marker {...args}>
        <PresetBox />
        <PdfReader/>
    </Marker>
</div>;

const meta: Meta<typeof MarkerContainer> = {
    title: 'Markers PDF Addon',
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
        referenceUrl: "http://www.africau.edu/images/default/sample.pdf",
        reference: "PDF from africau",
        fileUri: "https://dev-demo.connected-in.co.kr/example/sample.pdf",
    },
};