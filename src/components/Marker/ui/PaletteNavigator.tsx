import { GridOn, Save, StraightenTwoTone, Wallpaper } from "@mui/icons-material";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Graticule } from "ol"
import React, { ReactNode, useContext, useEffect, useRef, useState } from "react";
import { MapContext } from "../context";
import Confirm from "./Confirm";

const MENU = "MENU";
const WHITE_BACKGROUND = "WHITE_BACKGROUND";
const SHOW_GRID = "SHOW_GRID";
const SHOW_CANVAS_SIZE = "SHOW_CANVAS_SIZE";

export interface PaletteNavigatorProps {
    children?: ReactNode;
    root: any;
    onSaveLocal: () => void;
    onSaveServer: () => void;
}

function PaletteNavigator({children, root, onSaveLocal, onSaveServer}: PaletteNavigatorProps) {
    const {map, isLoaded} = useContext(MapContext);
    const [gridLayer, setGridLayer] = useState(undefined as undefined | Graticule);
    const [selectedList, setSelectedList] = useState([]);
    const [openConfirm, setOpenConfirm] = useState(false);

    const [canvasSizeViewer, setCanvasSizeViewer] = useState(undefined as undefined | HTMLDivElement);
    const menuRef = useRef(undefined);

    const toggle = (tag: string) => {
        let index = selectedList.indexOf(tag);
        if (index == -1) {
            selectedList.push(tag);
        } else {
            selectedList.splice(index, 1);
        }

        setSelectedList(selectedList.concat());
        return index == -1;
    }

    const onHandleSave = () => {
        onSaveLocal();
        setOpenConfirm(true);
    };

    const onHandleWhiteBackground = () => {
        let exist = toggle(WHITE_BACKGROUND);
        if (root) {
            const {current} = root;
            if (current) {
                if (exist) {
                    current.style.backgroundColor = "black";
                } else {
                    current.style.backgroundColor = "white";
                }
            }
        }
    };

    const onHandleShowGrid = () => {
        let exist = toggle(SHOW_GRID);
        if (gridLayer) {
            gridLayer.setVisible(exist);
        }
    };

    const onHandleShowCanvasSize = ( ) => {
        let exist = toggle(SHOW_CANVAS_SIZE);
        if (root) {
            const { current } = root;
            if (current) {
                let showSizeDiv: HTMLDivElement;
                if (canvasSizeViewer) {
                    showSizeDiv = canvasSizeViewer;
                } else {
                    showSizeDiv = window.document.createElement('div');
                    showSizeDiv.style.width = current.offsetWidth + "px";
                    showSizeDiv.style.height = current.offsetHeight + "px";
                    showSizeDiv.style.opacity = "0.4";
                    showSizeDiv.style.background = "skyblue";
                    showSizeDiv.style.position = "absolute";
                    showSizeDiv.style.top = "0";
                    showSizeDiv.style.left = "0";
                    showSizeDiv.style.lineHeight = current.offsetHeight + "px";
                    showSizeDiv.style.textAlign = "center";
                    showSizeDiv.innerHTML = current.offsetWidth + "px * " + current.offsetHeight + "px";

                    setCanvasSizeViewer(showSizeDiv);
                    current.appendChild(showSizeDiv);
                }

                if (exist) {
                    showSizeDiv.style.display = "block";
                } else {
                    showSizeDiv.style.display = "none";
                }
            }
        }
    };

    const onHandleSaveServer = (confirm) => {
        if (confirm) {
            onSaveServer();
        }
    }

    useEffect(() => {
        if (map) {
            let layers = map.getLayers();
            for (let i in layers.getArray()) {
                let layerItem = layers.getArray()[i];

                if (layerItem instanceof Graticule) {
                    setGridLayer(layerItem);
                }
            }
        }
    }, [map, isLoaded]);

    return <Box sx={{
        position: "absolute",
        top: "15px",
        left: "50%",
        transform: "translate(-50%, 0%)",
        zIndex: 1
    }}>
        <ToggleButtonGroup value={selectedList} sx={{ background: "white" }}>
            <ToggleButton size="small" value={MENU} key={MENU} onClick={onHandleSave} ref={menuRef}>
                <Save />
            </ToggleButton>
            <ToggleButton size="small" value={WHITE_BACKGROUND} key={WHITE_BACKGROUND} onClick={onHandleWhiteBackground}>
                <Wallpaper/>
            </ToggleButton>
            <ToggleButton size="small" value={SHOW_GRID} key={SHOW_GRID} onClick={onHandleShowGrid}>
                <GridOn/>
            </ToggleButton>
            {/* <ToggleButton size="small" value={SIZE_MENU} key={SHOW_GRID} ref={sizeMenuRef}>
                <PhotoSizeSelectSmall/>
            </ToggleButton> */}
            <ToggleButton size="small" value={SHOW_CANVAS_SIZE} key={SHOW_CANVAS_SIZE} onClick={onHandleShowCanvasSize}>
                <StraightenTwoTone/>
            </ToggleButton>
            {children}
        </ToggleButtonGroup>
        <Confirm title={"저장"} content={"저장하시겠습니까?"} open={openConfirm} onHandleOpen={()=> {setOpenConfirm(false);}} onHandleConfirm={onHandleSaveServer}/>
    </Box>
}

export default PaletteNavigator;