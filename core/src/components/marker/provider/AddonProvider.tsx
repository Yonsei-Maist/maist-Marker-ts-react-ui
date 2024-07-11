import React, { createContext, useContext, useState, ReactNode, ReactElement } from 'react';
import BaseDrawer from '../ui/drawer/BaseDrawer';
import BaseMark from '../ui/mark/BaseMark';

export interface AddonItem {
    name: string;
    drawer: BaseDrawer<BaseMark>;
    selectedIcon: React.ReactNode;
    unselectedIcon: React.ReactNode;
}

export interface Addon {
    id: string;
    items: AddonItem[] | AddonItem;
}

interface AddonContextProps {
    addons: Addon[];
    registerAddon: (addon: Addon) => void;
}

const AddonContext = createContext<AddonContextProps | undefined>(undefined);

function AddonProvider({ children }: { children: ReactNode }) {
    const [addons, setAddons] = useState<Addon[]>([]);

    const registerAddon = (addon: Addon) => {
        setAddons((prev) => {
            if (prev && prev.find(o => o.id == addon.id)) return prev;
            return [...prev, addon]
        });
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