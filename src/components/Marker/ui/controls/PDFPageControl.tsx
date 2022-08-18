import { ArrowLeft, ArrowRight } from "@mui/icons-material";
import { Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import PDFObject from "../../../../lib/PDFObject";
import { LabelContext, MapContext, MapObject } from "../../context";

export const PDF_OBJECT = "PDF_OBJECT";
export const PDF_CURRENT_PAGE_NO = "PDF_CURRENT_PAGE_NO";

function PDFPageControl() {
    const { map, isLoaded } = useContext(MapContext) as MapObject;
    const { currentPageNo, setCurrentPageNo, initPageLabelList } = useContext(LabelContext);

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
            const pdfObject = map.get(PDF_OBJECT) as PDFObject;
        
            pdfObject.setCurrentPageNo(value);
            pdfObject.drawing();
        }
    }

    useEffect(() => {
        if (isLoaded) {
            const pdfObject = map.get(PDF_OBJECT) as PDFObject;
            let total = pdfObject.pages.length;
            setTotal(total);
            initPageLabelList(total);
        }
    }, [isLoaded]);

    useEffect(() => {
        setCurrentPageNoStr(currentPageNo + "");
        pageChanged(currentPageNo);
    }, [currentPageNo]);

    return <Box sx={{ textAlign: "center" }}>
        <Stack direction={"row"} sx={{ display: "block"}} spacing={1}>
            <IconButton onClick={onHandleLeft}>
                <ArrowLeft />
            </IconButton>
            <TextField sx={{width: "120px"}} size="small" onChange={onTextChanged} value={currentPageNoStr} InputProps={{
                endAdornment: <Typography sx={{whiteSpace: "nowrap"}}>{total > 0 ? "/ " + total : ""}</Typography>
            }}/>
            <IconButton onClick={onHandleRight}>
                <ArrowRight />
            </IconButton>
        </Stack>
    </Box>
}

export default PDFPageControl;