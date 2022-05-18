import React, { useEffect, useState } from 'react';

/**
 * Define props type
 */
type DefaultComponentProps = {
    props1: string;
    optional?: number;
    onClickListener: (event: Object) => void;
};

/**
 * Define Defulat component
 * @param DefaultComponentProps 
 * @returns 
 */
function DefaultComponent({ props1, optional, onClickListener }: DefaultComponentProps) {
    /** Define state value */
    const [value, setValue] = useState("init value");

    useEffect(() => {
        /**
         * call component did mount, did update when setValue called
         */
        return () => {
            /**
             * call component did unmount
             */
        }
    }, [value]);

    return (
        <div>
            Hello, {props1}, {value}
        </div>
    );
}

/**
 * Set default props
 */
DefaultComponent.defaultProps = {
    props1: '!'
};

export default DefaultComponent;