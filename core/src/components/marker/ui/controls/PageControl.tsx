import { ArrowLeft, ArrowRight } from "@mui/icons-material";
import { Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useMap } from "../../provider/MarkerProvider";
import { useLabel } from "../../provider/LabelProvider";
import { DrawObject } from "../../../../lib/CanvasDrawer";
import { DRAW_OBJECT } from "../../../../constants/tag";

function PageControl() {
    const { map, isLoaded } = useMap();
    const { currentPageNo, setCurrentPageNo, initPageLabelList } = useLabel();

    const [currentPageNoStr, setCurrentPageNoStr] = useState("1");
    const [total, setTotal] = useState(-1);

    const onHandleLeft = () => {
        if (currentPageNo > 1) {
            setCurrentPageNo(currentPageNo - 1);
        }
    }

    const onHandleRight = () => {
        if (currentPageNo < total) {
            setCurrentPageNo(currentPageNo + 1);
        }
    }

    const onTextChanged = (e: any) => {
        if (!/[0-9]+/ig.test(e.target.value) && e.target.value.length != 0) {
            e.preventDefault();
            return;
        }

        let value = e.target.value;
        if (value.length > 0) {
            let intValue = parseInt(e.target.value);

            if (intValue > total) {
                intValue = total;
            }

            setCurrentPageNo(intValue);
        } else {
            setCurrentPageNoStr(e.target.value);
        }
    }

    const pageChanged = (value: number) => {
        if (isLoaded) {
            const drawObject = map.get(DRAW_OBJECT) as DrawObject;

            if (drawObject) {
                drawObject.setCurrentPageNo(value);
                drawObject.drawing();
            }
        }
    }

    useEffect(() => {
        if (isLoaded) {
            const drawObject = map.get(DRAW_OBJECT) as DrawObject;
            if (drawObject) {
                let total = drawObject.totalPageNo;
                setTotal(total);
                initPageLabelList(total);
            }
        }
    }, [isLoaded]);

    useEffect(() => {
        setCurrentPageNoStr(currentPageNo + "");
        pageChanged(currentPageNo);
    }, [currentPageNo]);

    return total > 1 ? <Box sx={{ textAlign: "center" }}>
        <Stack direction={"row"} sx={{ display: "block" }} spacing={1}>
            <IconButton onClick={onHandleLeft}>
                <ArrowLeft />
            </IconButton>
            <TextField sx={{ width: "120px" }} size="small" onChange={onTextChanged} value={currentPageNoStr} InputProps={{
                endAdornment: <Typography sx={{ whiteSpace: "nowrap" }}>{total > 0 ? "/ " + total : ""}</Typography>
            }} />
            <IconButton onClick={onHandleRight}>
                <ArrowRight />
            </IconButton>
        </Stack>
    </Box> : <></>
}

export default PageControl;