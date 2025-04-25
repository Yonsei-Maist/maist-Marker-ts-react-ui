import React, { useState } from 'react';
import { ClassInfo } from '../../context';

import { Drawer, List, ListItem, Button, Stack, styled, Checkbox, Typography, IconButton, Box, TextField, Autocomplete, Tooltip, FormControlLabel, Divider, useTheme } from '@mui/material';
import { ArrowRight, DeleteForever, Edit } from '@mui/icons-material';
import LabelMemoControl, { LabelMemoType } from '../controls/LabelMemoControl';
import SettingsIcon from '@mui/icons-material/Settings';
import LabelNameManager from '../controls/LabelNameManager';
import { useLabel } from '../../provider/LabelProvider';
import { useMap } from '../../provider/MarkerProvider';
import { MARK, TOOL_TYPE } from '@/constants/tag';

const RelDrawer = styled(Drawer)(({ theme }) => ({
    "& .MuiDrawer-paper": {
        position: "absolute"
    }
}));

const HighlightedText = ({ text, highlight, ...props }) => {
    if (!highlight.trim()) {
        return <Box {...props} component={'li'}>{text}</Box>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <Box {...props} component={'li'}>
            {parts.map((part: string, index: number) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={index} style={{ color: 'steelblue' }}>
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </Box>
    );
};

interface LabelNavigatorProps {
    open?: boolean;
    labelMemoType?: LabelMemoType;
    labelMemoOptions?: string[];
    manageLabels?: boolean;
    onOpenChange: () => void;
    handleClassChanged?: (classInfoList: ClassInfo[]) => void;
};

function LabelNavigator({ open = false, labelMemoType, labelMemoOptions, manageLabels, handleClassChanged, onOpenChange = () => { } }: LabelNavigatorProps) {
    const theme = useTheme();
    const { pageLabelList, currentPageNo, selectedFeatures, labelNameList, selectedLabel, setSelectedFeatures, removeLabel, setSelectedLabel, refreshLabels } = useLabel();
    const { redrawFeatures, remove, select, unselect } = useMap();

    const [openManager, setOpenManager] = useState(false);
    
    const SelectClass = ({title, value, onChange}) => {
        return <Autocomplete
            size='small'
            fullWidth
            options={labelNameList}
            renderInput={(params) => <FormControlLabel labelPlacement={"top"} control={<TextField {...params} fullWidth sx={{width: '160px'}}/>} label={title}/>}
            value={value}
            getOptionLabel={(option) => option.labelName}
            renderOption={(props, option, state, ownerState) => {
                return (
                    <Tooltip title={option.labelName} placement="bottom" key={option.labelName}>
                        <HighlightedText {...props} text={option.labelName} highlight={state.inputValue}/>
                    </Tooltip>
                );
            }}
            onChange={(e, value) => onChange(value)}
        />
    }

    return (
        <RelDrawer variant="persistent" open={open} anchor={"right"}>
            <Button color="secondary" endIcon={<ArrowRight />} onClick={onOpenChange}>
                HIDE
            </Button>
            {
                manageLabels &&
                <Box display={"flex"} color={theme.palette.primary.main} alignItems={'center'} sx={{px: '20px', cursor: 'pointer'}} onClick={(e) => {setOpenManager(true)}}>
                    <Typography flexGrow={1} variant="body1">Manage Classes</Typography>
                    <SettingsIcon/>
                </Box>
            }
            <Box sx={{p: '15px'}}>
                <SelectClass title={'Current Class Label'} value={selectedLabel} onChange={setSelectedLabel}/>
            </Box>
            <Divider/>
            <List>
                {
                    pageLabelList.size > 0 &&
                    pageLabelList.get(currentPageNo).map((o, i) => {
                        let isSelected = false;
                        let feature = o.feature;

                        if (selectedFeatures) {
                            for (let i = 0; i < selectedFeatures.length; i++) {
                                if (selectedFeatures[i] == feature) {
                                    isSelected = true;
                                    break;
                                }
                            }
                        }

                        if (!o.label) {
                            o.label = selectedLabel;
                            o.feature.set(MARK, o);
                        }

                        return (
                            <ListItem key={i + "_label"} divider>
                                <Stack spacing={1}>
                                    <Box display={'flex'} alignItems={'center'}>
                                        <Checkbox checked={isSelected} onChange={(e) => {
                                            if (!e.target.checked) {
                                                let newSelected = selectedFeatures || [];
                                                unselect(o);
                                                let index = newSelected.indexOf(feature);
                                                if (index > -1) {
                                                    newSelected.splice(index, 1);
                                                }
                                                setSelectedFeatures(newSelected);
                                            } else {
                                                let newSelected = selectedFeatures || [];
                                                select(o);
                                                setSelectedFeatures(newSelected.concat(feature));
                                            }
                                        }} />
                                        <Typography flexGrow={1} textAlign={'center'} variant="body1">{feature.get(TOOL_TYPE)}</Typography>
                                        <IconButton onClick={() => {
                                            remove(o);
                                            removeLabel(feature);
                                            let newSelected = selectedFeatures || [];
                                            let index = newSelected.indexOf(feature);
                                            if (index > -1) {
                                                newSelected.splice(index, 1);
                                            }
                                            setSelectedFeatures(newSelected);
                                        }}>
                                            <DeleteForever />
                                        </IconButton>
                                    </Box>
                                    <SelectClass title={''} value={o.label} onChange={(value: ClassInfo) => {
                                        o.label = value;
                                        o.feature.set(MARK, o);
                                        redrawFeatures();
                                        setSelectedFeatures(selectedFeatures);
                                        refreshLabels();
                                    }}/>
                                    <Box display={"flex"}>
                                        <Typography flexGrow={1} variant='overline'>{o.memo}</Typography>
                                        <LabelMemoControl icon={<Edit />} type={labelMemoType} memoList={labelMemoOptions} memo={o.memo} onChangeMemo={(memo: string) => {
                                            o.memo = memo;
                                            setSelectedFeatures(selectedFeatures);
                                        }} />
                                    </Box>
                                </Stack>
                            </ListItem>
                        )
                    })
                }
            </List>
            <LabelNameManager open={openManager} onHandleClose={() => {
                setOpenManager(false);
                redrawFeatures();
                handleClassChanged?.(labelNameList);
            }} />
        </RelDrawer>
    );
}

export default LabelNavigator;