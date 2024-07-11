export interface ResponseMessage {
    result: string;
    data?: ResultData;
    version?: string;
    message?: string;
    errMessage?: string;
}

export interface ResponseSimple {
    data: any;
}

export interface ResultData {
    
}