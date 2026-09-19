{
    function cleanNumber(input, isDown) {
        if (Array.isArray(input) && !isDown) {
            const output = [...input]
            for (let i = 0; i < input.length; i++) {
                DaveShade.cleanNumber(input[i]);
            }
            
            return input;
        }

        switch (typeof input) {
            //If we are a bigint or string cast to Number.
            case "bigint":
            case "string": input = Number(input);

            case "number":
                if (isNaN(input)) return 0;
                return input;
            
            //If we are a boolean, do 1 or 0
            case "boolean": return (input) ? 1 : 0;
        
            default: return 0;
        }
    }

    //Now for the color related functions
    window.color = class {
        //Private values
        #hex = "#00000000";

        #a = 0;
        #r = 0; #g = 0; #b = 0;
        #h = 0; #s = 0; #v = 0;
        
        //Keeping the color values clean
        set hex(v) { this.#hex = v; this._updateHex(); } get hex() { return this.#hex; }
        set a(v) { this.#a = Math.max(0, Math.min(cleanNumber(v), 255)); this._updateAlpha(true); } get a() { return this.#a}
        
        //RGB needs to be clamped between 0-255
        set r(v) { this.#r = Math.max(0, Math.min(cleanNumber(v), 255)); this._updateRGB(); } get r() { return this.#r}
        set g(v) { this.#g = Math.max(0, Math.min(cleanNumber(v), 255)); this._updateRGB(); } get g() { return this.#g}
        set b(v) { this.#b = Math.max(0, Math.min(cleanNumber(v), 255)); this._updateRGB(); } get b() { return this.#b}

        //Hue is slightly more complicated than the other numbers since it loops.
        set h(v) { 
            this.#h = cleanNumber(v);
            this.#h -= Math.floor(this.#h / 360) * 360; 
            this._updateHSV(); 
        } 
        get h() { return this.#h}

        set s(v) { this.#s = Math.max(0, Math.min(cleanNumber(v), 100)); this._updateHSV(); } get s() { return this.#s}
        set v(v) { this.#v = Math.max(0, Math.min(cleanNumber(v), 100)); this._updateHSV(); } get v() { return this.#v}
        
        //Now for two values that just kind of exist here.
        get darkest() { return Math.min(this.r, this.g, this.b); }
        get lightest() { return Math.max(this.r, this.g, this.b); }

        //Then the DS value
        get _UNIFORM_VALUE_() { return [ this.r / 255, this.g / 255, this.b / 255, this.a / 255 ]; }

        //Function to generate hex codes
        _hexFromRGB() {
            let output = "#";
            
            let parsed = (this.#r | 0).toString(16);
            output += `${(parsed.length == 1) ? "0" : ""}${parsed}`;
            
            parsed = (this.#g | 0).toString(16);
            output += `${(parsed.length == 1) ? "0" : ""}${parsed}`;
            
            parsed = (this.#b | 0).toString(16);
            output += `${(parsed.length == 1) ? "0" : ""}${parsed}`;

            if (this.#a != 255) {
                parsed = (this.#a | 0).toString(16);
                output += `${(parsed.length == 1) ? "0" : ""}${parsed}`;
            }

            return output;
        }

        //Regex for searching hex values
        regex8 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
        regex6 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
        regex4 = /^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i;
        regex3 = /^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i;

        //The functions for updating various numbers based on what changed.
        _updateRGB(ignoreHex) {
            if (!ignoreHex) this.#hex = this._hexFromRGB();

            //Calculate needed values
            const dr = this.#r / 255;
            const dg = this.#g / 255;
            const db = this.#b / 255;
            const max = this.lightest / 255;
            const min = this.darkest / 255;

            const delta = max - min;

            //Calculate hue based on deltas of opposite colours,
            //and the delta between high and low
            if (max == dr) this.#h = 60 * (((dg - db) / delta) % 6);
            else if (max == dg) this.#h = 60 * ((db - dr) / delta + 2);
            else if (max == db) this.#h = 60 * ((dr - dg) / delta + 4);

            //Correct hue if nan or not in a 0-360 range
            if (isNaN(this.#h)) this.#h = 0;
            this.#h -= Math.floor(this.#h / 360) * 360;

            //Then calculate saturation and value
            if (max != 0) this.#s = Math.max(0, Math.min(delta / max, 1)) * 100;
            this.#v = Math.max(0, Math.min(max, 1)) * 100;
        }

        _updateHSV(ignoreHex) {
            //Get saturation and value in 0-1 range
            const s = this.#s / 100;
            const v = this.#v / 100;

            //Calculate c, x, and m
            let c = v * s;
            let x = c * (1 - Math.abs(((this.#h / 60) % 2)- 1));
            const m = v - c;

            //If we are in the middle swap values
            if (this.#h % 120 >= 60) {
                const n = c;
                c = x;
                x = n;
            }

            //R and G
            if (0 <= this.#h && this.#h < 120) {
                this.#r = c;
                this.#g = x;
                this.#b = 0;
            }
            //G and B
            else if (120 <= this.#h && this.#h < 240) {
                this.#r = 0;
                this.#g = c;
                this.#b = x;
            }
            //B and R
            else if (240 <= this.#h && this.#h < 360) {
                this.#r = x;
                this.#g = 0;
                this.#b = c;
            }

            //Then apply saturation and convert to 0-255 range
            this.#r = Math.max(0, Math.min((this.#r + m) * 255, 255));
            this.#g = Math.max(0, Math.min((this.#g + m) * 255, 255));
            this.#b = Math.max(0, Math.min((this.#b + m) * 255, 255));

            //Finally update the hex value
            if (!ignoreHex) this.#hex = this._hexFromRGB();
        }

        _updateHex() {
            switch (typeof this.#hex) {
                //Strings are typically "#ffffff" or "ffffff"
                case "string":
                    let regex = null;

                    //Make sure we start with a #
                    if (!this.#hex.startsWith("#")) this.#hex = `#${this.#hex}`;

                    //If we are above range return black
                    if (this.#hex.length > 9) break;
                    //Find the best parsing regex for the hex
                    if (this.#hex.length > 5)
                        regex = (this.#hex.length > 7) ? this.regex8 : this.regex6;
                    else if (this.#hex.length > 3)
                        regex = (this.#hex.length > 3) ? this.regex4 : this.regex3;
                    //If we aren't valid, return black
                    else break;

                    //If we are sucessful start parsing the hex
                    const split = regex.exec(this.#hex);
                    const multiplier = (this.#hex.length <= 5) ? 17 : 1;
                    
                    //Parse results
                    this.#r = parseInt(split[1], 16) * multiplier;
                    this.#g = parseInt(split[2], 16) * multiplier;
                    this.#b = parseInt(split[3], 16) * multiplier;
                    if (split.length > 4) this.#a = parseInt(split[4], 16) * multiplier;
                    else this.#a = 255;

                    return this._updateRGB(true);
                
                //Numbers are typically 0xffffff or 16777215
                case "bigint":
                case "number":
                    //Make sure it is a number
                    this.#hex = Number(this.#hex);
                    if (isNaN(this.#hex) || !isFinite(this.#hex)) this.#hex = 0;

                    //Add alpha into the equation
                    if (this.#hex >= 16777216) {
                        this.#r = ((this.#hex / 16777216) % 256) | 0;
                        this.#g = ((this.#hex / 65536) % 256) | 0;
                        this.#b = ((this.#hex / 256) % 256) | 0;
                        this.#a = (this.#hex % 256) | 0;
                    }
                    else {
                        this.#r = ((this.#hex / 65536) % 256) | 0;
                        this.#g = ((this.#hex / 256) % 256) | 0;
                        this.#b = (this.#hex % 256) | 0;
                        this.#a = 255;
                    }

                    return this._updateRGB();
            
                default:
                    break;
            }

            //Otherwise return black.
            this.#r = 0;
            this.#b = 0;
            this.#g = 0;
            this.#a = 255;
            this._updateRGB();
        }

        _updateAlpha() { this.#hex = this._hexFromRGB(); }

        //Quick update functions
        setRGB(r, g, b, a) {
            this.#h = cleanNumber(h);
            this.#h -= Math.floor(this.#h / 360) * 360;

            this.#s = Math.max(0, Math.min(cleanNumber(s), 100));
            this.#v = Math.max(0, Math.min(cleanNumber(v), 100));

            if (a !== undefined) this.#a = Math.max(0, Math.min(cleanNumber(v), 255));
            
            this._updateHSV();
        }

        setHSV(h, s, v, a) {
            this.#h = cleanNumber(h);
            this.#h -= Math.floor(this.#h / 360) * 360;

            this.#s = Math.max(0, Math.min(cleanNumber(s), 100));
            this.#v = Math.max(0, Math.min(cleanNumber(v), 100));

            if (a !== undefined) this.#a = Math.max(0, Math.min(cleanNumber(v), 255));
            
            this._updateHSV();
        }

        constructor(r, g, b, a) {
            this.#r = r;
            this.#g = g;
            this.#b = b;
            this.#a = (a === undefined) ? 255 : a;

            this._updateRGB();
        }
    }

    //Useful construction functions
    window.color.hex = (hex) => {
        const color = new window.color(0, 0, 0, 255);
        color.hex = hex;
        return color;
    }

    window.color.hsv = (h, s, v, a) => {
        const color = new window.color(0, 0, 0, a);
        color.setHSV(h, s, v);
        return color;
    }
}