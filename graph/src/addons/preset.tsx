import PickerMode from "@/marker/picker";
import { useModeAddon } from "@/providers/ModeAddonProvider";
import React, { useEffect } from "react";

export function PresetPicker() {
    const { registerModeAddon } = useModeAddon();

    useEffect(() => {
        registerModeAddon({
            id: 'Picker',
            item: {
                name: 'Picker',
                markerMode: new PickerMode()
            }
        })
    }, []);

    return <></>;
}
