class Main {
    #canvas;
    #select;
    #glCtx;
    #program;
    #buffer;
    #mousepos = [0, 0];
    #shaderList = [];
    #activeShader;

    constructor() {
        this.#select = document.querySelector('select');

        this.getShaderList('/shaders/shader-list.json')
            .then(async (_) => {
                this.#shaderList = _;
                this.fillSelect(this.#shaderList);

                this.#select.addEventListener('change', async (e) => {
                    this.#glCtx.getExtension('WEBGL_lose_context').loseContext();
                    this.#canvas.remove();
                    await this.init(this.#shaderList[e.target.value]);
                });

                await this.init(this.#shaderList[0]);
            })

        window.onresize = this.resize.bind(this);
    }

    async init(shaderName) {
        this.#canvas = document.createElement('canvas');
        document.body.appendChild(this.#canvas);

        this.#canvas.addEventListener('mousemove', (e) => {
            this.#mousepos = [e.clientX, e.clientY];
        });

        this.#glCtx = this.#canvas.getContext('webgl') || this.#canvas.getContext('experimental-webgl');

        await this.createProgram(shaderName);
    }

    async createProgram(shaderName) {
        if (!this.#glCtx) {
            console.error('Your browser does not support WebGL.');
            return;
        }

        this.#program = this.#glCtx.createProgram();

        await this.createShader(`/shaders/${shaderName}/${shaderName}.vert`, this.#glCtx.VERTEX_SHADER);
        await this.createShader(`/shaders/${shaderName}/${shaderName}.frag`, this.#glCtx.FRAGMENT_SHADER);

        const status = this.#glCtx.getProgramParameter(this.#program, this.#glCtx.LINK_STATUS);
        if (!status) {
            console.error(`Error when trying to link shaders: ${this.#glCtx.getProgramInfoLog(this.#program)}`);
        }

        this.#program.inPos = this.#glCtx.getAttribLocation(this.#program, "inPos");
        this.#program.iTime = this.#glCtx.getUniformLocation(this.#program, "iTime");
        this.#program.iResolution = this.#glCtx.getUniformLocation(this.#program, "iResolution");
        this.#program.iMouse = this.#glCtx.getUniformLocation(this.#program, "iMouse");

        this.#glCtx.useProgram(this.#program);

        await this.createBuffer(`/shaders/${shaderName}/${shaderName}-geo.json`);

        this.#glCtx.enable(this.#glCtx.DEPTH_TEST);
        this.#glCtx.clearColor(0.0, 0.0, 0.0, 1.0);

        this.resize();
        requestAnimationFrame(this.render.bind(this));
    }

    async getShaderList(url) {
        const shaderListResponse = await fetch(url);
        const shaderListText = await shaderListResponse.text();
        return JSON.parse(shaderListText).list;
    }

    async createShader(url, type) {

        if (type != this.#glCtx.VERTEX_SHADER && type != this.#glCtx.FRAGMENT_SHADER) {
            console.error('Invalid shader type: createShader(url, TYPE)');
        }

        const shaderResponse = await fetch(url);
        const shaderText = await shaderResponse.text();
        const shaderObj = this.#glCtx.createShader(type);

        this.#glCtx.shaderSource(shaderObj, shaderText);
        this.#glCtx.compileShader(shaderObj);

        const status = this.#glCtx.getShaderParameter(shaderObj, this.#glCtx.COMPILE_STATUS);
        if (!status) {
            console.error(`Error when trying to compile shader ${type}: ${this.#glCtx.getShaderInfoLog(shaderObj)}`);
        }
        this.#glCtx.attachShader(this.#program, shaderObj);
        this.#glCtx.linkProgram(this.#program);
    }

    async createBuffer(url) {

        const geoResponse = await fetch(url);
        const geoText = await geoResponse.text();
        const geoObj = JSON.parse(geoText);

        this.#buffer = { pos: this.#glCtx.createBuffer() };
        this.#glCtx.bindBuffer(this.#glCtx.ARRAY_BUFFER, this.#buffer.pos);
        this.#glCtx.bufferData(this.#glCtx.ARRAY_BUFFER, new Float32Array(geoObj.points), this.#glCtx.STATIC_DRAW);

        this.#buffer.inx = this.#glCtx.createBuffer();
        this.#buffer.inx.len = geoObj.indexes.length;
        this.#glCtx.bindBuffer(this.#glCtx.ELEMENT_ARRAY_BUFFER, this.#buffer.inx);
        this.#glCtx.bufferData(this.#glCtx.ELEMENT_ARRAY_BUFFER, new Uint16Array(geoObj.indexes), this.#glCtx.STATIC_DRAW);

        this.#glCtx.enableVertexAttribArray(this.#program.inPos);
        this.#glCtx.vertexAttribPointer(this.#program.inPos, 3, this.#glCtx.FLOAT, false, 0, 0);
    }

    resize() {
        const viewport = [window.innerWidth, window.innerHeight];
        this.#canvas.width = viewport[0];
        this.#canvas.height = viewport[1];
    }

    render(deltaMS) {

        if (!this.#glCtx.getProgramParameter(this.#program, this.#glCtx.LINK_STATUS)) return;
        this.#glCtx.viewport(0, 0, this.#canvas.width, this.#canvas.height);
        this.#glCtx.clear(this.#glCtx.COLOR_BUFFER_BIT | this.#glCtx.DEPTH_BUFFER_BIT);

        this.#glCtx.uniform1f(this.#program.iTime, deltaMS / 1000.0);
        this.#glCtx.uniform2f(this.#program.iResolution, this.#canvas.width, this.#canvas.height);
        this.#glCtx.uniform2f(this.#program.iMouse, this.#mousepos[0], this.#mousepos[1]);        
        this.#glCtx.drawElements(this.#glCtx.TRIANGLES, this.#buffer.inx.len, this.#glCtx.UNSIGNED_SHORT, 0);
        
        requestAnimationFrame(this.render.bind(this));
    }

    fillSelect(list) {
        this.#shaderList.forEach((_, index) => {
            const option = document.createElement('option');
            option.setAttribute('value', index);
            option.appendChild(document.createTextNode(_));
            this.#select.appendChild(option);
        });
    }
}

new Main();