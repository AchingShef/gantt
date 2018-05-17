/// <amd-dependency path='gantt'>


module powerbi.extensibility.visual {
    import Selection = d3.Selection;
    import createLegend = powerbi.extensibility.utils.chart.legend.createLegend;
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import Legend = powerbi.extensibility.utils.chart.legend;
    import LegendData = powerbi.extensibility.utils.chart.legend.LegendData;
    import LegendIcon = powerbi.extensibility.utils.chart.legend.LegendIcon;
    import LegendPosition = powerbi.extensibility.utils.chart.legend.LegendPosition;
    import LegendDataPoint = powerbi.extensibility.utils.chart.legend.LegendDataPoint;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import appendClearCatcher = powerbi.extensibility.utils.interactivity.appendClearCatcher;

    /**
     * 
     * 
     * @interface IGanttChartStates
     */
    interface IGanttChartStates {
        category: string;
        color: string;
        selectionId: ISelectionId;
    };

    /**
     * 
     * 
     * @interface ITask
     */
    interface ITask {
        startDate: any;
        endDate: any;
        taskName: string;
        state: string;
        color: string;
        identity: ISelectionId;
        selected: boolean;
    }

    /**
     * 
     * 
     * @interface ILegendSettings
     */
    interface ILegendSettings {
        show: boolean;
        position: string;
        showTitle: boolean;
        titleText: string;
        labelColor: string;
        fontSize: number;
    }

    /**
     * 
     * 
     * @interface SvgSize
     */
    interface SvgSize {
        width: number;
        height: number;
    }

    /**
     * 
     * 
     * @interface Axis
     */
    interface Axis {
        selection: Selection<any>;
        scale: any;
        axis: d3.svg.Axis;
    }

    /**
     * 
     * 
     * @export
     * @interface BehaviorOptions
     */
    export interface BehaviorOptions {
        clearCatcher: Selection<any>;
        taskSelection: Selection<any>;
        legendSelection: Selection<any>;
        interactivityService: IInteractivityService;
    }

    /**
     * 
     * 
     * @export
     * @class Visual
     * @implements {IVisual}
     */
    export class Visual implements IVisual {
        private gantt: any;
        private element: HTMLElement;
        private host: IVisualHost;
        private selectionManager: ISelectionManager;
        private ganttChartStates: IGanttChartStates[];
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private legend: ILegend;
        private settings: IGanttSettings;
        private interactivityService: IInteractivityService;
        private clearCatcher: Selection<any>;
        private body: Selection<any>;
        private ganttDiv: Selection<any>;
        private ganttSvg: Selection<any>;
        private taskGroup: Selection<any>;
        private xAxis: Axis;
        private yAxis: Axis;
        private behavior: Behavior;
        private tempTasks: any;

        /**
         * Creates an instance of Visual.
         * 
         * @param {VisualConstructorOptions} options
         * 
         * @memberOf Visual
         */
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = this.host.createSelectionManager();
            this.element = options.element;
            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, this.element);
            this.behavior = new Behavior();
            this.interactivityService = createInteractivityService(this.host);
            this.settings = GanttSettings.settings;
            this.xAxis = <Axis>{};
            this.yAxis = <Axis>{};

            this.createViewport($(this.element));
            // this.addButton();
        }

        /**
         * Create viewport of Gantt Chart
         * 
         * @private
         * @param {JQuery} element
         * 
         * @memberOf Visual
         */
        private createViewport(element: JQuery): void {
            const selector = this.settings.chart.selector,
                margin = this.settings.chart.margin;

            this.body = d3.select(this.element);

            this.ganttDiv = this.body
                .append("div")
                .classed(selector.div, true);

            this.ganttSvg = this.ganttDiv.append("svg")
                .classed(selector.svg, true);

            this.clearCatcher = appendClearCatcher(this.ganttSvg);

            this.taskGroup = this.ganttSvg.append("g")
                .classed(selector.taskGroup, true)
                .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

            this.xAxis.selection = this.taskGroup.append("g")
                .classed(selector.xAxis, true);

            this.yAxis.selection = this.taskGroup.append("g")
                .classed(selector.yAxis, true);

            this.legend = createLegend(element, false, this.interactivityService, true, LegendPosition[this.settings.legend.position]);
        }

        /**
         * Clear viewport
         * 
         * @private
         * 
         * @memberOf Visual
         */
        private clearViewport(): void {
            const selector = this.settings.chart.selector;

            this.body.selectAll(`.${selector.legendItems}`)
                .remove();

            this.body.selectAll(`.${selector.legendTitle}`)
                .remove();

            this.taskGroup.selectAll(`.${selector.task}`).remove();
            this.xAxis.selection.selectAll("*").remove();
            this.yAxis.selection.selectAll("*").remove();
        }

        /**
         * Resize Viewport
         * 
         * @private
         * @param {IViewport} viewport
         * @param {ITask[]} tasks
         * 
         * @memberOf Visual
         */
        private resizeViewport(viewport: IViewport, tasks: ITask[]): void {
            const margin = this.settings.chart.margin,
                timeDomain = Visual.getTimeDomain(tasks),
                svgSize = this.calculateSvgSize(tasks, timeDomain);

            // this.ganttDiv.attr("width", viewport.width)
            //     .attr("height", viewport.height);

            this.ganttSvg.attr("width", svgSize.width)
                .attr("height", svgSize.height + margin.top + margin.bottom);
        }

        /**
         * Render axis of Gantt Chart
         * 
         * @private
         * @param {ITask[]} tasks
         * 
         * @memberOf Visual
         */
        private renderAxis(tasks: ITask[]): void {
            const settings = this.settings.chart, 
                timeDomain = Visual.getTimeDomain(tasks),
                svgSize = this.calculateSvgSize(tasks, timeDomain);

            this.xAxis.scale = this.calculateXScale(tasks, timeDomain, svgSize.width);
            this.xAxis.axis = this.calculateXAxis(this.xAxis.scale, timeDomain);

            this.xAxis.selection.call(this.xAxis.axis);
            this.setAxisFontSize(this.xAxis.selection, settings.xAxis.font.size);

            this.yAxis.scale = this.calculateYscale(tasks, svgSize.height);
            this.yAxis.axis = this.calculateYAxis(this.yAxis.scale, tasks);

            this.yAxis.selection.call(this.yAxis.axis);
            this.setAxisFontSize(this.yAxis.selection, settings.yAxis.font.size);
        }

        /**
         * Transform rects(tasks)
         * 
         * @private
         * @param {ITask} d
         * @param {number} index
         * @returns {string}
         * 
         * @memberOf Visual
         */
        private rectTransform(d: ITask, index: number): string {
            return `translate(${this.xAxis.scale(d.startDate)}, ${this.yAxis.scale(index)})`;
        }

        /**
         * Return name
         * 
         * @private
         * @param {ITask} d
         * @returns {string}
         * 
         * @memberOf Visual
         */
        private keyFunction(d: ITask): string {
            return d.startDate + d.taskName + d.state + d.endDate;
        }

        /**
         * Render rects(tasks)
         * 
         * @private
         * @param {ITask[]} tasks
         * 
         * @memberOf Visual
         */
        private renderTasks(tasks: ITask[]): void {
            const rectRadius = 5,
                yOffset = 0;

            this.taskGroup
                .selectAll(`.${this.settings.chart.selector.svg}`)
                .data(tasks, this.keyFunction).enter()
                .append("rect")
                .classed(this.settings.chart.selector.task, true)
                .attr("rx", rectRadius)
                .attr("ry", rectRadius)
                .attr("fill", (d: ITask) => d.color)
                .attr("y", yOffset)
                .attr("transform", (d: ITask, index: number) => this.rectTransform(d, index))
                .attr("height", (d: ITask) => this.yAxis.scale.rangeBand())
                .attr("width", (d: ITask) => Math.max(1, (this.xAxis.scale(d.endDate) - this.xAxis.scale(d.startDate))));
        }

        /**
         * Calculate x scale
         * 
         * @private
         * @param {ITask[]} tasks
         * @param {number[]} timeDomain
         * @param {number} width
         * @returns {*}
         * 
         * @memberOf Visual
         */
        private calculateXScale(tasks: ITask[], timeDomain: number[], width: number): any {
            const margin = this.settings.chart.margin,
                scale = d3.scale.linear()
                    .domain(timeDomain)
                    .range([0, width - margin.left - margin.right]);

            return scale;
        }

        /**
         * Calculate y scale
         * 
         * @private
         * @param {ITask[]} tasks
         * @param {number} height
         * @returns {*}
         * 
         * @memberOf Visual
         */
        private calculateYscale(tasks: ITask[], height: number): any {
            const padding = this.settings.chart.yAxis.padding,
                outerPadding = this.settings.chart.yAxis.outerPadding,
                scale = d3.scale.ordinal<number, string>()
                    .domain(d3.range(0, tasks.length))
                    .rangeRoundBands([0, height], padding, outerPadding);

            return scale;
        }

        /**
         * Set font style for axis
         * 
         * @private
         * @param {Selection<any>} axis
         * 
         * @memberOf Visual
         */
        private setAxisFontSize(axis: Selection<any>, size: string): void {
            axis.selectAll("text").style("font-size", size);
        }

        /**
         * Calculate x axis
         * 
         * @private
         * @param {*} xScale
         * @param {number[]} timeDomain
         * @returns {d3.svg.Axis}
         * 
         * @memberOf Visual
         */
        private calculateXAxis(xScale: any, timeDomain: number[]): d3.svg.Axis {
            const minutesPerHour = 60,
                xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("top")
                    .tickValues(d3.range(timeDomain[0], timeDomain[1], minutesPerHour))
                    .tickFormat(d => {
                        const day = Visual.calculateDayFromMinutes(d);
                        let value: string;

                        if (day % 1 !== 0) {
                            value = Visual.calculateHourForDayFromMinutes(d, Math.floor(day)).toString();
                        } else {
                            // Get hours in following days
                            value = day + 1 + " day";
                        }

                        return value;
                    });


            return xAxis;
        }

        /**
         * Calculate y axis
         * 
         * @private
         * @param {*} yScale
         * @param {ITask[]} tasks
         * @returns {d3.svg.Axis}
         * 
         * @memberOf Visual
         */
        private calculateYAxis(yScale: any, tasks: ITask[]): d3.svg.Axis {
            const yAxis = d3.svg.axis()
                .scale(yScale)
                .tickFormat((i) => tasks[i].state)
                .orient("left")
                .tickSize(this.settings.chart.yAxis.tick.size);

            return yAxis;
        }

        /**
         * Calculate svg element size
         * 
         * @private
         * @param {ITask[]} tasks
         * @param {number[]} timeDomain
         * @returns {SvgSize}
         * 
         * @memberOf Visual
         */
        private calculateSvgSize(tasks: ITask[], timeDomain: number[]): SvgSize {
            const chart = this.settings.chart,
                minutesPerHour = 60;

            return {
                width: d3.range(timeDomain[0], timeDomain[1], minutesPerHour).length * chart.xAxis.tick.width,
                height: tasks.length * chart.yAxis.tick.height
            };
        }

        /**
         * Create tasks from mapping data
         * 
         * @private
         * @static
         * @param {DataView} dataView
         * @param {IVisualHost} host
         * @returns {ITask[]}
         * 
         * @memberOf Visual
         */
        private static createTasks(dataView: DataView, host: IVisualHost): ITask[] {
            const columnSource = dataView.table.columns,
                metadataColumns = getColumnSources(dataView),
                rows = dataView.table.rows,
                objects = dataView.metadata.objects,
                colorPalette = host.colorPalette;

            return <ITask[]>rows.map((child: DataViewTableRow, index: number) => {
                const taskName = getTaskProperty<string>(columnSource, child, "taskNames"),
                    defaultColor: Fill = {
                        solid: {
                            color: colorPalette.getColor(taskName).value
                        }
                    },
                    identityIdx: DataViewScopeIdentity = dataView.categorical.categories[0].identity[index],
                    categoryColumn: DataViewCategoryColumn = {
                        source: {
                            displayName: null,
                            queryName: metadataColumns.taskNames.queryName
                        },
                        values: null,
                        identity: [identityIdx]
                    },
                    identity: ISelectionId = host.createSelectionIdBuilder()
                        .withCategory(categoryColumn, 0)
                        .withMeasure(taskName)
                        .createSelectionId();

                return {
                    startDate: getTaskProperty(columnSource, child, "startDates"),
                    endDate: getTaskProperty(columnSource, child, "endDates"),
                    state: getTaskProperty(columnSource, child, "states"),
                    color: getValue<Fill>(objects, "colorSelector", "fill", defaultColor).solid.color,
                    selected: false,
                    taskName,
                    identity
                };
            });
        }

        /**
         * Create data for legend
         * 
         * @private
         * @static
         * @param {ITask[]} tasks
         * @param {DataView} dataView
         * @param {IVisualHost} host
         * @param {ILegendSettings} defaultSettings
         * @returns {LegendData}
         * 
         * @memberOf Visual
         */
        private static createLegendData(tasks: ITask[], dataView: DataView, host: IVisualHost, defaultSettings: ILegendSettings): LegendData {
            const metadataColumns = getColumnSources(dataView),
                title = metadataColumns.taskNames.displayName,
                data: LegendData = {
                    fontSize: defaultSettings.fontSize,
                    labelColor: defaultSettings.labelColor,
                    dataPoints: [],
                    title
                },
                temp = [];

            tasks.map((value, index, array) => {
                if (temp.indexOf(value.taskName) === -1) {
                    data.dataPoints.push({
                        icon: LegendIcon.Circle,
                        label: value.taskName,
                        selected: false,
                        color: value.color,
                        identity: host.createSelectionIdBuilder()
                            .withMeasure(value.taskName)
                            .createSelectionId()
                    });

                    temp.push(value.taskName);
                }
            });

            return data;
        }

        /**
         * Render legend
         * 
         * @private
         * @param {LegendData} data
         * @param {IViewport} viewport
         * 
         * @memberOf Visual
         */
        private renderLegend(data: LegendData, viewport: IViewport) {
            const settings = this.settings.legend,
                position: LegendPosition = settings.show
                    ? LegendPosition[settings.position]
                    : LegendPosition.None;

            this.legend.changeOrientation(position);
            this.legend.drawLegend(data, viewport);
            Legend.positionChartArea(this.ganttDiv, this.legend);

            switch (this.legend.getOrientation()) {
                case LegendPosition.Left:
                case LegendPosition.LeftCenter:
                case LegendPosition.Right:
                case LegendPosition.RightCenter:
                    viewport.width -= this.legend.getMargins().width;

                    break;
                case LegendPosition.Top:
                case LegendPosition.TopCenter:
                case LegendPosition.Bottom:
                case LegendPosition.BottomCenter:
                    viewport.height -= this.legend.getMargins().height;

                    break;
            }

            this.ganttDiv.style({
                height: PixelConverter.toString(viewport.height),
                width: PixelConverter.toString(viewport.width)
            });
        }

        /**
         * Calculate day and hour from minutes
         * 
         * @private
         * @static
         * @param {number} minutes
         * @returns {string}
         * 
         * @memberOf Visual
         */
        private static calculateDayAndHourFromMinutes(minutes: number): string {
            const day = Math.floor(Visual.calculateDayFromMinutes(minutes)),
                hour = Visual.calculateHourForDayFromMinutes(minutes, day);

            return (day + 1).toString() + " day " + hour.toString() + " hour";
        }

        /**
         * Calculate day from minutes
         * 
         * @private
         * @static
         * @param {number} minutes
         * @returns {number}
         * 
         * @memberOf Visual
         */
        private static calculateDayFromMinutes(minutes: number): number {
            const minutesPerDay = 1440;

            return minutes / minutesPerDay;
        }

        /**
         * Calculate hour for day from minutes
         * 
         * @private
         * @static
         * @param {number} minutes
         * @param {number} day
         * @returns {number}
         * 
         * @memberOf Visual
         */
        private static calculateHourForDayFromMinutes(minutes: number, day: number): number {
            const minutesPerHour = 60,
                hoursPerDay = 24;

            return Math.floor(minutes / minutesPerHour) - (hoursPerDay * day);
        }

        /**
         * Get min and max time values
         * 
         * @private
         * @static
         * @param {ITask[]} tasks
         * @returns {number[]}
         * 
         * @memberOf Visual
         */
        private static getTimeDomain(tasks: ITask[]): number[] {
            let timeDomainStart,
                timeDomainEnd;

            const copy = tasks.slice(),
                minutesPerHour = 60;

            copy.sort((a, b) => a.endDate - b.endDate);

            timeDomainEnd = copy[copy.length - 1].endDate;

            copy.sort((a, b) => a.startDate - b.startDate);

            timeDomainStart = copy[0].startDate;

            const timeDomainStartHours = timeDomainStart / minutesPerHour;

            if (timeDomainStartHours % 1 !== 0) {
                timeDomainStart = Math.floor(timeDomainStartHours) * minutesPerHour;
            }

            return [timeDomainStart, timeDomainEnd];
        }

        /**
         * Get data for tooltip
         * 
         * @private
         * @param {*} value
         * @param {DataView} dataView
         * @returns {VisualTooltipDataItem[]}
         * 
         * @memberOf Visual
         */
        private getTooltipData(value: any, dataView: DataView): VisualTooltipDataItem[] {
            const startDate = Number(value.startDate),
                endDate = Number(value.endDate),
                duration = endDate - startDate,
                metadataColumns = getColumnSources(dataView);

            return <VisualTooltipDataItem[]>[{
                displayName: `${metadataColumns["taskNames"].displayName}: `,
                value: value.taskName
            }, {
                displayName: `${metadataColumns["states"].displayName}: `,
                value: value.state
            }, {
                displayName: `${metadataColumns["startDates"].displayName}: `,
                value: startDate === 0 && "0" || Visual.calculateDayAndHourFromMinutes(startDate)
            }, {
                displayName: `${metadataColumns["endDates"].displayName}: `,
                value: endDate === 0 && "0" || Visual.calculateDayAndHourFromMinutes(endDate)
            }, {
                displayName: "duration",
                value: duration.toString() + " minutes"
            }];
        }

        /**
         * Add tooltip for tasks
         * 
         * @private
         * @param {DataView} dataView
         * 
         * @memberOf Visual
         */
        private addTooltip(dataView: DataView): void {
            const rects = this.ganttSvg.selectAll(`.${this.settings.chart.selector.task}`);

            this.tooltipServiceWrapper.addTooltip(rects,
                (tooltipEvent: TooltipEventArgs<number>) => this.getTooltipData(tooltipEvent.data, dataView),
                (tooltipEvent: TooltipEventArgs<number>) => null);
        }

        /**
         * Bind selection for tasks and legend
         * 
         * @private
         * @param {ITask[]} tasks
         * 
         * @memberOf Visual
         */
        private bindSelection(tasks: ITask[]) {
            const selector = this.settings.chart.selector,
                behaviorOptions: BehaviorOptions = {
                    clearCatcher: this.clearCatcher,
                    taskSelection: this.taskGroup.selectAll(`.${selector.task}`),
                    legendSelection: this.body.selectAll(`.${selector.legendItems}`),
                    interactivityService: this.interactivityService
                };

            this.interactivityService.bind(tasks, this.behavior, behaviorOptions);
        }

        // private preparePrint() {
        //     // this.body.select(".gantt-body").select("*").remove();
        //     //     // .attr("style", "display:none;");
        //     // this.body.select(".legend")
        //     //     .attr("style", "display:none;");

        //     var lists = Math.floor(this.tempTasks.length /10);
        //     var count = 0;
        //     var columns = Object.keys(this.tempTasks[0]);
        //     var doc = new window["jsPDF"]();

        //     for (let i = 0; i < lists; i += 1) {
        //         var list = this.tempTasks.slice(count, count + 10);
        //         var table = d3.select(document.createElement("table"))
        //         var thead = table.append("thead");
        //         var tbody = table.append("tbody");

        //         thead.append('tr')
        //             .selectAll('th')
        //             .data(columns)
        //             .enter()
        //             .append('th')
        //             .text((d: any, i) => {
        //                 return d;
        //             });

        //         var rows = tbody.selectAll('tr')
        //             .data(list)
        //             .enter()
        //             .append('tr');

        //         var cells = rows.selectAll('td')
        //         .data(function (row) {
        //             return columns.map(function (column) {
        //             return {
        //                 column: column, value: row[column]
        //             };
        //             });
        //         })
        //         .enter()
        //         .append('td')
        //             .text(function (d: any) { 
        //                 return d.value; 
        //             });
                

        //         count += 10;
        //         let start = 25
        //         list.forEach(element => {
        //             doc.text(35, start, `name: ${element.taskName}; state: ${element.state}`);
        //             start += 10;
        //         });

        //         if (i + 1 != lists) {
        //             doc.addPage();
        //         }
                
        //     }
            
        //     doc.save('a4.pdf');

            
            
            
            
            
        //     // window.print();
        // }

        // private addButton() {
        //     var div = this.body.select(".gantt-body")
        //         .append("div")
        //         .attr("style", "position:absolute;top:0px;width:40px;height:40px;border: 2px solid black; background: #eff0f1")
        //         .text("print")
        //         .on("click", (d, i) => {
        //             this.preparePrint();
        //         });
        // }

        /**
         * Update Visual
         * 
         * @param {VisualUpdateOptions} options
         * 
         * @memberOf Visual
         */
        public update(options: VisualUpdateOptions) {
            const dataView = options.dataViews[0];

            this.clearViewport();

            if (dataView && dataView.table && dataView.table.rows && dataView.categorical.categories.length === 4) {
                const objects = dataView.metadata.objects,
                    minutesPerHour = 60,
                    viewport = options.viewport,
                    tasks = Visual.createTasks(dataView, this.host);

                this.tempTasks = tasks;

                this.settings.legend = GanttSettings.parseLegendSettings(objects, this.host.colorPalette);

                const legendData = Visual.createLegendData(tasks, dataView, this.host, this.settings.legend);

                this.resizeViewport(viewport, tasks);
                this.renderAxis(tasks);
                this.renderTasks(tasks);
                this.renderLegend(legendData, viewport);
                this.addTooltip(dataView);
                this.bindSelection(tasks);
            }
        }

        /**
         * Update object instance
         * 
         * @param {EnumerateVisualObjectInstancesOptions} options
         * @returns {VisualObjectInstanceEnumeration}
         * 
         * @memberOf Visual
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const objectName = options.objectName,
                objectEnumeration: VisualObjectInstance[] = [];

            switch (objectName) {
                case "legend": {
                    objectEnumeration.push({
                        objectName: "legend",
                        displayName: "Legend",
                        selector: null,
                        properties: {
                            show: this.settings.legend.show,
                            position: this.settings.legend.position,
                            showTitle: this.settings.legend.showTitle,
                            titleText: this.settings.legend.titleText,
                            labelColor: this.settings.legend.labelColor,
                            fontSize: this.settings.legend.fontSize
                        }
                    });

                    break;
                }
                // case "colorSelector":
                //     for (let state of this.ganttChartStates) {
                //         objectEnumeration.push({
                //             objectName,
                //             displayName: state.category,
                //             properties: {
                //                 fill: {
                //                     solid: {
                //                         color: state.color
                //                     }
                //                 }
                //             },
                //             selector: state.selectionId
                //         });
                //     }

                //     break;

            }

            return objectEnumeration;
        }

        /**
         * Destroy visaul
         * 
         * 
         * @memberOf Visual
         */
        public destroy(): void {

        }
    }
}