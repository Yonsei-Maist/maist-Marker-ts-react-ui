
import { AutoFixNormal, AutoFixNormalOutlined, AutoAwesome, AutoAwesomeOutlined } from "@mui/icons-material";
import { useAddon } from "@yonsei-maist/react-maist-marker";
import React, { useEffect } from "react";
import MagicPicker from "./drawer/MagicPicker";
import IntelligentPicker from "./drawer/IntelligentPicker";

function SegmentPicker() {
    const { registerAddon } = useAddon();

    useEffect(() => {
        registerAddon([
            {
                id: "MagicPicker",
                name: "MagicPicker",
                selectedIcon: <AutoFixNormal/>,
                unselectedIcon: <AutoFixNormalOutlined/>,
                drawer: new MagicPicker()
            }, 
            {
                id: "IntelligentPicker",
                name: "IntelligentPicker",
                selectedIcon: <AutoAwesome/>,
                unselectedIcon: <AutoAwesomeOutlined/>,
                drawer: new IntelligentPicker()
            }
        ]);
    }, []);

    return <></>
}

export default SegmentPicker;