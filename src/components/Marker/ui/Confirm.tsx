import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import React, { useState } from "react";

interface ConfirmProps {
    onHandleConfirm: (confirm: boolean) => void;
    title: string;
    content: string;
    onHandleOpen: () => void;
    open: boolean;
}

function Confirm({onHandleConfirm, title, content, onHandleOpen, open}: ConfirmProps) {

    const onHandleConfirmResult = (confirm: boolean) => {
        onHandleOpen();
        onHandleConfirm(confirm);
    }

    return <Dialog
        open={open}
        onClose={onHandleOpen}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <DialogTitle id="alert-dialog-title">
            {title}
        </DialogTitle>
        <DialogContent>
            <DialogContentText id="alert-dialog-description">
                {content}
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => {onHandleConfirmResult(false);}}>아니오</Button>
            <Button onClick={() => {onHandleConfirmResult(true);}} autoFocus>
                예
            </Button>
        </DialogActions>
    </Dialog>
}

export default Confirm;