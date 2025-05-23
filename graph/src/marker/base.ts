import Plotly from "plotly.js";
import { ReactNode } from "react";

export default class BaseMode<T> {
    private title: string;
    private description: string;
    private icon?: string;
    protected gd: Plotly.PlotlyHTMLElement;
    protected value?: T;
    protected originData?: number[];

    constructor(title: string, description: string, icon?: string) {
        this.title = title;
        this.description = description;
        this.icon = icon;
    }

    // value to graph
    toGraph(gd: Plotly.PlotlyHTMLElement) { }

    click(gd: Plotly.PlotlyHTMLElement, evt: Plotly.PlotMouseEvent): void {}

    getValue(): T { return this.value }

    setValue(value: T) { this.value = value }

    getDescription() { return this.description }

    getTitle() { return this.title }

    getIcon() { return this.icon }

    setOriginData(originData: number[]) {
        this.originData = originData;
    }

    getOriginData() {
        return this.originData;
    }
}
