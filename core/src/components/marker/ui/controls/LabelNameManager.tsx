import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, List, ListItem, Menu, TextField, Typography } from "@mui/material";
import React, { useRef, useState } from "react";
import { ClassInfo } from "../../context";
import { Create, Delete } from "@mui/icons-material";
import { SketchPicker } from 'react-color';
import { useLabel } from "../../provider/LabelProvider";

function ColorBox({ ref, color, onClick }) {
    return <Box
        ref={ref}
        sx={{ width: '15px', height: '15px', backgroundColor: color, border: '1px solid darkgray', cursor: 'pointer' }}
        onClick={onClick}
    />
}

interface LabelNameListItemProps {
    label: ClassInfo;
    onHandleRemoveClass: (originLabel: ClassInfo) => void;
    onHandleLabelChanged: (originLabel: ClassInfo, newLabel: ClassInfo) => void;
}

function LabelNameListItem({ label, onHandleRemoveClass, onHandleLabelChanged }: LabelNameListItemProps) {
    const anchorEl = useRef<null | HTMLElement>(null);
    const [open, setOpen] = useState(false);
    const [currentLabel, setCurrentLabel] = useState(label);

    const onHandleClose = () => {
        setOpen(false);
    }

    const onChangeColor = (color: string) => {
        currentLabel.color = color;
        setCurrentLabel({ ...currentLabel });
    }

    const onChangeComplete = (color: string) => {
        currentLabel.color = color;
        onHandleLabelChanged(label, currentLabel);
    }

    return <ListItem>
        <Box display={'flex'} alignItems={'center'} sx={{ width: '100%' }}>
            <Typography flexGrow={1} variant="body1">{currentLabel.labelName}</Typography>
            <ColorBox ref={anchorEl} color={label.color ? label.color : 'white'} onClick={() => { setOpen(true); }} />
            <IconButton onClick={(e) => { onHandleRemoveClass(label); }}><Delete /></IconButton>
        </Box>
        <Menu
            open={open}
            anchorEl={anchorEl.current}
            onClose={onHandleClose}
        >
            <SketchPicker color={currentLabel.color} onChange={(c) => { onChangeColor(c.hex) }} onChangeComplete={(c) => { onChangeComplete(c.hex) }} />
        </Menu>
    </ListItem>
}

interface LabelNameManagerProps {
    open: boolean;
    onHandleClose: () => void;
}

function LabelNameManager({ open, onHandleClose }: LabelNameManagerProps) {
    const { currentPageNo, pageLabelList, labelNameList, setLabelNameList } = useLabel();

    const anchorEl = useRef<null | HTMLElement>(null);
    const [colorOpen, setColorOpen] = useState(false);

    const [currentClassName, setCurrentClassName] = useState('');
    const [currentColor, setCurrentColor] = useState('#15c3a1');
    const [error, setError] = useState<string>(undefined);

    const onHandleAddClass = () => {
        if (currentClassName.trim().length == 0) {
            setError('Empty class name');
            return;
        }

        let exists = labelNameList.find(o => o.labelName == currentClassName);
        if (exists) {
            setError('Dupplicated class name');
        } else {
            const newLabels = [...labelNameList, { labelName: currentClassName.trim(), color: currentColor } as ClassInfo];
            setLabelNameList(newLabels);
            setError(undefined);

            setCurrentClassName("");
        }
    }

    const onHandleRemoveClass = (labelInformation: ClassInfo) => {
        let exists = pageLabelList.get(currentPageNo).find((o) => o.label.labelName == labelInformation.labelName);
        if (exists) {
            setError(`Please remove all labels named '${labelInformation.labelName}' before remove`);
        } else {
            let idx = labelNameList.findIndex(o => o.labelName == labelInformation.labelName);
            if (idx > -1) {
                labelNameList.splice(idx, 1);
                setLabelNameList([...labelNameList]);
            }

            setError(undefined);
        }
    }

    const onHandleLabelChanged = (originLabel: ClassInfo, newLabel: ClassInfo) => {
        let exists = labelNameList.find((o => o.labelName == originLabel.labelName));

        if (exists) {
            exists.color = newLabel.color;
            exists.labelName = newLabel.labelName;
            setLabelNameList(labelNameList);
        }
    }

    const onHandleColorClose = () => {
        setColorOpen(false);
    }

    return <Dialog
        open={open}
        onClose={onHandleClose}
        sx={{
            '& .MuiDialog-paper': {
                width: '70%', // Dialog의 width를 화면 전체의 70%로 설정
                maxWidth: '70%' // maxWidth도 동일하게 설정
            }
        }}
    >
        <DialogTitle id="alert-dialog-title">
            Label Name manager
        </DialogTitle>
        <DialogContent>
            <List>
                {
                    labelNameList.map((o, i) => {
                        return <LabelNameListItem
                            key={i}
                            label={o}
                            onHandleRemoveClass={onHandleRemoveClass}
                            onHandleLabelChanged={onHandleLabelChanged}
                        />
                    })
                }
            </List>
            <Box display={"flex"} alignItems={'center'}>
                {/* <SketchPicker color={currentColor} onChangeComplete={(c) => setCurrentColor(c.hex)}/> */}
                <TextField
                    sx={{ flexGrow: 1, mr: '15px' }}
                    fullWidth
                    size="small"
                    title="Class Name"
                    value={currentClassName}
                    onChange={(e) => { setCurrentClassName(e.target.value); }}
                    onKeyUp={(e) => {
                        if (e.key == "Enter") {
                            onHandleAddClass();
                        }
                    }}
                    slotProps={{
                        input: { endAdornment: <IconButton onClick={onHandleAddClass}><Create /></IconButton> },
                    }}
                />
                <ColorBox ref={anchorEl} color={currentColor} onClick={() => { setColorOpen(true); }} />
            </Box>
            {error && <Alert severity='error'>{error}</Alert>}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => { onHandleClose(); }}>완료</Button>
        </DialogActions>
        <Menu
            open={colorOpen}
            anchorEl={anchorEl.current}
            onClose={onHandleColorClose}
        >
            <SketchPicker color={currentColor} onChange={(c) => { setCurrentColor(c.hex) }} onChangeComplete={(c) => { setCurrentColor(c.hex) }} />
        </Menu>
    </Dialog>
}

export default LabelNameManager;