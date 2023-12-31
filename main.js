class Main {
    #canvas;
    #glCtx;
    #program;
    #buffer;

    constructor() {
        window.onresize = this.resize.bind(this);
    }

    async initialize() {
        this.#canvas = document.querySelector('canvas');
        this.#glCtx = this.#canvas.getContext('webgl') || this.#canvas.getContext('experimental-webgl');

        if (!this.#glCtx) {
            console.error('Your browser does not support WebGL.')
            return;
        }

        this.#program = this.#glCtx.createProgram();

        await this.createShader('/shaders/default/default.vert', this.#glCtx.VERTEX_SHADER);
        await this.createShader('/shaders/default/default.frag', this.#glCtx.FRAGMENT_SHADER);

        const status = this.#glCtx.getProgramParameter(this.#program, this.#glCtx.LINK_STATUS);
        if (!status) {
            console.error(`Error when trying to link shaders: ${this.#glCtx.getProgramInfoLog(this.#program)}`);
        }

        this.#program.iTime = this.#glCtx.getUniformLocation(this.#program, "iTime");
        this.#program.iResolution = this.#glCtx.getUniformLocation(this.#program, "iResolution");

        this.#glCtx.useProgram(this.#program);

        this.createBuffer();
        
        this.#glCtx.enable(this.#glCtx.DEPTH_TEST);
        this.#glCtx.clearColor(0.0, 0.0, 0.0, 1.0);

        this.resize();
        requestAnimationFrame(this.render.bind(this));
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

    createBuffer() {
        const pos = [-1, -1, 1, -1, 1, 1, -1, 1];
        const inx = [0, 1, 2, 0, 2, 3];

        this.#buffer = { pos: this.#glCtx.createBuffer() };
        this.#glCtx.bindBuffer(this.#glCtx.ARRAY_BUFFER, this.#buffer.pos);
        this.#glCtx.bufferData(this.#glCtx.ARRAY_BUFFER, new Float32Array(pos), this.#glCtx.STATIC_DRAW);

        this.#buffer.inx = this.#glCtx.createBuffer();
        this.#buffer.inx.len = inx.length;
        this.#glCtx.bindBuffer(this.#glCtx.ELEMENT_ARRAY_BUFFER, this.#buffer.inx);
        this.#glCtx.bufferData(this.#glCtx.ELEMENT_ARRAY_BUFFER, new Uint16Array(inx), this.#glCtx.STATIC_DRAW);
        
        this.#glCtx.enableVertexAttribArray(this.#program.inPos);
        this.#glCtx.vertexAttribPointer(this.#program.inPos, 2, this.#glCtx.FLOAT, false, 0, 0);
    }

    resize() {
        const viewport = [window.innerWidth, window.innerHeight];
        this.#canvas.width = viewport[0];
        this.#canvas.height = viewport[1];
    }

    render(deltaMS) {

        this.#glCtx.viewport(0, 0, this.#canvas.width, this.#canvas.height);
        this.#glCtx.clear(this.#glCtx.COLOR_BUFFER_BIT | this.#glCtx.DEPTH_BUFFER_BIT);

        this.#glCtx.uniform1f(this.#program.iTime, deltaMS / 1000.0);
        this.#glCtx.uniform2f(this.#program.iResolution, this.#canvas.width, this.#canvas.height);
        this.#glCtx.drawElements(this.#glCtx.TRIANGLES, this.#buffer.inx.len, this.#glCtx.UNSIGNED_SHORT, 0);

        requestAnimationFrame(this.render.bind(this));
    }
}

new Main().initialize();