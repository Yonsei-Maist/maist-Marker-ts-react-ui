import React, { useContext, useEffect, useState } from 'react';
import { LabelContext, LabelInformation, MapContext } from '../context';
import { TOOL_TYPE } from './ToolNavigator';

import { default as styledEm } from '@emotion/styled';
import { Drawer, List, ListItem, Button, Select, MenuItem, Stack, styled, Checkbox, Typography, IconButton, Box } from '@mui/material';
import { ArrowRight, DeleteForever, Edit } from '@mui/icons-material';
import LabelMemoControl, { LabelMemoType } from './controls/LabelMemoControl';

const MarkerLabelInfo = styledEm.div`
    padding: 15px;
`

const RelDrawer = styled(Drawer)(({theme}) => ({
    "& .MuiDrawer-paper": {
        position: "absolute"
    }
}));

type LabelNavigatorProps = {
    open?: boolean;
    labelMemoType?: LabelMemoType;
    labelMemoOptions?: string[];
    onOpenChange: () => void;
};

function LabelNavigator({open, labelMemoType, labelMemoOptions, onOpenChange }: LabelNavigatorProps) {
    const { pageLabelList, currentPageNo, selectedFeatures, globalLabelNameList, getLabelNameList, setSelectedFeatures, removeLabel, refresh } = useContext(LabelContext);
    const { remove, select, unselect } = useContext(MapContext);
    
    const [selectedLabel, setSelectedLabel] = useState(globalLabelNameList && globalLabelNameList.length > 0 ? globalLabelNameList[0] : '');

    useEffect(() => {
        setSelectedLabel(globalLabelNameList && globalLabelNameList.length > 0 ? globalLabelNameList[0] : '');
    }, [globalLabelNameList]);

    return (
        <RelDrawer variant="persistent" open={open} anchor={"right"}>
            <Button color="secondary" endIcon={<ArrowRight />} onClick={onOpenChange}>
                HIDE
            </Button>
            <MarkerLabelInfo>
                <Select fullWidth size='small' value={selectedLabel} onChange={(e) => { setSelectedLabel(e.target.value as string); }}>
                    {
                        globalLabelNameList.map((o, i) => {
                            return (
                                <MenuItem key={i + o} value={o}>{o}</MenuItem>
                            )
                        })
                    }
                </Select>
            </MarkerLabelInfo>
            <List>
                {
                    pageLabelList.size > 0 &&
                    pageLabelList.get(currentPageNo).map((o, i) => {
                        let isSelected = false;
                        
                        if (!o.label)
                            o.label = { labelName: selectedLabel } as LabelInformation;

                        let feature = o.feature;

                        if (selectedFeatures) {
                            for (let i =0;i<selectedFeatures.length;i++) {
                                if (selectedFeatures[i] == feature) {
                                    isSelected = true;
                                    break;
                                }
                            }
                        }

                        let localLabelNameList = getLabelNameList(o.toolType);

                        return (
                            <ListItem key={i + "_label"}>
                                <Stack spacing={1}>
                                    <Stack direction="row" alignItems="center" gap={1}>
                                        <Checkbox checked={isSelected} onChange={(e) => {
                                            if (!e.target.checked) {
                                                let newSelected = selectedFeatures || [];
                                                unselect(o);
                                                let index = newSelected.indexOf(feature);
                                                if (index > -1) {
                                                    newSelected.splice(index, 1);
                                                }
                                                refresh();
                                                setSelectedFeatures(newSelected);
                                            } else {
                                                let newSelected = selectedFeatures || [];
                                                select(o);
                                                refresh();
                                                setSelectedFeatures(newSelected.concat(feature));
                                            }
                                        }}/>
                                        <Typography variant="body1">{feature.get(TOOL_TYPE)}</Typography>
                                        <IconButton onClick={() => {
                                            remove(o);
                                            removeLabel(feature);
                                            let newSelected = selectedFeatures || [];
                                            let index = newSelected.indexOf(feature);
                                            if (index > -1) {
                                                newSelected.splice(index, 1);
                                            }
                                            refresh();
                                            setSelectedFeatures(newSelected);
                                        }}>
                                            <DeleteForever />
                                        </IconButton>
                                    </Stack>
                                    <Box display={"flex"}>
                                        <Typography flexGrow={1} variant='overline'>{o.memo}</Typography>
                                        <LabelMemoControl icon={<Edit/>} type={labelMemoType} memoList={labelMemoOptions} memo={o.memo} onChangeMemo={(memo: string) => {
                                            o.memo = memo;
                                            refresh();
                                            setSelectedFeatures(selectedFeatures);
                                        }}/>
                                    </Box>
                                    <Select fullWidth size='small' value={o.label.labelName} onChange={(e) => { 
                                            if (o.label) 
                                                o.label.labelName = e.target.value; 
                                            refresh();
                                            setSelectedFeatures(selectedFeatures);
                                        }}>
                                        {
                                            localLabelNameList.map((o, i) => {
                                                return (
                                                    <MenuItem key={i + o} value={o}>{o}</MenuItem>
                                                )
                                            })
                                        }
                                    </Select>
                                </Stack>
                            </ListItem>
                        )
                    })
                }
            </List>
        </RelDrawer>
    );
}

LabelNavigator.defaultProps = {
    open: false,
    onOpenChange: () => { }
};

export default LabelNavigator;