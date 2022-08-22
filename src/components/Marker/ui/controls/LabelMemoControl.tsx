import { Box, Button, Checkbox, FormControlLabel, IconButton, ListItem, Menu, MenuItem, Radio, RadioGroup, SxProps, TextField, Theme } from "@mui/material";
import React, { ReactNode, useRef, useState } from "react";

const SPLIT_TXT = "|&&|";
const DEFAULT_VALUE = "|NONE|"

export enum LabelMemoType {
    string="string",
    select="select",
    radio="radio",
    checkbox="checkbox"
}

interface LabelMemoControlProps {
    icon: ReactNode;
    type?: LabelMemoType;
    memo?: string;
    memoList?: string[];
    splitText?: string;
    onChangeMemo: (memo: string) => void;
}

function LabelMemoControl({icon, type, memo, memoList, splitText, onChangeMemo}: LabelMemoControlProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef();
    const defaultSelectItemRef = useRef();

    const onHandleClick = (e: any) => {
        setOpen(!open);
    }

    const onHandleClose = (e: any) => {
        setOpen(false);
    }

    const setMemo = (text: string) => {
        onChangeMemo(text);
    }

    const onHandleText = (e: any) => {
        setMemo(e.target.value);
    }

    const onHandleSelectText = (e: any) => {
        if (e.target.value == DEFAULT_VALUE) {
            setMemo(undefined);
        } else {
            setMemo(e.target.value);
        }
        onHandleClose(e);
    }

    const onHandleChangeItem = (e: any, value: string) => {
        setMemo(value);
    }

    const onHandleChangeCheckbox = (e: any, checked: boolean) => {
        let seperator = splitText || SPLIT_TXT;
        let text = e.target.name;
        let memoList = memo ? memo.split(seperator) : [];

        if (checked) {
            if (memoList.indexOf(text) == -1)
                memoList.push(text);
        } else {
            let idx = memoList.indexOf(text);
            if (idx > -1)
                memoList.splice(idx, 1);
        }

        setMemo(memoList.join(seperator));
    }

    const onHandleCheckboxChecked = (value: string) => {
        let seperator = splitText || SPLIT_TXT;
        let memoList = memo ? memo.split(seperator) : [];
        console.log(memoList, value, memoList.indexOf(value));
        return memoList.indexOf(value) > -1;
    }

    return <div>
        <IconButton edge={"end"} size="small" ref={ref} onClick={onHandleClick}>
            {icon}
        </IconButton>
        <Menu open={open} anchorEl={ref.current} onClose={onHandleClose}>
            <MenuItem>
                {
                    type == LabelMemoType.string &&
                    <ListItem>
                        <TextField placeholder="입력해주세요" value={memo || ""} size="small" onChange={onHandleText}/>
                    </ListItem>
                }
                {
                    type == LabelMemoType.select &&
                    memoList &&
                    <TextField sx={{minWidth: "150px"}} value={memo || DEFAULT_VALUE} size="small" select onChange={onHandleSelectText}>
                        <MenuItem ref={defaultSelectItemRef} key={DEFAULT_VALUE} value={DEFAULT_VALUE}>{"선택해주세요"}</MenuItem>
                        {
                            memoList.map((e, i) => {
                                return <MenuItem key={e} value={e}>{e}</MenuItem>
                            })
                        }
                    </TextField>
                }
                {
                    type == LabelMemoType.radio &&
                    memoList &&
                    <MenuItem>
                        <RadioGroup value={memo || ""} onChange={onHandleChangeItem}>
                            {
                                memoList.map((e, i) => {
                                    return <FormControlLabel key={e} value={e} control={<Radio />} label={e} />
                                })
                            }
                        </RadioGroup>
                    </MenuItem>
                }
                {
                    type == LabelMemoType.checkbox &&
                    memoList &&
                    memoList.map((e, i) => {
                        return <FormControlLabel
                                label={e}
                                key={e}
                                control={<Checkbox name={e} checked={onHandleCheckboxChecked(e)} onChange={onHandleChangeCheckbox}/>}
                            />
                    })
                            
                }
            </MenuItem>
        </Menu>
    </div>
}

LabelMemoControl.defaultProps = {
    type: LabelMemoType.string
}

export default LabelMemoControl;