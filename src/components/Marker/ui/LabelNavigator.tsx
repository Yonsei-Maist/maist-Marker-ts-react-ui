import React, { useContext, useEffect, useState } from 'react';
import { LabelContext, LabelInformation, MapContext } from '../context';
import { TOOL_TYPE } from './ToolNavigator';

import { default as styledEm } from '@emotion/styled';
import { Drawer, Divider, List, ListItem, Button, Select, MenuItem, Stack, styled, useTheme, Checkbox, Typography, IconButton } from '@mui/material';
import { ArrowRight, DeleteForever } from '@mui/icons-material';

const MarkerLabelInfo = styledEm.div`
    padding: 15px;
`

const RelDrawer = styled(Drawer)(({theme}) => ({
    "& .MuiDrawer-paper": {
        position: "absolute"
    }
}));

type LabelNavigatorProps = {
    labelNameList: string[]
    open?: boolean
    onOpenChange: () => void
};

function LabelNavigator({ labelNameList, open, onOpenChange }: LabelNavigatorProps) {
    const { labelList, selectedFeatures, setSelectedFeatures, removeLabel, refresh } = useContext(LabelContext);
    const { remove, select, unselect } = useContext(MapContext);
    const [selectedLabel, setSelectedLabel] = useState(labelNameList[0]);
    const theme = useTheme();

    useEffect(() => {
    }, [labelList]);
    return (
        <RelDrawer variant="persistent" open={open} anchor={"right"}>
            <Button color="secondary" endIcon={<ArrowRight />} onClick={onOpenChange}>
                HIDE
            </Button>
            <MarkerLabelInfo>
                <Select size='small' value={selectedLabel} onChange={(e) => { setSelectedLabel(e.target.value as string); }}>
                    {
                        labelNameList.map((o, i) => {
                            return (
                                <MenuItem value={o}>{o}</MenuItem>
                            )
                        })
                    }
                </Select>
            </MarkerLabelInfo>
            <List>
                {
                    labelList.map((o, i) => {
                        let isSelected = false;
                        if (!o.labelInfo)
                            o.labelInfo = { labelName: selectedLabel } as LabelInformation;

                        let feature = o.feature;

                        if (selectedFeatures) {
                            for (let i =0;i<selectedFeatures.length;i++) {
                                if (selectedFeatures[i] == feature) {
                                    isSelected = true;
                                    break;
                                }
                            }
                        }

                        return (
                            <ListItem>
                                <Stack spacing={1}>
                                    <Stack direction="row" alignItems="center" gap={1}>
                                        <Checkbox checked={isSelected} onChange={(e) => {
                                            if (!e.target.checked) {
                                                let newSelected = selectedFeatures || [];
                                                unselect(feature);
                                                let index = newSelected.indexOf(feature);
                                                if (index > -1) {
                                                    newSelected.splice(index, 1);
                                                }
                                                refresh();
                                                setSelectedFeatures(newSelected);
                                            } else {
                                                let newSelected = selectedFeatures || [];
                                                select(feature);
                                                refresh();
                                                setSelectedFeatures(newSelected.concat(feature));
                                            }
                                        }}/>
                                        <Typography variant="body1">{feature.get(TOOL_TYPE)}</Typography>
                                        <IconButton onClick={() => {
                                            remove(feature);
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
                                    <Select size='small' value={o.labelInfo.labelName} onChange={(e) => { 
                                            if (o.labelInfo) 
                                                o.labelInfo.labelName = e.target.value; 
                                            refresh();
                                            setSelectedFeatures(selectedFeatures);
                                        }}>
                                        {
                                            labelNameList.map((o, i) => {
                                                return (
                                                    <MenuItem value={o}>{o}</MenuItem>
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
    labelNameList: ["DefaultLabel1", "DefaultLabel2"],
    open: false,
    onOpenChange: () => { }
};

export default LabelNavigator;