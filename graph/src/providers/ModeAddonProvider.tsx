import BaseMode from '@/marker/base';
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ModeAddonItem {
    name: string;
    markerMode: BaseMode<any>;
}

export interface ModeAddon {
    id: string;
    item: ModeAddonItem;
}

interface ModeAddonContextProps {
    modeAddons: ModeAddon[];
    gd?: Plotly.PlotlyHTMLElement;
    setGd: (gd: Plotly.PlotlyHTMLElement) => void;
    registerModeAddon: (addon: ModeAddon) => void;
}

const ModeAddonContext = createContext<ModeAddonContextProps | undefined>(undefined);

function ModeAddonProvider({ children }: { children: ReactNode }) {
    const [modeAddons, setModeAddons] = useState<ModeAddon[]>([]);
    const [gd, setGd] = useState<Plotly.PlotlyHTMLElement>();

    const registerModeAddon = (addon: ModeAddon) => {
        setModeAddons((prev) => {
            if (prev && prev.find(o => o.id == addon.id)) return prev;
            return [...prev, addon]
        });
    };

    return (
        <ModeAddonContext.Provider value={{ modeAddons, registerModeAddon, gd, setGd }}>
            {children}
        </ModeAddonContext.Provider>
    );
};

export const useModeAddon = (): ModeAddonContextProps => {
    const context = useContext(ModeAddonContext);
    if (!context) {
        throw new Error('useModeAddon must be used within an ModeAddonProvider');
    }

    return context;
};

export default ModeAddonProvider;