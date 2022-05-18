import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';

const MarkComponentStyled = styled.div`
    width: calc(100% - 140px);
    height: 100%;
`

type MarkComponentProps = {
};

function MarkComponent({}: MarkComponentProps) {
    const [value, setValue] = useState("init value");

    useEffect(() => {
        return () => {
        }
    }, [value]);

    return (
        <MarkComponentStyled id="map">
        </MarkComponentStyled>
    );
}

MarkComponent.defaultProps = {
};

export default MarkComponent;