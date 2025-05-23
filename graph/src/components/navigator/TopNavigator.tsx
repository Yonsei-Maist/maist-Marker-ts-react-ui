import React, { useEffect } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useModeAddon } from "@/providers/ModeAddonProvider";
import { Save } from "@mui/icons-material";
import { Box, Tooltip } from "@mui/material";
import { GraphData } from "../GraphMarker";

const saveTitle = "Save";

interface TopNavigatorProps {
    saveHandler?: (data: GraphData[]) => void;
}

export default function TopNavigator({ saveHandler }: TopNavigatorProps) {
    const { modeAddons } = useModeAddon();
    const handleSave = () => {
        const data: GraphData[] = [];

        modeAddons.forEach(o => {
            data.push({
                tool: o.item.name,
                value: o.item.markerMode.getValue()
            })
        });

        saveHandler?.(data);
    }

    const onHandleShortcuts = (e: globalThis.KeyboardEvent) => {
        if (e.ctrlKey && e.key.toLowerCase() == "s" || e.metaKey && e.key.toLowerCase() == "s") {
            e.preventDefault();
            handleSave();
        }
    }

    useEffect(() => {
        document.removeEventListener('keydown', onHandleShortcuts);
        document.addEventListener('keydown', onHandleShortcuts);
        return () => {
            document.removeEventListener('keydown', onHandleShortcuts);
        }
    }, []);
    
    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            zIndex: 1,
            my: '10px'
        }}>
            <ToggleButtonGroup>
                <ToggleButton size="small" key={saveTitle} value={saveTitle} aria-label={saveTitle} onClick={handleSave}>
                    <Tooltip title={saveTitle}>
                        <Save />
                    </Tooltip>
                </ToggleButton>
            </ToggleButtonGroup>
        </Box>
    );
}