import React, { useCallback, useEffect, useState } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useModeAddon } from "@/providers/ModeAddonProvider";
import * as Icons from "@mui/icons-material";
import { Box, Tooltip } from "@mui/material";
import { GraphData } from "../GraphMarker";

const readonlyTitle = "Read Only";

export default function ModeNavigator() {
    const { modeAddons, gd } = useModeAddon();
    const [selected, setSelected] = useState<string>(readonlyTitle);
    const [readonly, setReadonly] = useState(false);

    const handleChange = (
        event: React.MouseEvent<HTMLElement>,
        newMode: string | null
    ) => {
        setSelected(newMode);
    };

    useEffect(() => {
        if (gd) {
            gd.removeAllListeners("plotly_click");
            if (!readonly) {
                const addon = modeAddons.find(
                    (a) => a.item.markerMode.getTitle() === selected
                );

                if (addon) {
                    // invoke the underlying click handler
                    gd.on("plotly_click", (evt) => {
                        addon.item.markerMode.click(gd, evt);
                    });
                }
            }
        }
    }, [gd, selected, readonly]);

    if (!gd) return;

    return (
        <ToggleButtonGroup
            value={selected}
            exclusive
            orientation='vertical'
            onChange={handleChange}
            aria-label="mode selection"
            sx={{
                mx: '10px',
                mt: '20px'
            }}
        >
            <ToggleButton size="small" key={readonlyTitle} value={readonlyTitle} aria-label={readonlyTitle} onClick={() => { setReadonly(!readonly) }}>
                <Tooltip title={readonlyTitle}>
                    <Icons.EditOff />
                </Tooltip>
            </ToggleButton>
            {
                modeAddons.map(({ item }) => {
                    const title = item.markerMode.getTitle();
                    const iconName = item.markerMode.getIcon();
                    const IconComponent = (Icons as Record<string, React.ElementType>)[iconName];
                    return (
                        <ToggleButton size="small" key={title} value={title} aria-label={title}>
                            <Tooltip title={title}>
                                {IconComponent ? <IconComponent /> : <></>}
                            </Tooltip>
                        </ToggleButton>
                    );
                })
            }
        </ToggleButtonGroup>
    );
}