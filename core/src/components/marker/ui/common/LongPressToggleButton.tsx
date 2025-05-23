import React, { useState, useRef, MouseEvent, TouchEvent } from 'react';
import { ToggleButton, ToggleButtonGroup, ClickAwayListener, Box, Popper } from '@mui/material';
import { AddonItem } from '../../provider/AddonProvider';

interface LongPressToggleButtonProps {
    value: string;
    options: AddonItem[];
    onClickOption: (toolType: string) => void;
    toolType: string;
}

function LongPressToggleButton({ value, options, toolType, onClickOption }: LongPressToggleButtonProps) {
    const timerRef = useRef<NodeJS.Timeout>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [showOptions, setShowOptions] = useState(false);
    const [selectedAddon, setSelectedAddon] = useState(options[0]);

    const handleMouseDown = (event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
        if (!options) return;
        timerRef.current = setTimeout(() => {
            setShowOptions(true);
        }, 500); // 500ms 이상 누르면 길게 누름으로 간주
    };

    const handleMouseUp = (event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
        if (!options) return;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (event.type === 'mouseup' || event.type === 'touchend') {
            onClickOption(selectedAddon.name);
        }
    };

    const handleClickAway = () => {
        setShowOptions(false);
    };

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <Box sx={{ display: 'flex' }}>
                <ToggleButton
                    ref={buttonRef}
                    value={value}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchEnd={handleMouseUp}
                >
                    {toolType == selectedAddon.name ? selectedAddon.selectedIcon : selectedAddon.unselectedIcon}
                </ToggleButton>
                {
                    options &&
                    <Popper open={showOptions} anchorEl={buttonRef.current} placement={"right"}>
                        <ToggleButtonGroup
                            exclusive
                            orientation="horizontal"
                            value={null}
                        >
                            {options.map((option, index) => {
                                if (selectedAddon.name != option.name)
                                    return <ToggleButton key={index} value={option} onMouseUp={(e) => {
                                        handleClickAway();
                                        setSelectedAddon(option);
                                        onClickOption(option.name);
                                    }}>
                                        {toolType == option.name ? option.selectedIcon : option.unselectedIcon}
                                    </ToggleButton>
                            })}
                        </ToggleButtonGroup>
                    </Popper>
                }
            </Box>
        </ClickAwayListener>
    );
};

export default LongPressToggleButton;