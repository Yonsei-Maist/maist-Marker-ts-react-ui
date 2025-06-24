import React, { useState } from "react";
// import Marker from "./Marker";

import { Marker } from "../../core/src"
import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";

const MarkerContainer = () => {
    const label = [[{label: 'dd', toolType: 'Box', data: {coco: [0, 0, 80, 80]}}]];
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];

            const blob = new Blob([file], { type: file.type });
            setFileBlob(blob);
            setFileName(file.name);
        }
    };

    return <div style={{ height: "800px", width: "100%" }}>
        <div><input type="file" onChange={handleFileChange} accept=".pdf,.dcm,image/*" /></div>
        {
            fileBlob &&
            <Marker fileUri={fileName || ""} fileBlob={fileBlob} options={{fitPoint:false, savedLabelInfo: label, labelNameList: ["dd", "bb"]}} ></Marker>
        }
    </div>
};

const meta: Meta<typeof MarkerContainer> = {
    title: 'Markers Local',
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
export const Local: Story = {};