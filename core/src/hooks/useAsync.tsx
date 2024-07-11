/**
 * reference: https://react.vlpt.us/integrate-api/03-useAsync.html
 * @author Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05. ~
 * @Date 2021.10.26
 */

import { useReducer, useEffect } from 'react';
import { ResponseMessage, ResultData } from '../models/response';

export interface ReducerState {
    loading: boolean;
    data?: ResultData;
    error: boolean;
    errorMessage?: string;
}

export interface ReducerAction {
    type: string;
    data?: ResultData;
    errorMessage?: string;
}

export function reducer(state: ReducerState, action: ReducerAction): ReducerState {
    switch (action.type) {
        case 'LOADING':
            return {
                loading: true,
                data: undefined,
                error: false
            };
        case 'SUCCESS':
            return {
                loading: false,
                data: action.data,
                error: false
            };
        case 'ERROR':
            return {
                loading: false,
                error: true,
                errorMessage: action.errorMessage
            };
        default:
            throw new Error(`Unhandled action type: ${action.type}`);
    }
}

function useAsync(getFileFromUrl: () => Promise<ArrayBuffer>, callback: (buffer: ArrayBuffer) => Promise<ResponseMessage>, deps: React.DependencyList = [], skip: boolean = false): [ReducerState, () => Promise<void>] {
    const [state, dispatch] = useReducer(reducer, {
        loading: false,
        data: undefined,
        error: false
    });

    const fetchData = async () => {
        dispatch({ type: 'LOADING' });
        try {
            const fileBuffer = await getFileFromUrl();
            const responseMessage = await callback(fileBuffer);
            if (responseMessage.result == "success")
                dispatch({ type: 'SUCCESS', data: responseMessage.data });
            else
                dispatch({ type: 'ERROR', errorMessage: responseMessage.errMessage });
        } catch (e) {
            console.log(e);
            dispatch({ type: 'ERROR', errorMessage: e + "" });
        }
    };

    useEffect(() => {
        if (skip) return;
        fetchData();
    }, deps);

    return [state, fetchData];
}

export default useAsync;