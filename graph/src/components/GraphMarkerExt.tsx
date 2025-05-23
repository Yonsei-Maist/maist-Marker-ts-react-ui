import React, { useLayoutEffect, useState } from "react";
import GraphMarker, { GraphMarkerProps } from "./GraphMarker";
import ModeAddonProvider from "@/providers/ModeAddonProvider";

interface GraphMarkerExtProps extends GraphMarkerProps {
    children?: React.ReactNode;
}

function AddonContainer({ children, onMount }) {
    useLayoutEffect(() => {
        onMount();
    }, [onMount]);
    return <>{children}</>
}

export default function GraphMarkerExt({ children, ...args }: GraphMarkerExtProps) {

    const [mounted, setMounted] = useState(false);

    return <ModeAddonProvider>
        <AddonContainer onMount={() => { setMounted(true); }}>
            {children}
        </AddonContainer>
        {
            mounted &&
            <GraphMarker {...args}/>
        }
    </ModeAddonProvider>
}