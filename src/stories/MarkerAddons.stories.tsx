import React, { useEffect, useState } from "react";
// import Marker from "./Marker";

import { Marker } from ".."
import "ol/ol.css";
import { Meta, StoryObj } from "@storybook/react";
import fs from 'fs';
import path from "path";
import {SegmentPicker} from "../../addons/marker-segmentation-addon/src";

const imageToBlob = async (imagePath: string): Promise<Blob> => {
    const fileBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([fileBuffer]);
    return blob;
};

const MarkerContainer = () => {
    const [fileBlob, setFileBlob] = useState<Blob>();

    const load = async () => {
        const blob = await imageToBlob(path.resolve(__dirname, "./assets/fishes.png"));

        setFileBlob(blob);
    }

    useEffect(() => {
        load();
    }, []);

    return <div style={{ height: "800px", width: "100%" }}>
        {
            fileBlob &&
            <Marker fileUri={"fishes.png"} fileBlob={fileBlob}>
                <SegmentPicker/>
            </Marker>
        }
    </div>
};

const meta: Meta<typeof MarkerContainer> = {
    title: 'Markers addons',
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