import React, { createContext, useContext, useState, ReactNode, ReactElement } from 'react';
import BaseDrawer from '../ui/drawer/BaseDrawer';
import BaseMark from '../ui/mark/BaseMark';

export interface Addon {
    id: string;
    name: string;
    drawer: BaseDrawer<BaseMark>;
    selectedIcon: React.ReactNode;
    unselectedIcon: React.ReactNode;
}

interface AddonContextProps {
    addons: (Addon | Addon[])[];
    registerAddon: (addon: (Addon | Addon[])) => void;
}

const AddonContext = createContext<AddonContextProps | undefined>(undefined);

function AddonProvider({ children }: { children: ReactNode }) {
    const [addons, setAddons] = useState<Addon[]>([]);

    const registerAddon = (addon: Addon) => {
        setAddons((prev) => [...prev, addon]);
    };

    return (
        <AddonContext.Provider value={{ addons, registerAddon }}>
            {children}
        </AddonContext.Provider>
    );
};

export const useAddon = (): AddonContextProps => {
    const context = useContext(AddonContext);
    if (!context) {
        throw new Error('useAddon must be used within an AddonProvider');
    }

    return context;
};

export default AddonProvider;