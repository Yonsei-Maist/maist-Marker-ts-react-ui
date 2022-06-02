
import React , { useEffect, useContext, useRef, useState } from 'react';
import { Modify, Snap, Translate, Select } from 'ol/interaction';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { Vector } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer'

import MapContext, { MapObject } from '../context/MapContext';
import Geometry from 'ol/geom/Geometry';
import { DrawEvent } from 'ol/interaction/Draw';
import {
    platformModifierKeyOnly,
    primaryAction,
} from 'ol/events/condition';
import { Feature } from 'ol';
import {LabelContext, LabelContextObject, LabelObject } from '../context';
import Polygon from 'ol/geom/Polygon';
import { GeometryCollection, MultiPoint, Point } from 'ol/geom';

import {v4 as uuidv4} from 'uuid';
import BasicDrawer from './lib/BasicDrawer';
import BoxDrawer, { calculateCenter } from './lib/BoxDrawer';
import AreaDrawer from './lib/AreaDrawer';
import LengthDrawer from './lib/LengthDrawer';
import PencilDrawer from './lib/PencilDrawer';
import PolygonDrawer from './lib/PolygonDrawer';
import NoneDrawer from './lib/NoneDrawer';
import { measureStyleFunciton } from './lib/Styler';
import { LabelInfo } from './Marker';

import styled from '@emotion/styled';
import EllipseDrawer from './lib/EllipseDrawer';

const ToolNavigatorStyled = styled.div`
    width: 40px;
    padding-left: 5px;
    background: #404040;
`;

const ToolModeSelecter = styled.div`
`
const ToolButtonSelecter = styled.div`
`

const ToolButton = styled.div`
    width: 30px;
    height: 30px;
    margin-top: 5px;
    margin-right: 5px;
    border-radius: 5px;
`

const ToolButtonSelectMode = styled(ToolButton)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAWpJREFUeNrs2gEOgiAUBmBpHcCjeIPqJh7Fm1AnMU+QR+kGxJw1s0R4gjx4799Ya7nki4aIryg4HA6HsxylVKnbQzdJCfuOpITNF23A5oe2wOaDdsCmjwZg00VvwKaH9oANihYBwI1+ORkOOc/e3w3H3oQQV9Rgix9EfXVAZ8/zH6gtbRnMYAZ/Jp864qWv3vuEUrcWOktPA/yOdrfFyYhVCMDhV2QTLBZwOPQMiwnsH/0Hiw3sD72AxQi2Qh/WsPol2uUHkBo80oaRTSGSEtaIXvpLVxmsIisX8EW3PmFsPxq8btVgnKXV2OfSeZYWQjwTHOlhZMe+u1+WEkOvYq1uDxNBW2Gt74eRo62xThsASNFOWOcdD2RoZyxoi2eC7iJiOwh26H+E/SjeiGcwgxkMzjHApNQU5selPzcCho+9Py4NMQujfiCOFU2qzoNUJQ+pWi1S1Xik6i1JVdSSqpnOH8vhcDhb8xJgADLTR7b09EuOAAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAaxJREFUeNrs2otNwzAQBuDEZgBGYIRsgDsBIzRswghsgBmBCXA3yAgZgQ3gKqWoVNTxubqzz7lfiqJKaZyveZ1dd51Go9EISs/doHPuHlafsEwhhGfu9m0h7HBcHiDzPH80Cb7AnsKOtgWxRdC2MJYdbSvAsqJtJVg2tK0Iy4K2lWHJ0T0B+AVWj7FNLj6HyLbvUJx46ZXW9x9tCKzHYLZWSytYwQr+ffiMpQ76lrZNZoNvsNoXPFH75RjowUtDYwVX55iDNkKx2WgjGJuFNsKxaLRpAItCm0awyei+Iex5/LUhYNsgNtqfvnZJD538DJh7eAfLJBg7LQbUPbw2VAO3SdiVGACAfRyPy8WwsN8v1FN6+YK0Mx3Frr6WhKFXsUmFhxB0Eja5tKwcnYxFdR4qRaOw6O5hZWg0NmsA4Ax9KIg95GCj72Gq6EA8cxSs4Mayub9L7wh+xFdYnhB9ahcZtfDVn+HEruVaPNUsPbJ34A1oTzklkfSln4H21PMvyascBNpzTDZlKesS0J5rZi1bHRtBe85pxKyF+z9ozz1nenMTxDUajUZUfgQYAI2j5pLNG34BAAAAAElFTkSuQmCC') no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonSelectModeSelected = styled(ToolButton)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAaxJREFUeNrs2otNwzAQBuDEZgBGYIRsgDsBIzRswghsgBmBCXA3yAgZgQ3gKqWoVNTxubqzz7lfiqJKaZyveZ1dd51Go9EISs/doHPuHlafsEwhhGfu9m0h7HBcHiDzPH80Cb7AnsKOtgWxRdC2MJYdbSvAsqJtJVg2tK0Iy4K2lWHJ0T0B+AVWj7FNLj6HyLbvUJx46ZXW9x9tCKzHYLZWSytYwQr+ffiMpQ76lrZNZoNvsNoXPFH75RjowUtDYwVX55iDNkKx2WgjGJuFNsKxaLRpAItCm0awyei+Iex5/LUhYNsgNtqfvnZJD538DJh7eAfLJBg7LQbUPbw2VAO3SdiVGACAfRyPy8WwsN8v1FN6+YK0Mx3Frr6WhKFXsUmFhxB0Eja5tKwcnYxFdR4qRaOw6O5hZWg0NmsA4Ax9KIg95GCj72Gq6EA8cxSs4Mayub9L7wh+xFdYnhB9ahcZtfDVn+HEruVaPNUsPbJ34A1oTzklkfSln4H21PMvyascBNpzTDZlKesS0J5rZi1bHRtBe85pxKyF+z9ozz1nenMTxDUajUZUfgQYAI2j5pLNG34BAAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #FFFFFF;

    &: hover {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAaxJREFUeNrs2otNwzAQBuDEZgBGYIRsgDsBIzRswghsgBmBCXA3yAgZgQ3gKqWoVNTxubqzz7lfiqJKaZyveZ1dd51Go9EISs/doHPuHlafsEwhhGfu9m0h7HBcHiDzPH80Cb7AnsKOtgWxRdC2MJYdbSvAsqJtJVg2tK0Iy4K2lWHJ0T0B+AVWj7FNLj6HyLbvUJx46ZXW9x9tCKzHYLZWSytYwQr+ffiMpQ76lrZNZoNvsNoXPFH75RjowUtDYwVX55iDNkKx2WgjGJuFNsKxaLRpAItCm0awyei+Iex5/LUhYNsgNtqfvnZJD538DJh7eAfLJBg7LQbUPbw2VAO3SdiVGACAfRyPy8WwsN8v1FN6+YK0Mx3Frr6WhKFXsUmFhxB0Eja5tKwcnYxFdR4qRaOw6O5hZWg0NmsA4Ax9KIg95GCj72Gq6EA8cxSs4Mayub9L7wh+xFdYnhB9ahcZtfDVn+HEruVaPNUsPbJ34A1oTzklkfSln4H21PMvyascBNpzTDZlKesS0J5rZi1bHRtBe85pxKyF+z9ozz1nenMTxDUajUZUfgQYAI2j5pLNG34BAAAAAElFTkSuQmCC') no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonPencil = styled(ToolButton)`

`

const ToolButtonPencilSelected = styled(ToolButton)`

`

const ToolButtonBox = styled(ToolButton)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAIVJREFUeNrs2kEKgCAQQFGNLtbJqpPVzaYDFBkFUfr+Ulz4YNxNSpIkSS+Vjw4jYqkCl/NwFRyVgHe+rrWR7i/cmX9mGu/84Tgbiy9XentzIw0MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM3EbFlYeImGoC2+JpdaTXJEmSpGdtAgwAQH0ZlBC2LH8AAAAASUVORK5CYII=') no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKpJREFUeNrs2rENgzAQQNEjomEHWvZwdmBM7xDvQcsOLhPRRVGgSKRIOO+XxoUfvtIRkiRJP6p7t5hSurWAK6VcX9f6nb2p1Ru+/NtI90cfx3GMeZ5PBco5x7qun4GHYYhpmk4F3s5spIGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBPXl4rtYay7KcCrSd+ai9Z0v3Fm6zlNIZ6b2fE5IkSfquhwADAPopGF2Co3RSAAAAAElFTkSuQmCC') no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonBoxSelected = styled(ToolButtonBox)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKpJREFUeNrs2rENgzAQQNEjomEHWvZwdmBM7xDvQcsOLhPRRVGgSKRIOO+XxoUfvtIRkiRJP6p7t5hSurWAK6VcX9f6nb2p1Ru+/NtI90cfx3GMeZ5PBco5x7qun4GHYYhpmk4F3s5spIGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBPXl4rtYay7KcCrSd+ai9Z0v3Fm6zlNIZ6b2fE5IkSfquhwADAPopGF2Co3RSAAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonPolygon = styled(ToolButton)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAa9JREFUeNrsWottwjAQtSsG6AjeoHQDRsgIdINsUDIBIzACbMAIUScIG6QbpBfJqiILROTPu5C7J1mJkPC7s89+54uNUSgUCoVCwQWbo5NhGE70cIVtvVlrv9hHjJzdDzjsWWeYDHinRwuY3f9ZpvZJM/0b28Em0YA6cPZC7Sezkx/UKv/uPOeBI5RdEG5dQa4u4HIcDp8DI3YFuXYB1xntbGjAFcB5RQ3wPfIWHWJ3llDLJUNH4EAfc8vUUxmi1k8Iey9NKIex/PAR5owwtjXEtYew7pJolWDXQXQesIhMB5XpUUd10PHBLASjLYFtdW4Z6JAyNNO+LptMjQd7bhmKkKlTbEdbdL6cUUG2Ly1DxWWK/lBlCROs0+Hyq2JlqF+CDM2Uqacb7JtZMWbXvsSFtLhNS6QsiUs8RKaW4g4PIo+HIgsA4ko8D0Jo3UU8TySnTPtAptZdiIeP8FIiTNTHNNguuTSVEPVBvHimUzDTi77UYq29EXFDr9/+J+dHvsSllqmDzcgdbXeqTJgXu7aUVNPyxA1wJTUpzibP8LRQYKRcPVQoFAqFQhGNPwEGAF2K3IDfSJebAAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3lJREFUeNrsWj2v2jAUNbwOfQwIiRGGdGDmdWMMKyxIsCLBPyC/oOUXwNoJJFZQ3wLdgJGtMDM0AysSXeCN9aV25GcFkpjEtvR8JBTM4HuOb7jHXwgZGBgYGBgYqEIqjk5s2x7hh5UwV3e9XneVC8ZiO/gxkpSgLhY9ViYYi83hx28J2fWyjD9fseiTaAefHiTQo2Kfn59Ru91GmUwmVoXn8xlNJhN0uVwQiQUxv0vPMM4uBP9D2/V6HdVqtUTSulgs0Hw+Z3/6grPsivSVfoDHgH7J5/OJiQVA3xDDL7YUwTi7Nn40aLvZbCb+5+ViNAgHaRn2RrhUKqFyuZy4YIgBsR7Nclogu2BDL7TdarWkTRq4WC+ESyQ8CdjQL/z5DO1qtYoqlYo0wdls9lqtXderV7ZlWT9w+y2pDH/Dnxy1IajMsgExITZBjnCK/5UmNtS7EVgafAa6R7jFnuERa0PwOqsCxOZsahSrYGIBng3AjEo1OA52WJtKR80uWANnD0rgw2MUi2A8cD12caBDdm9wsQhXcVsiNvST2hAUCxmTjLCAhUoqlUL7/Z7+VAmyqaAMD1gbUlmo7hUwzqYGQq80zi7MpjrsLEeFDYWxKW4G1iHcI2fYG6lisSh1RhUVwA04hplnp29kt8HakMz5ckzzbJtoCJ3hwZ1VipbwWbUNSNGNbQNAe/jtfd0S7NAvu92OLfvaAjgCVz8NgYLxyLzCg7an06n2gjmOa6IhUpX2RuhwOKDNZqOtWOAGHIOye1cwHqEtfozZESRbpVoBOHHZHRPuQjMtGKkT7Xi1WmknGDgxiTjdy26gYFLl+rQNe8PH41EbscCF26/uB51KBNoS7mCI/h9xXAGnALqA4+ISrrGsh7ts+dfBpnx4hDpZDCUYajxrUzpkmeOwJhxj2/F4N4Lw31FZwCA2V0tCnxuHFkwOr4ZsAVNhUxCTK1TDKAdrUefSfdamuMBSwA30OxeJXTAp+Q77anEznEQBsbi/khP1cDzyaolcOdiqmGdzsbYi1x9El4fOnVVKIvBZtTki/QgJJhbgrUZms1nigrkYr2FtKM4NAIe1KbiWkBSgb86GHNG+hC+1gBXYtg0V8np6t1wuUaFQSORSC/TNzZdd0f4+3LWlp4eiu+6bZVl/EXPfI2GADT20E/Hhrh4aGBgYGBgYqMM/AQYAfVB4LQUP6/8AAAAASUVORK5CYII=') no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonPolygonSelected = styled(ToolButtonPolygon)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3lJREFUeNrsWj2v2jAUNbwOfQwIiRGGdGDmdWMMKyxIsCLBPyC/oOUXwNoJJFZQ3wLdgJGtMDM0AysSXeCN9aV25GcFkpjEtvR8JBTM4HuOb7jHXwgZGBgYGBgYqEIqjk5s2x7hh5UwV3e9XneVC8ZiO/gxkpSgLhY9ViYYi83hx28J2fWyjD9fseiTaAefHiTQo2Kfn59Ru91GmUwmVoXn8xlNJhN0uVwQiQUxv0vPMM4uBP9D2/V6HdVqtUTSulgs0Hw+Z3/6grPsivSVfoDHgH7J5/OJiQVA3xDDL7YUwTi7Nn40aLvZbCb+5+ViNAgHaRn2RrhUKqFyuZy4YIgBsR7Nclogu2BDL7TdarWkTRq4WC+ESyQ8CdjQL/z5DO1qtYoqlYo0wdls9lqtXderV7ZlWT9w+y2pDH/Dnxy1IajMsgExITZBjnCK/5UmNtS7EVgafAa6R7jFnuERa0PwOqsCxOZsahSrYGIBng3AjEo1OA52WJtKR80uWANnD0rgw2MUi2A8cD12caBDdm9wsQhXcVsiNvST2hAUCxmTjLCAhUoqlUL7/Z7+VAmyqaAMD1gbUlmo7hUwzqYGQq80zi7MpjrsLEeFDYWxKW4G1iHcI2fYG6lisSh1RhUVwA04hplnp29kt8HakMz5ckzzbJtoCJ3hwZ1VipbwWbUNSNGNbQNAe/jtfd0S7NAvu92OLfvaAjgCVz8NgYLxyLzCg7an06n2gjmOa6IhUpX2RuhwOKDNZqOtWOAGHIOye1cwHqEtfozZESRbpVoBOHHZHRPuQjMtGKkT7Xi1WmknGDgxiTjdy26gYFLl+rQNe8PH41EbscCF26/uB51KBNoS7mCI/h9xXAGnALqA4+ISrrGsh7ts+dfBpnx4hDpZDCUYajxrUzpkmeOwJhxj2/F4N4Lw31FZwCA2V0tCnxuHFkwOr4ZsAVNhUxCTK1TDKAdrUefSfdamuMBSwA30OxeJXTAp+Q77anEznEQBsbi/khP1cDzyaolcOdiqmGdzsbYi1x9El4fOnVVKIvBZtTki/QgJJhbgrUZms1nigrkYr2FtKM4NAIe1KbiWkBSgb86GHNG+hC+1gBXYtg0V8np6t1wuUaFQSORSC/TNzZdd0f4+3LWlp4eiu+6bZVl/EXPfI2GADT20E/Hhrh4aGBgYGBgYqMM/AQYAfVB4LQUP6/8AAAAASUVORK5CYII=') no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonLength = styled(ToolButton)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAgFJREFUeNrsmtGNhCAQhterwBIsgRK2BEugg7MEOqGELYHrwOvAErgOPEzgMpkFRfSBmWMS4kbA8Akz84P7eDRr1oyydZQGu65r7y6jKwO4/ePKV9d132xmZQN1Ra/7Zlx5coAVrlgEt3jAOQKuOMFuszxEZl+hdooDrDxoP6AZf7KAdb9HP6NbGSPQoZ8hDeuXron47Oyjd+ivQJ2gPLMQ1qJ2M/LpYBNVWAEDF7gPU9UI7s9VB68IrEL1f8s00tfiPmA1vAF/1ADrLluA6cHtz5T/QX/dsYFSnoV+Ks4uaR+ps1JZLdFYQrmYCFpvsjLxEvpaYQ2ql14+Tij6moSG7iMvS9esjbMH6PsH4SHQS4Lu0NcIOyE5qAufK2O+X7OCKoamArsgOYihBSfYlAYO0AveApJexihtzCXBhZTPRnKl4Aj7pnr8wCVHWHuH1KPks+IqNBXYaadu5OizOO3ANi9OsOYAWuUMnJpc1FfOiKnAalSvS4IUNbkoLz6XBKy6I9dS89lLuZZMNN6pt1x9VifaWU6w7ViGK6xFp4ThQ/TEEfaWAVLa4l0eaJWwfmAq8R2neMDVwmacRcmzm4KqYTOht/9YvMhu8Uqg2czsXdAkYUuhScOehWYBmwvNCjZDW/OD3TvLYgt7oLV5wqZOOFjDImj1L2CbNWtWhf0KMAATVsmYzGQdCgAAAABJRU5ErkJggg==') no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAz5JREFUeNrsmsuR2zAMQGVvA84tR6UD55Zb5A7kCixVsNkKdl2B04HVQbQVWB2sStAxR19zSsAMmEEYkPpTREaYwchDi7KeAAIgrChaZZVVJMtG0s0mSbKDQwoak+E7aAVS/zfACHoBzRynVaBnRe661oMA2D0c3kA/keEGtEbrvscxZfUsjuNN0zSVSAsj7A10h0MFWrExrP8F9JGcp855EQXMwOYAUTjOVxb+BrrHoQPn3htpsPBdSqBqGC8N6Decp3gPwQPbYNF1lQUTY0qN1rzjfOXKz/jdRzN6bwW5MYW9o0Zo7Ru5zFd6SfM3tkLceE9uvoDxd0oxiP2GRleP0NLaqrsggRnYsxGg0j/Jtqpy4zO1NC1GWNkGCKvkEcdtRUibxEECW/KsdsUbgS7JtAuZfyVzaxKpY1KghAFsWbPKRXMCfUHXrbF0VJLB3J9KSalZkfT0TH6mDAKYga30msVjjtZ5JdOOBNqsoY943Yw8hEKnqkXzsGXN6hvMO87XQazUeRZhryRofVgcmIF9Aj2RCNsJmrmuCXuwbRe3C69ZVSQcSN7MMBDNAusNmIFtdEBBtzOh93PAegG2rNkY086OgW5chcMY2NnXMOfGoJ9JJP2r8J/Ljb1Y2FYbY1AqSDkY+4KdDdiRemgNnONDqH3BzuLSDOy9a9dibtjJLWxZswcShK5444vATmphrqjAPMt9d6StGV+wk1nYsmZPJO3UhqVPS8BOAsxtBGjrhYE+o3qHVfIw9ZqFm3qKQRBYNcl/6MY4HL+rz+q4BOwoC3Obd7LFo7m2WSpATRa0HHl2cNrxATvIwlzDbWza8QXbG9iyZl/G5lpfsL2AW9oyZtq5hAjbGdiyZhO6WWegg4PtFLRCaMt4s3DXtowUWCewZddTGx2KM1pcBKzVpR15dtQNLg3LAlu2eNHYGw0B1ubSqVkukn8Doujf/33EwNqAS5JaMl1EMNCpNFgWmMmnVwP6iA+llAbrzMN936KRANtaeAyFDhV2aKXV9r5UsLCd98NdoUOH7dUAaIOWANu74+F4aUwE7KAWj+VFlEwC7NQ9reBhBwMz0CJgRwETaFVilhJgV1llFfnyS4ABAKXkiMJDSwd6AAAAAElFTkSuQmCC') no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonLengthSelected = styled(ToolButtonLength)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAz5JREFUeNrsmsuR2zAMQGVvA84tR6UD55Zb5A7kCixVsNkKdl2B04HVQbQVWB2sStAxR19zSsAMmEEYkPpTREaYwchDi7KeAAIgrChaZZVVJMtG0s0mSbKDQwoak+E7aAVS/zfACHoBzRynVaBnRe661oMA2D0c3kA/keEGtEbrvscxZfUsjuNN0zSVSAsj7A10h0MFWrExrP8F9JGcp855EQXMwOYAUTjOVxb+BrrHoQPn3htpsPBdSqBqGC8N6Decp3gPwQPbYNF1lQUTY0qN1rzjfOXKz/jdRzN6bwW5MYW9o0Zo7Ru5zFd6SfM3tkLceE9uvoDxd0oxiP2GRleP0NLaqrsggRnYsxGg0j/Jtqpy4zO1NC1GWNkGCKvkEcdtRUibxEECW/KsdsUbgS7JtAuZfyVzaxKpY1KghAFsWbPKRXMCfUHXrbF0VJLB3J9KSalZkfT0TH6mDAKYga30msVjjtZ5JdOOBNqsoY943Yw8hEKnqkXzsGXN6hvMO87XQazUeRZhryRofVgcmIF9Aj2RCNsJmrmuCXuwbRe3C69ZVSQcSN7MMBDNAusNmIFtdEBBtzOh93PAegG2rNkY086OgW5chcMY2NnXMOfGoJ9JJP2r8J/Ljb1Y2FYbY1AqSDkY+4KdDdiRemgNnONDqH3BzuLSDOy9a9dibtjJLWxZswcShK5444vATmphrqjAPMt9d6StGV+wk1nYsmZPJO3UhqVPS8BOAsxtBGjrhYE+o3qHVfIw9ZqFm3qKQRBYNcl/6MY4HL+rz+q4BOwoC3Obd7LFo7m2WSpATRa0HHl2cNrxATvIwlzDbWza8QXbG9iyZl/G5lpfsL2AW9oyZtq5hAjbGdiyZhO6WWegg4PtFLRCaMt4s3DXtowUWCewZddTGx2KM1pcBKzVpR15dtQNLg3LAlu2eNHYGw0B1ubSqVkukn8Doujf/33EwNqAS5JaMl1EMNCpNFgWmMmnVwP6iA+llAbrzMN936KRANtaeAyFDhV2aKXV9r5UsLCd98NdoUOH7dUAaIOWANu74+F4aUwE7KAWj+VFlEwC7NQ9reBhBwMz0CJgRwETaFVilhJgV1llFfnyS4ABAKXkiMJDSwd6AAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonArea = styled(ToolButton)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAg9JREFUeNrsWu1tgzAQxaj/227ACHSCMgIjMEIzQdmgI5BMQDYgG0AmSDIBbODeqUdl8WEa6iBj7kknEB/Gzz6/sw97HoPBYDBWCCnlC1guf1CDpa4TzmQfydp5+Zp78cC1wGXC162N4bjjzjiOA9dJh0S2RBHbSk8jClf4+FsLt0zYdYi/jGEKUYfOrZMQ4uSqaA3Bzammayr9ZHljf8AB4/8eho+RmZ9vMVkcMu9gDZgxD7NZpbFHd2DHzYxhWpOXJpeltsfhnMLffmnRwpaOui5nSkg0ghXROXrYDr5XrSIOY2PROzm5aIsCl5xKKglxoecDOrZmZLW2yEyLvKPVARShMylwpAgUlv8Mhj3bQNmvq514qD3cEaSargfK9TaXFrqweDj/upYQGF8rOle14NbqBq+WmDATZsJzJx7hgFIfTM6AOAHACQAew0yYCTNhjsP2JAA4Di/cw4MJAJ54bEG0KJuR6rZD0P1oqgzN/WCqjMV6mCoiJwjJCUIp5c50DWJENzgsdVo2oVN0qXCRvPA8L8T8F9YVj0ddPX2dm8EhawmDlY/KJP6TLNbtAvYF9kn1jMeeF5qCLl5/593V629YC8iwVZuR4qKRd7tljIU67Llw4vsqKujlt3sJ196DUqUL4P5EvqK+KiILXToZqGc2t7CU/v8UunFhAelU+YuRb2bXIIPBYDiHbwEGAIdOaSiCe5W6AAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAoBJREFUeNrsWsF1wjAMNZRDb0038Ah0goYN6Ab02FuZAJiAxwTABKS33poNSCcg3SDH3lrpVbxnUtskrQHHkd7Ty8NJjL4tfctyhGBhYWFh8Vc6phtxHEdwWYIOQQvQRZqm06YD7lruzQksCoKfwCCMQgY81LTJkAHnIcawDfCs9BvjeBUsaRFx9eGyBc1AB0BaRfA0DqC/QN/a4NKibTHMgIPOtNQYpiVqXbqVojQNcK/ic5hwTDTtwQLGyRyE4NI9n42DcHqmPH4FA+4k8+t6DBZ3ZveU4TnLA3xmaZzRMWjSimUJXHhFs7vR5PXBrsMbIkxnm5aq63BG7nXgcq6IxEJYc2XpG8P/Zedi6b6GONDNphWNj+n9hNb0vrKOP4rD6kpObQkNtNP9ea8GgawdJB1DAvJCDIwDsaP+cQBvQHFmNzCbt6coQlQG7KiAl0A/DzTrEYGNaK+dK+0j3Iu7cOFLk9a7wsLF3mVLXPBB14h3SwyYATPgP6/DmkLe2mUG5FvFQyezJp41ta4AwKTFgBkwAw6SpSPa056tAHDxxOM/BYAmAnZVAGgO4BC+4KkD2JZ6YmyjGk8HqKhuPHzb92EaVLgt4TISDg7wXLA0GosHbdLyzISeO9aHSWSFPnhZqu3Syodo8lRFNReyL/yJnzpYYrOza+kE42mpuNSWvurxDSzahtXPObk92jmsvR+Gl3aauMzF71qxJMVRLSwxqnu33IeJkCLKBWz/r0oGs3xX16Uji2Gm5EQcIR5ZgQD/24ewPWMDvNAw58C37zqIZ5alZuMR65Ux08jzVErZUVwZD7NefYthsDMjO9HDrgnsE7R/ChYWFhaWhsm3AAMAEsjbVNqRBcUAAAAASUVORK5CYII=') no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonAreaSelected = styled(ToolButtonArea)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAoBJREFUeNrsWsF1wjAMNZRDb0038Ah0goYN6Ab02FuZAJiAxwTABKS33poNSCcg3SDH3lrpVbxnUtskrQHHkd7Ty8NJjL4tfctyhGBhYWFh8Vc6phtxHEdwWYIOQQvQRZqm06YD7lruzQksCoKfwCCMQgY81LTJkAHnIcawDfCs9BvjeBUsaRFx9eGyBc1AB0BaRfA0DqC/QN/a4NKibTHMgIPOtNQYpiVqXbqVojQNcK/ic5hwTDTtwQLGyRyE4NI9n42DcHqmPH4FA+4k8+t6DBZ3ZveU4TnLA3xmaZzRMWjSimUJXHhFs7vR5PXBrsMbIkxnm5aq63BG7nXgcq6IxEJYc2XpG8P/Zedi6b6GONDNphWNj+n9hNb0vrKOP4rD6kpObQkNtNP9ea8GgawdJB1DAvJCDIwDsaP+cQBvQHFmNzCbt6coQlQG7KiAl0A/DzTrEYGNaK+dK+0j3Iu7cOFLk9a7wsLF3mVLXPBB14h3SwyYATPgP6/DmkLe2mUG5FvFQyezJp41ta4AwKTFgBkwAw6SpSPa056tAHDxxOM/BYAmAnZVAGgO4BC+4KkD2JZ6YmyjGk8HqKhuPHzb92EaVLgt4TISDg7wXLA0GosHbdLyzISeO9aHSWSFPnhZqu3Syodo8lRFNReyL/yJnzpYYrOza+kE42mpuNSWvurxDSzahtXPObk92jmsvR+Gl3aauMzF71qxJMVRLSwxqnu33IeJkCLKBWz/r0oGs3xX16Uji2Gm5EQcIR5ZgQD/24ewPWMDvNAw58C37zqIZ5alZuMR65Ux08jzVErZUVwZD7NefYthsDMjO9HDrgnsE7R/ChYWFhaWhsm3AAMAEsjbVNqRBcUAAAAASUVORK5CYII=') no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

const ToolButtonEllipse = styled(ToolButton)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAfRJREFUeNrsWottgzAQBSbwCN4gbFBGYIRs0IyQTpAR6AZRJiCdgGQC2IBuQI/qIp0cO4UEF3/uSSdLCH+e72P77CRhMBgMBoOxFlLbHQzDkEMhQIo/fj3/DihNz14RBoIlFG8g+QSSJlxwAr7GEibh2ykzAZIFSAXSD3ZwxIlcV8MwiC0U76hNnZZGuWLZgaY6QzsC25AgG7QMXZtj/Q9o53MNjTYaTdTjJIDIBfoQ2NZR00+7lManDEIdQI/mLC32K0H2GpeprfU7RlucWYoKzfG/LEtoiPeLaxtNi6LB5WatIClRuxQ7W2QPDq0OO9Xilia7dW3nhAGUmvj+FZ91mqwy1v7psWJwaH0gq2iaBjI5p/LBRZ+d6dP1M6bc+HYaUqJ3OaVCRSoUHhKWdEc25+c68RSTlab4QOkxYTlpbSb23/qe2SCHm55+z5T/Cpp98BwnLAVdojIlFXPDNQDCVGlSp2GhHN59x0VjuXcmHQxMebBgCZsQLGFTYoISpiaQB8A51wWwjNg8dfJNAITpDquLduMR/dYyrsNDdMfDKBMAWCmeFM9t0Y4qiacx7bDTtKSheBLxD0iHe9XygHS4l2mKn8RxXap0GMeFuCZQePnkgR+1vKBxm8+WKieeLRnIO/0wLbqnhwwGg8FgMNbDjwADALLXUixq0xByAAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #404040;

    &: hover {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAIAAAC1nk4lAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAxZJREFUeNrsmq+z4jAQx2nuDBYsBgECARIsBgGyWCwIDH8KFgQGCxIkWJAwg8JiwWIq7jtv5/Z6adoeff2R3mRF5715bfLJN7ubTfKs2+1WyJuJQg7NQBtoA22go9nPuBp6PB7v9/t+vyv/WqvV+Jkx9OVyASVw/Vi9VqlUal9Wr9eLxWK0fq0IKyIQT6cTiCHtd8bcarXa7TaeyUKD9Xg8QlpJPLZSqVQul6WvMDZ88nw+aU6kz/F+v9/vdDrxQ6OzzWbj7g9TjJ7w9FIGG8aAWbper3i60W3b/kfVw6HRx3q95g7giGga2nzK6jVofz6fD4cDuxkkGI1GoS2HQEPa5XKJ1ulXSDscDiMHkJ8ocDlGR+PgDpY8CBoeDI3ZcdEWngmlXuiCvjgLQZput/sxtJsY36OVFFYNSI7I4VmFTMrXfkyn02BifNnr9dJZ6qrVKvI34sdxHHimZVnK9Ugo/dhN/FEy+r6BcjabUdjsdjvIFw6NaEDkZUXM8TOZTOhneAunAV9oDI5egh9nQsx6UxRRwg2ChmMgFGis6URegEE1cmikFPcyJEMTMWUcHUpQzh7b7VYNDa8gr6cqTAdoLI3komBzF5J/oFEM8LzoU++jXuAsrIAmv8HgItSKiYpNy7DbrYW7jotxcxGjkYhII5z7BOcNzpG6QbOOr9frL2guDjWEZiSOxRzsxr2VsDn3SMa822chTYG069TBGIkjUkjOriE0xx+2+rJ7cHWiGzQtK/AF3vAKKYcjgUslVbZGpyWMJ0M3m02p1tPB9vs9bxkV0FxS3b9ME5mpTgKbu74QUt3NmxwdoHnPYtu2b55GDiFuuFHm3PBSruGkwlNeXAaDAQUpvlHuhFNLc6QaHTiFrIh4aTwe8+xkwo15XiwWvPHzHu0JZVXFg0ufGxrP53NaujHtyhMB9QkTuDE+2oDhiSYajUY6frxarRzHKfw+7FS+9n8dQLJ75eyolxvN2aG6lINyc30heXmeLook1WO5kgMoqrTEr+S8lW5uLj/98kxq18yW+R8mA22gDbSB1tp+CTAATxc9jFvDRTgAAAAASUVORK5CYII=') no-repeat;
        background-size: contain;
        background-color: #d4d3d3;
    }
`

const ToolButtonEllipseSelected = styled(ToolButtonEllipse)`
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA5JJREFUeNrsmr9PGzEUx007hQFFYWU4BhhYyJityYIqlmZgRcBEOyHGTlX+AtohSwYIYqqE1LDQjVylDGFAIgyoEsshMXQhirLQgaHva9mRMee7QIE7B38l41xIDj5+P+7d8zHm5OTk5OTklJTGnvsPFIvFPE1ZvIz5qM9/kKwCJsAyTe9o5IeANOlULMAvsQa9VAETJMBWaJSFNZ9aDRq7BN5IFJg4V2naENa8o6mpqTsjl8uxycnJ0PPc3Nywq6srdn19zeeLiws+hyigUSHw+osCC4tu6aAzMzOsUCjw2QQ3rLAInU6HnZ2d8TkEfPMxFh97ICjcdUe4Llcmk2Hz8/NscXHxvyFNguWPj4/Z0dERXwgt0a0RePDkwCLb/qDhyfdgzaWlJQ79EgJss9nUwXsCuvFkwCJWd9T4XF5e5nMSgsX39vZ4rCuCi3+N++7bh8KWSiW2vr7OJiYmEisexsfHuXdhPj8/l2+/90hBEBw8GliHhVUXFhZSUzVNT0+z2dlZntRub2/xVp6YxwjafzCwiNmfKixWNW1Copybm2MnJycSukjQlwR9OjSwyMZNWUSkFVYK4QVrt9vtAQJBfyfoexXaG8M5vshsjJhNM6xaA+CKIZRVQzHSwsKV6zIbI0HZIlgZmbvb7eIQOaxDVv4dZ+EN+UJZMWuE8FO0FenSZF248ap0EQzbhCSmhKAnymCjhcvq9dZWocxVtBIF/EGuEupjW4X/X6kCy1HARenOtksxWFaE6l1gkZ0HtbLt0ozmhVk4O0rAGkMxrvCwXqZb1pEFNmlkgbXOSCjwoNA2NNCsksbg3wP2ff90lIC1bkhgcmk/5MNWSul09tQmnw7M2yPoGYW0Rq2R7G8LNaKS1uCX6A7aqsPDQ/Vw1wgsTF+Xbm2ja8O6Sucj0Dfnwi5L3+SL/f1964DRvlW0GdvxCILgj+d5KDML/X6fX8/QJLNBCMNWq6U4rP952MKjIlM5TqK4SKovQ4pH8t2IsM+Fdi3Jyn/Jytib/YhjbGhp95ipKzKq1aps00KfTBvrxr60cO1LeQOdVmhYFrBKKVmJ2nKJ3HlAM1uHTlNMI9y2t7dVy9YJdjPqO7F7Szo0HXNwtEST2l/CpadWq6kJimfksCSly22XxkC/ng1xDRwtk9F/5CEEfJW9hodaDBZ/zseWAHiQ+GNLBvjRfzBtiOyemkcPnZycnJycnJLTPwEGAITN2JvvbdtiAAAAAElFTkSuQmCC') no-repeat;
    background-size: contain;
    background-color: #FFFFFF;
`

export const TOOL_TYPE = "TOOL_TPYE";
export const TOOL_MEMO = "TOOL_MEMO";

export enum Tools {
    None = "None",
    Pencil = "LineString",
    Box = "Box",
    Polygon = "Polygon",
    Length = "Length",
    Area = "Area",
    Ellipse = "Ellipse"
}

export interface ToolOption {
    pencil?: boolean;
    box?: boolean;
    polygon?: boolean;
    length?: boolean;
    area?: boolean;
    ellipse?: boolean;
}

enum Mode {
    Draw,
    Select
}

export interface ToolNavigatorProps {
    option?: ToolOption;
    lengthFormat?: (length:number) => string;
    areaFormat?: (area: number) => string;
    labelInfo?: LabelInfo[];
};

export interface ToolContext {
    drawerMap: Map<Tools, BasicDrawer>;
    removeModify: Modify;
    snap: Snap;
    source: Vector<Geometry>;
    layer: VectorLayer<Vector<Geometry>>;
    translate: Translate;
    select: Select;
    toolType: Tools;
}

const DELETE_CATCHED = "DELETE_CATCHED";
const defaultLengthFormat = (line:number) => {return line + " px"};
const defaultAreaFormat = (area:number) => {return area + " px\xB2"}

function ToolNavigator({ option, lengthFormat, areaFormat, labelInfo }: ToolNavigatorProps) {
    const { map, isLoaded } = useContext(MapContext) as MapObject;
    const { labelList, selectedFeatures, setSelectedFeatures, addLabel, removeLabel } = useContext(LabelContext) as LabelContextObject;
    const context = useRef({drawerMap: new Map<Tools, BasicDrawer>(), toolType: Tools.None} as ToolContext);
    const [toolType, setToolType] = useState(Tools.None);
    const [toolMode, setToolMode] = useState(Mode.Draw);

    if (!option) {
        option = defaultOption;
    }

    function createDrawers(source: Vector<Geometry>, select: Select) {
        const {drawerMap} = context.current;
        drawerMap.set(Tools.None, new NoneDrawer());

        let areaDrawer = new AreaDrawer();
        areaDrawer.setFormatArea(areaFormat || defaultAreaFormat);
        drawerMap.set(Tools.Area, areaDrawer);

        drawerMap.set(Tools.Box, new BoxDrawer());

        let lengthDrawer = new LengthDrawer();
        lengthDrawer.setFormatLength(lengthFormat || defaultLengthFormat);
        drawerMap.set(Tools.Length, lengthDrawer);

        drawerMap.set(Tools.Pencil, new PencilDrawer());
        drawerMap.set(Tools.Polygon, new PolygonDrawer());
        drawerMap.set(Tools.Ellipse, new EllipseDrawer());

        drawerMap.forEach((value, key) => {
            let draw = value.createDraw(source);

            draw.on('drawend', function (evt: DrawEvent) {
                let feature = evt.feature as Feature
                
                feature.set(TOOL_TYPE, context.current.toolType);
                feature.setId(uuidv4());
                addLabel(evt.feature);
            });
            value.createModify(select);
        });
    }

    function getDrawer(source: Vector<Geometry>, select: Select) : BasicDrawer | undefined {
        return context.current.drawerMap.get(toolType);
    }

    function createSnap(source: Vector<Geometry>): Snap {
        return new Snap({ source: source });
    }

    const load = () => {
        if (labelInfo) {
            const {source, drawerMap} = context.current;
            let list = [] as LabelObject[];
            for (let i = 0; i < labelInfo.length; i++) {
                let item = labelInfo[i];
                let drawer = drawerMap.get(item.toolType as Tools);
                if (drawer) {
                    let feature = drawer.createFeature(item.location, item.memo);

                    source.addFeature(feature);
                    addLabel(feature, item.name);
                }
            }
        }
    }

    useEffect(() => {
        if (map && isLoaded) {
            const {drawerMap} = context.current;
            if (!context.current.layer) {

                let source = new Vector();
                let layer = new VectorLayer({
                    source: source,
                    style: (feature) => {
                        let type = feature.get(TOOL_TYPE);
                        let drawer = drawerMap.get(type);

                        return drawer.getVectorStyle(feature, type == Tools.Length ? (lengthFormat || defaultLengthFormat) : (areaFormat || defaultAreaFormat));
                    }
                });

                let select = new Select({
                    style: function (feature: Feature) {
                        let type = feature.get(TOOL_TYPE);
                        let drawer = drawerMap.get(type);
                        return drawer.getSelectStyle(feature);
                    }
                });

                select.setActive(false);
                select.on('select', function (e: any) {
                    const {drawerMap} = context.current;
                    let featureList = [] as Feature[];
                    let list = e.target.getFeatures().getArray() as Feature[];
                    for (let i = 0; i < list.length; i++) {
                        for (let j = 0; j < labelList.length; j++) {

                            if (labelList[j].feature == list[i]) {
                                featureList.push(labelList[j].feature);
                            }
                        }
                    }

                    let key;
                    if (featureList.length == 1) {
                        key = featureList[0].get(TOOL_TYPE);
                    } else {
                        key = Tools.None;
                    }

                    let map = drawerMap.get(key);
                    if (map)
                        map.activeModify(context.current);

                    if (setSelectedFeatures) {
                        setSelectedFeatures(featureList);
                    }
                });

                let removeModify = new Modify({features: select.getFeatures()});
                removeModify.on("change:active", function(e:any) {
                    if (context.current) {
                        const {select, source} = context.current;

                        let selected = select.getFeatures();
                        let array = selected.getArray();
                        for (let i = 0 ;i<array.length;i++) {
                            removeLabel(array[i]);
                            source.removeFeature(array[i]);
                        }
                    }
                });
                //removeModify.setActive(false);

                let translate = new Translate({
                    condition: function (event) {
                        return primaryAction(event) && platformModifierKeyOnly(event);
                    },
                    features: select.getFeatures()
                });

                map.addLayer(layer);
                map.addInteraction(select);

                translate.setActive(false);
                let snap = createSnap(source);
                snap.setActive(false);

                createDrawers(source, select);

                map.addInteraction(removeModify);

                context.current.drawerMap.forEach((value, key) => {
                    if (key != Tools.None)
                        map.addInteraction(value.getModify());
                });

                map.addInteraction(translate);

                context.current.drawerMap.forEach((value, key) => {
                    map.addInteraction(value.getDraw());
                });

                map.addInteraction(snap);

                var keydown = function(evt: KeyboardEvent){
                    var key = evt.key;
                    if (key == "Backspace" || key == "Delete"){
                        const {removeModify} = context.current;
                        removeModify.setActive(!removeModify.getActive());
                    }
                };

                document.addEventListener('keydown', keydown, false);

                let mapTmp = context.current.drawerMap.get(toolType);
                if (mapTmp) {

                    mapTmp.activeDraw(context.current);
                    mapTmp.activeModify(context.current);
                }

                context.current = {
                    ...context.current,
                    removeModify,
                    translate,
                    snap,
                    source,
                    layer,
                    select
                }

                load();
            }
        }
    }, [isLoaded]);

    useEffect(() => {
        if (context.current && map) {
            const { snap, source, select } = context.current;

            if (selectedFeatures && setSelectedFeatures)
                setSelectedFeatures(undefined);

            select.getFeatures().clear();
            map.removeInteraction(snap);
            let drawer = getDrawer(source, select);
            if (drawer)
                drawer.activeDraw(context.current);
            let newSnap = createSnap(source);
            
            map.addInteraction(newSnap);
            context.current.snap = newSnap;
            context.current.toolType = toolType;
        }
    }, [toolType]);

    useEffect(() => {
        if (context.current && map) {
            const { select, translate, drawerMap} = context.current;

            if (selectedFeatures && setSelectedFeatures)
                setSelectedFeatures(undefined);
            select.getFeatures().clear();
            if (toolMode == Mode.Draw) {
                let mapType = drawerMap.get(toolType);
                if (mapType)
                    mapType.activeDraw(context.current);

                select.setActive(false);
                translate.setActive(false);
            } else {
                let mapNone = drawerMap.get(Tools.None);
                if (mapNone) {
                    mapNone.activeDraw(context.current);
                    mapNone.activeModify(context.current);
                }

                select.setActive(true);
                translate.setActive(true);
            }
        }
    }, [toolMode]);

    function onModeButtonClickListener(type: Mode) {
        setToolType(Tools.None);
        setToolMode(type);
    }

    function onToolButtonClickListener(type: Tools) {
        setToolMode(Mode.Draw);
        setToolType(type);
    }

    return (
        <ToolNavigatorStyled>
            <ToolModeSelecter>
                {
                    toolMode == Mode.Select ? <ToolButtonSelectModeSelected onClick={() => { onModeButtonClickListener(Mode.Select); }}></ToolButtonSelectModeSelected> :
                    <ToolButtonSelectMode onClick={() => { onModeButtonClickListener(Mode.Select); }}></ToolButtonSelectMode>
                }
            </ToolModeSelecter>
            <ToolButtonSelecter>
                {
                    option.pencil &&
                    (
                        toolType == Tools.Pencil ? <ToolButtonPencilSelected onClick={() => { onToolButtonClickListener(Tools.Pencil); }}></ToolButtonPencilSelected> :
                        <ToolButtonPencil onClick={() => { onToolButtonClickListener(Tools.Pencil); }}></ToolButtonPencil>
                    )
                }
                {
                    option.box &&
                    (
                        toolType == Tools.Box ? <ToolButtonBoxSelected onClick={() => { onToolButtonClickListener(Tools.Box); }}></ToolButtonBoxSelected> :
                        <ToolButtonBox onClick={() => { onToolButtonClickListener(Tools.Box); }}></ToolButtonBox>
                    )
                }
                {
                    option.polygon &&
                    (
                        toolType == Tools.Polygon ? <ToolButtonPolygonSelected onClick={() => { onToolButtonClickListener(Tools.Polygon); }}></ToolButtonPolygonSelected> :
                        <ToolButtonPolygon onClick={() => { onToolButtonClickListener(Tools.Polygon); }}></ToolButtonPolygon>
                    )
                }
                {
                    option.ellipse &&
                    (
                        toolType == Tools.Ellipse ? <ToolButtonEllipseSelected onClick={() => { onToolButtonClickListener(Tools.Area); }}></ToolButtonEllipseSelected> :
                        <ToolButtonEllipse onClick={() => { onToolButtonClickListener(Tools.Ellipse); }}></ToolButtonEllipse>
                    )
                }
                {
                    option.length &&
                    (
                        toolType == Tools.Length ? <ToolButtonLengthSelected onClick={() => { onToolButtonClickListener(Tools.Length); }}></ToolButtonLengthSelected> :
                        <ToolButtonLength onClick={() => { onToolButtonClickListener(Tools.Length); }}></ToolButtonLength>
                    )
                }
                {
                    option.area &&
                    (
                        toolType == Tools.Area ? <ToolButtonAreaSelected onClick={() => { onToolButtonClickListener(Tools.Area); }}></ToolButtonAreaSelected> :
                        <ToolButtonArea onClick={() => { onToolButtonClickListener(Tools.Area); }}></ToolButtonArea>
                    )
                }
            </ToolButtonSelecter>
        </ToolNavigatorStyled>
    );
}

const defaultOption: ToolOption = {
    pencil: false,
    box: true,
    polygon: true,
    length: true,
    area: true,
    ellipse: true
}

ToolNavigator.defaultProps = {
    option: defaultOption,
    lengthFormat: (line:number) => {return line + " px"},
    areaFormat: (area:number) => {return area + " px\xB2"}
};

export default ToolNavigator;