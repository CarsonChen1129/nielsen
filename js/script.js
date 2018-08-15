/**
 * @author: Jiajun Chen
 * @objective: This program reads data from csv file, and generate a bar chart.
 */

// Initialize the materializecss components.
M.AutoInit();

// ========= Step 1: Import and parse data ===========
// Check if the browser support CSV parser.
if (window.File && window.FileReader && window.FileList && window.Blob) {


    /**
     * A function to handle file input from selection.
     * @param event: selected event.
     */
    function handleFileSelect(event) {
        let files = event.target.files;
        handleParse(files[0]);
    }

    /**
     * A function to handle file input from drop.
     * @param event: dropped event.
     */
    function handleFileDrop(event) {
        event.stopPropagation();
        event.preventDefault();
        let files = event.dataTransfer.files;
        handleParse(files[0]);
    }

    /**
     * A function to handle the dragging action.
     * @param event: dragged event.
     */
    function handleDragOver(event) {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    let barChart;               // The graph object.
    let flag;                   // The column index that indicates the field for x-axis.
    let allData;                   // Parsed data

    /**
     * A function to parse csv file into an json object.
     * @param file: imported file.
     */
    function handleParse(file) {
        if (file.type === 'text/csv') {
            Papa.parse(file, {
                complete: function(results) {
                    flag = 0;
                    allData = results.data;
                    drawChart(0, results.data);
                },
                error: function(error, file, inputElem, reason) {
                    M.toast({html: reason});
                }
            })
        } else {
            M.toast({html: 'Sorry, currently we only support csv files. Please try another file.'});
        }
    }

    // Setup listeners to monitor file selection / drag & drop actions.
    let dropZone = document.getElementById('drop_zone');
    let fileButton = document.getElementById('data');

    fileButton.addEventListener('change', handleFileSelect, false);
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileDrop, false);


    // ======== Step 2: Draw bar chart ===========
    // A listener to receive "refresh" requests.
    document.getElementById("refresh").addEventListener("click", function(){
        drawChart(flag, allData);
    });

    /**
     * A function to randomly generate color hex codes.
     * @returns {string} color hex code.
     */
    function getColor() {
        return "#" + Math.random().toString(16).slice(2, 8).toUpperCase();
    }

    /**
     * A function to parse string into number.
     * @param data input data.
     * @returns {number} parsed number.
     */
    function getNumber(data) {
        return parseFloat(data);
    }

    /**
     * A function to loop over the data and find out the maximum number and minimum number.
     * @param flag index of the field for x-axis.
     * @param data input data.
     * @returns {string} a JSON object that includes max and min value.
     */
    function getMaxValue(flag, data) {
        let max = Number.MIN_VALUE;
        let min = Number.MAX_VALUE;
        for (let i = 1; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
                let num = getNumber(data[i][j]);
                // If it is not a number or if it does not belongs to the x-axis' field, compare the value with max & min.
                if (typeof num !== "NaN"  && j !== flag) {
                    if (num > max) {
                        max = Math.round(num);
                    }
                    if (num < min) {
                        min = Math.round(num);
                    }
                }
            }
        }
        return JSON.stringify({max: max, min: min});
    }

    /**
     * A function to transpose the data matrix from row-wise to column-wise.
     * @param flag index of the field for x-axis.
     * @param data input data.
     * @returns {string} a JSON object that includes category array and value array.
     */
    function getData (flag, data) {
        let cat = [];
        let values = [];
        let rowNum = data.length;
        let colNum = data[0].length;
        for (let i = 0; i < colNum; i++) {
            let val = [];
            for (let j = 0; j < rowNum; j++) {
                // If the value is not a number or its length is 0, then we should skip it.
                if (isNaN(data[j][i]) || data[j][i].length < 1) {
                    continue;
                }
                if (i === flag) {
                    cat.push(data[j][i]);
                } else {
                    let num = getNumber(data[j][i]);
                    val.push(num);
                }
            }
            if (val.length > 0) {
                values.push(val);
            }
        }
        return JSON.stringify({cats: cat, values: values});
    }

    /**
     * A function to initialize a BarChart object to draw bar chart.
     * @param flag index of the field for x-axis.
     * @param data input data.
     */
    function drawChart(flag, data) {
        let canvas = document.getElementById('data-canvas');
        
        // clean the canvas to draw new canvas, otherwise the canvas will overlap
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        
        let maxMin = JSON.parse(getMaxValue(flag, data));
        let values = JSON.parse(getData(flag,data));
        if (canvas && canvas.getContext) {
            barChart = new BarChart(canvas);
            barChart.maxval = maxMin.max;
            barChart.minval = maxMin.min;
            barChart.values = values.values;
            barChart.cats = values.cats;
            barChart.title = document.getElementById("graph-title").value;
            barChart.drawGraph();
        }
    }

    /**
     * An object that includes functions and attributes to draw bar chart.
     * @param canvas canvas.
     * @constructor
     */
    function BarChart(canvas) {
        this.barWidth = 0.80;
        this.xMargin = 40;
        this.yMargin = 30;
        this.cats = [];
        this.values = [];
        this.title = "";
        this.lineCol = "#000000";
        this.maxval = 0;
        this.minval = 0;

        let that = this;
        let ctx = canvas.getContext('2d');
        let canvasWidth = canvas.width;
        let canvasHeight = canvas.height;
        let elements = 0;
        let pitch = 0;
        let yAxisInt = 0;
        let yAxisPosticks = 0;
        let yAxisNegticks = 0;
        let yAxisTicks = 0;
        let xAxisYpos = 0;
        let barper = 100;

        /**
         * A function to initialize the graph and call other functions.
         */
        this.drawGraph = function() {
            let tw;
            //Setup
            elements = this.cats.length;
            //horizontal interval
            pitch = (canvasWidth - (2 * this.xMargin)) / elements;

            //Decide on Y-axis scale
            let range = this.maxval - this.minval;
            let absmax = this.maxval;
            if (Math.abs(this.minval) > this.maxval){
                absmax = Math.abs(this.minval);
            }
            let a = Math.ceil(absmax / 3);
            let b = a.toString().length;
            //If estimated interval has a string length of more than 1 then apply rounding to next lower power of 10
            if (b > 1) {
                a = parseInt(a / Math.pow(10, b - 1)) * Math.pow(10, b - 1);   
            }
            let posticks = Math.ceil(this.maxval / a);
            let negticks = Math.ceil(-this.minval / a);
            this.yAxisInt = a;
            this.yAxisPosticks = posticks;
            this.yAxisNegticks = negticks;
            this.yAxisTicks = posticks + negticks;
            // Call functions to draw different parts.
            this.drawFrame();
            this.drawBars();
            this.drawXAxis();
        };

        /**
         * A function to draw the basic wire frame.
         */
        this.drawFrame = function() {
            //Background
            let gradfill = ctx.createLinearGradient(0, 0, 0, canvasHeight);
            ctx.font = "20px Arial";
            ctx.textBaseline = "middle";
            ctx.fillStyle = gradfill;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);	//Background

            //Graph title
            ctx.strokeStyle = this.lineCol;
            ctx.fillStyle = this.lineCol;
            let tw = ctx.measureText(this.title).width;
            ctx.fillText(this.title, (canvasWidth/2)-(tw/2), 15);
            this.xAxisYpos = this.yMargin + (canvasHeight - 2 * this.yMargin) * (this.yAxisPosticks / this.yAxisTicks);

            //Vertical axis
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.xMargin, this.yMargin);
            ctx.lineTo(this.xMargin, canvasHeight - this.yMargin);
            ctx.stroke();

            //Draw y-axis labels
            ctx.font = "12px Arial";
            let vint = (canvasHeight - (2 * this.yMargin)) / this.yAxisTicks;
            let vindex = -this.yAxisNegticks;

            for (let i = 0; i <= this.yAxisTicks; i++) {
                let y = canvasHeight - this.yMargin - (i * vint);
                let ylabel = vindex * this.yAxisInt;
                ylabel = ylabel.toString();
                tw = ctx.measureText(ylabel).width;

                //Tick marks
                ctx.lineWidth = 2;
                ctx.strokeStyle = this.lineCol;
                ctx.beginPath();
                ctx.moveTo(this.xMargin+1, y);
                ctx.lineTo(this.xMargin-3, y);
                ctx.stroke();

                //Horizontal guide lines
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = "#888";
                ctx.beginPath();
                ctx.moveTo(this.xMargin+1, y);
                ctx.lineTo(canvasWidth - this.xMargin, y);
                ctx.stroke();
                ctx.fillText(ylabel, this.xMargin - tw - 5, y);
                vindex++;
            }
        };

        /**
         * A function to draw bars.
         */
        this.drawBars = function() {
            let numOfField = this.values.length;
            let barw = pitch * this.barWidth / numOfField;
            let graphrange = this.yAxisTicks * this.yAxisInt;
            let colors = [];
            // Generate different kinds of color based on the number of fields.
            for (let c = 0; c < numOfField; c++) {
                colors.push(getColor());
            }
            //Draw value bars
            ctx.lineWidth = 1;
            //Left-edge starting position of first bar.
            let sp = this.xMargin - (pitch * (0.5 + (0.5 * this.barWidth)));
            for (let i = 0; i < elements; i++) {
                for (j = 0; j < this.values.length; j++) {
                    ctx.strokeStyle = colors[j];
                    let barx = sp + ((i + 1) * pitch) + barw * j;
                    let br = this.values[j][i] / graphrange;
                    //Bar ratio versus total graph value range
                    let barh = br * (canvasHeight - 2 * this.yMargin);
                    barh = barh * (barper / 100);
                    let bary = this.xAxisYpos - barh;
                    //Create a gradient fill bar
                    let gradfill = ctx.createLinearGradient(0, bary, 0, bary+barh);
                    gradfill.addColorStop(0, colors[j]);
                    ctx.fillStyle = gradfill;
                    //Draw this bar
                    ctx.fillRect(barx, bary, barw, barh);
                    ctx.strokeRect(barx, bary, barw, barh);
                }
            }
        };
        /**
         * A function to draw X axis.
         */
        this.drawXAxis = function() {
            ctx.strokeStyle = this.lineCol;
            ctx.fillStyle = this.lineCol;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.xMargin, this.xAxisYpos);
            ctx.lineTo(canvasWidth - this.xMargin, this.xAxisYpos);
            ctx.stroke();
            //X-axis labels
            ctx.font = "12px Arial";
            for (let i = 0; i < elements; i++) {
                let x = this.xMargin- (pitch / 2) + ((i + 1) * pitch);
                ctx.beginPath();
                ctx.moveTo(x, this.xAxisYpos);
                ctx.lineTo(x, this.xAxisYpos + 3);
                ctx.stroke();
                tw = ctx.measureText(this.cats[i]).width;
                ctx.fillText(this.cats[i], x - (tw / 2), this.xAxisYpos + 12);
            }
        }
    }
} else {
    M.toast({html: 'Unfortunately, the File APIs are not fully supported in this browser. :('});
}