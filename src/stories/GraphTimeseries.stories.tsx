import React, { useCallback, useState, useRef, useEffect } from "react";
// import Marker from "./Marker";

import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";
import { GraphMarker, GraphType, PresetPicker, TimeseriesData } from "@yonsei-maist/react-maist-graph";

interface GraphContainerProps {
    data: TimeseriesData;
}

const GraphContainer = (args: GraphContainerProps) => <div style={{ height: "800px", width: "100%" }}>
    <GraphMarker data={args.data} type={GraphType.Timeseries} initValue={[{tool: 'Picker', value: 2}]} saveHandler={(data) => console.log(data)}>
        <PresetPicker/>
    </GraphMarker>
</div>;

const meta: Meta<typeof GraphContainer> = {
    title: 'Graphs Time series Type',
    component: GraphContainer,
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
    parameters: {
        // More on Story layout: https://storybook.js.org/docs/configure/story-layout
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof GraphContainer>;

export const Series: Story = {
    args: {
        data: { value: [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6] }
    },
};// comma‑separated series data → Blob
