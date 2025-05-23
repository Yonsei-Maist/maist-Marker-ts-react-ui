import { GraphType, TimeseriesData } from "@/models";
import React from "react";
import Timeseries from "./Timeseries";
import ModeNavigator from "./navigator/ModeNavigator";
import { Box } from "@mui/material";
import TopNavigator from "./navigator/TopNavigator";

export interface GraphData {
    tool: string;
    value: unknown;
}

export interface GraphMarkerProps {
    type: GraphType;
    data: TimeseriesData;
    initValue?: GraphData[];
    readonly?: boolean;
    saveHandler?: (data: GraphData[]) => void;
}

export default function GraphMarker({ type, data, readonly, initValue, saveHandler }: GraphMarkerProps) {
    return <div style={{width: '100%', height: '100%'}}>
        {
            !readonly &&
            <TopNavigator saveHandler={saveHandler}/>
        }
        <Box sx={{display: 'flex'}}>
            {
                !readonly &&
                <ModeNavigator/>
            }
            {
                type == GraphType.Timeseries &&
                <Timeseries data={data as TimeseriesData} initValue={initValue}/>
            }
        </Box>
    </div>
}