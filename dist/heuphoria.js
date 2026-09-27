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
    color.hex = (hex) => {
        const created = new color(0, 0, 0, 255);
        created.hex = hex;
        return created;
    }

    color.hsv = (h, s, v, a) => {
        const created = new color(0, 0, 0, a);
        created.setHSV(h, s, v);
        return created;
    }

    //Now for colors you can create
    const colorConstructor = (hex) => ({
        set: () => console.error("Trying to set a read only value!"),
        get: () => color.hex(hex)
    });

    //If you want to check the colours, search up //LETTER// -Alex

    //A//
    Object.defineProperty(color, "transparent", colorConstructor("#00000000"));
    Object.defineProperty(color, "aliceBlue", colorConstructor("#f0f8ff"));
    Object.defineProperty(color, "antiqueWhite", colorConstructor("#faebd7"));
    Object.defineProperty(color, "aqua", colorConstructor("#00ffff"));
    Object.defineProperty(color, "aquamarine", colorConstructor("#7fffd4"));
    Object.defineProperty(color, "azure", colorConstructor("#f0ffff"));
    
    //B//
    Object.defineProperty(color, "beige", colorConstructor("#f5f5dc"));
    Object.defineProperty(color, "bisque", colorConstructor("#ffe4c4"));
    Object.defineProperty(color, "black", colorConstructor("#000000"));
    Object.defineProperty(color, "blanchedAlmond", colorConstructor("#ffebcd"));
    Object.defineProperty(color, "blue", colorConstructor("#0000ff"));
    Object.defineProperty(color, "blueViolet", colorConstructor("#8a2be2"));
    Object.defineProperty(color, "brown", colorConstructor("#a52a2a"));
    Object.defineProperty(color, "burlyWood", colorConstructor("#deb887"));
    
    //C//
    Object.defineProperty(color, "cadetBlue", colorConstructor("#5f9ea0"));
    Object.defineProperty(color, "chartreuse", colorConstructor("#7fff00"));
    Object.defineProperty(color, "chocolate", colorConstructor("#d2691e"));
    Object.defineProperty(color, "coral", colorConstructor("#ff7f50"));
    Object.defineProperty(color, "cornflowerBlue", colorConstructor("#6495ed"));
    Object.defineProperty(color, "cornsilk", colorConstructor("#fff8dc"));
    Object.defineProperty(color, "crimson", colorConstructor("#dc143c"));
    Object.defineProperty(color, "cyan", colorConstructor("#00ffff"));

    //D//
    Object.defineProperty(color, "darkBlue", colorConstructor("#00008b"));
    Object.defineProperty(color, "darkCyan", colorConstructor("#008b8b"));
    Object.defineProperty(color, "darkGoldenRod", colorConstructor("#b8860b"));
    Object.defineProperty(color, "darkGray", colorConstructor("#a9a9a9"));
    Object.defineProperty(color, "darkGrey", colorConstructor("#a9a9a9"));
    Object.defineProperty(color, "darkGreen", colorConstructor("#006400"));
    Object.defineProperty(color, "darkKhaki", colorConstructor("#bdb76b"));
    Object.defineProperty(color, "darkMagenta", colorConstructor("#8b008b"));
    Object.defineProperty(color, "darkOliveGreen", colorConstructor("#556b2f"));
    Object.defineProperty(color, "darkOrange", colorConstructor("#ff8c00"));
    Object.defineProperty(color, "darkOrchid", colorConstructor("#9932cc"));
    Object.defineProperty(color, "darkRed", colorConstructor("#8b0000"));
    Object.defineProperty(color, "darkSalmon", colorConstructor("#e9967a"));
    Object.defineProperty(color, "darkSeaGreen", colorConstructor("#8fbc8f"));
    Object.defineProperty(color, "darkSlateBlue", colorConstructor("#483d8b"));
    Object.defineProperty(color, "darkSlateGray", colorConstructor("#2f4f4f"));
    Object.defineProperty(color, "darkSlateGrey", colorConstructor("#2f4f4f"));
    Object.defineProperty(color, "darkTurquoise", colorConstructor("#00ced1"));
    Object.defineProperty(color, "darkViolet", colorConstructor("#9400d3"));
    Object.defineProperty(color, "deepPink", colorConstructor("#ff1493"));
    Object.defineProperty(color, "deepSkyBlue", colorConstructor("#00bfff"));
    Object.defineProperty(color, "dimGray", colorConstructor("#696969"));
    Object.defineProperty(color, "dimGrey", colorConstructor("#696969"));
    Object.defineProperty(color, "dodgerBlue", colorConstructor("#1e90ff"));
    
    //F//
    Object.defineProperty(color, "fireBrick", colorConstructor("#b22222"));
    Object.defineProperty(color, "floralWhite", colorConstructor("#fffaf0"));
    Object.defineProperty(color, "forestGreen", colorConstructor("#228b22"));
    Object.defineProperty(color, "fuchsia", colorConstructor("#ff00ff"));
    
    //G//
    Object.defineProperty(color, "gainsboro", colorConstructor("#dcdcdc"));
    Object.defineProperty(color, "ghostWhite", colorConstructor("#f8f8ff"));
    Object.defineProperty(color, "gold", colorConstructor("#ffd700"));
    Object.defineProperty(color, "goldenRod", colorConstructor("#daa520"));
    Object.defineProperty(color, "gray", colorConstructor("#808080"));
    Object.defineProperty(color, "grey", colorConstructor("#808080"));
    Object.defineProperty(color, "green", colorConstructor("#008000"));
    Object.defineProperty(color, "greenYellow", colorConstructor("#adff2f"));
    
    //H//
    Object.defineProperty(color, "honeyDew", colorConstructor("#f0fff0"));
    Object.defineProperty(color, "hotPink", colorConstructor("#ff69b4"));

    //I//
    Object.defineProperty(color, "indianRed", colorConstructor("#cd5c5c"));
    Object.defineProperty(color, "indigo", colorConstructor("#4b0082"));
    Object.defineProperty(color, "ivory", colorConstructor("#fffff0"));
    
    //K//
    Object.defineProperty(color, "khaki", colorConstructor("#f0e68c"));

    //L//
    Object.defineProperty(color, "lavender", colorConstructor("#e6e6fa"));
    Object.defineProperty(color, "lavenderBlush", colorConstructor("#fff0f5"));
    Object.defineProperty(color, "lawnGreen", colorConstructor("#7cfc00"));
    Object.defineProperty(color, "lemonChiffon", colorConstructor("#fffacd"));
    Object.defineProperty(color, "lightBlue", colorConstructor("#add8e6"));
    Object.defineProperty(color, "lightCoral", colorConstructor("#f08080"));
    Object.defineProperty(color, "lightCyan", colorConstructor("#e0ffff"));
    Object.defineProperty(color, "lightGoldenRodYellow", colorConstructor("#fafad2"));
    Object.defineProperty(color, "lightGray", colorConstructor("#d3d3d3"));
    Object.defineProperty(color, "lightGrey", colorConstructor("#d3d3d3"));
    Object.defineProperty(color, "lightGreen", colorConstructor("#90ee90"));
    Object.defineProperty(color, "lightPink", colorConstructor("#ffb6c1"));
    Object.defineProperty(color, "lightSalmon", colorConstructor("#ffa07a"));
    Object.defineProperty(color, "lightSeaGreen", colorConstructor("#20b2aa"));
    Object.defineProperty(color, "lightSkyBlue", colorConstructor("#87cefa"));
    Object.defineProperty(color, "lightSlateGray", colorConstructor("#778899"));
    Object.defineProperty(color, "lightSlateGrey", colorConstructor("#778899"));
    Object.defineProperty(color, "lightSteelBlue", colorConstructor("#b0c4de"));
    Object.defineProperty(color, "lightYellow", colorConstructor("#ffffe0"));
    Object.defineProperty(color, "lime", colorConstructor("#00ff00"));
    Object.defineProperty(color, "limeGreen", colorConstructor("#32cd32"));
    Object.defineProperty(color, "linen", colorConstructor("#faf0e6"));
    
    //M//
    Object.defineProperty(color, "magenta", colorConstructor("#ff00ff"));
    Object.defineProperty(color, "maroon", colorConstructor("#800000"));
    Object.defineProperty(color, "mediumAquaMarine", colorConstructor("#66cdaa"));
    Object.defineProperty(color, "mediumBlue", colorConstructor("#0000cd"));
    Object.defineProperty(color, "mediumOrchid", colorConstructor("#ba55d3"));
    Object.defineProperty(color, "mediumPurple", colorConstructor("#9370db"));
    Object.defineProperty(color, "mediumSeaGreen", colorConstructor("#3cb371"));
    Object.defineProperty(color, "mediumSlateBlue", colorConstructor("#7b68ee"));
    Object.defineProperty(color, "mediumSpringGreen", colorConstructor("#00fa9a"));
    Object.defineProperty(color, "mediumTurquoise", colorConstructor("#48d1cc"));
    Object.defineProperty(color, "mediumVioletRed", colorConstructor("#c71585"));
    Object.defineProperty(color, "midnightBlue", colorConstructor("#191970"));
    Object.defineProperty(color, "mintCream", colorConstructor("#f5fffa"));
    Object.defineProperty(color, "mistyRose", colorConstructor("#ffe4e1"));
    Object.defineProperty(color, "moccasin", colorConstructor("#ffe4b5"));
    
    //N//
    Object.defineProperty(color, "navajoWhite", colorConstructor("#ffdead"));
    Object.defineProperty(color, "navy", colorConstructor("#000080"));
    
    //O//
    Object.defineProperty(color, "oldLace", colorConstructor("#fdf5e6"));
    Object.defineProperty(color, "olive", colorConstructor("#808000"));
    Object.defineProperty(color, "oliveDrab", colorConstructor("#6b8e23"));
    Object.defineProperty(color, "orange", colorConstructor("#ffa500"));
    Object.defineProperty(color, "orangeRed", colorConstructor("#ff4500"));
    Object.defineProperty(color, "orchid", colorConstructor("#da70d6"));
    
    //P//
    Object.defineProperty(color, "paleGoldenRod", colorConstructor("#eee8aa"));
    Object.defineProperty(color, "paleGreen", colorConstructor("#98fb98"));
    Object.defineProperty(color, "paleTurquoise", colorConstructor("#afeeee"));
    Object.defineProperty(color, "paleVoiletRed", colorConstructor("#db7093"));
    Object.defineProperty(color, "papayaWhip", colorConstructor("#ffefd5"));
    Object.defineProperty(color, "peachPuff", colorConstructor("#ffdab9"));
    Object.defineProperty(color, "peru", colorConstructor("#cd853f"));
    Object.defineProperty(color, "pink", colorConstructor("#ffc0cb"));
    Object.defineProperty(color, "plum", colorConstructor("#dda0dd"));
    Object.defineProperty(color, "powderBlue", colorConstructor("#b0e0e6"));
    Object.defineProperty(color, "purple", colorConstructor("#800080"));
    
    //R//
    Object.defineProperty(color, "rebeccaPurple", colorConstructor("#663399"));
    Object.defineProperty(color, "red", colorConstructor("#ff0000"));
    Object.defineProperty(color, "rosyBrown", colorConstructor("#bc8f8f"));
    Object.defineProperty(color, "royalBlue", colorConstructor("#4169e1"));
    
    //S//
    Object.defineProperty(color, "saddleBrown", colorConstructor("#8b4513"));
    Object.defineProperty(color, "salmon", colorConstructor("#fa8072"));
    Object.defineProperty(color, "sandyBrown", colorConstructor("#f4a460"));
    Object.defineProperty(color, "seaGreen", colorConstructor("#2e8b57"));
    Object.defineProperty(color, "seaShell", colorConstructor("#fff5ee"));
    Object.defineProperty(color, "sienna", colorConstructor("#a0522d"));
    Object.defineProperty(color, "silver", colorConstructor("#c0c0c0"));
    Object.defineProperty(color, "skyBlue", colorConstructor("#87ceeb"));
    Object.defineProperty(color, "slateBlue", colorConstructor("#6a5acd"));
    Object.defineProperty(color, "slateGray", colorConstructor("#708090"));
    Object.defineProperty(color, "slateGrey", colorConstructor("#708090"));
    Object.defineProperty(color, "snow", colorConstructor("#fffafa"));
    Object.defineProperty(color, "springGreen", colorConstructor("#00ff7f"));
    Object.defineProperty(color, "steelBlue", colorConstructor("#4682b4"));
    
    //T//
    Object.defineProperty(color, "tan", colorConstructor("#d2b48c"));
    Object.defineProperty(color, "teal", colorConstructor("#008080"));
    Object.defineProperty(color, "thistle", colorConstructor("#d8bfd8"));
    Object.defineProperty(color, "tomato", colorConstructor("#ff6347"));
    Object.defineProperty(color, "turquoise", colorConstructor("#40e0d0"));
    
    //V//
    Object.defineProperty(color, "violet", colorConstructor("#ee82ee"));

    //W//
    Object.defineProperty(color, "wheat", colorConstructor("#f5deb3"));
    Object.defineProperty(color, "white", colorConstructor("#ffffff"));
    Object.defineProperty(color, "whiteSmoke", colorConstructor("#f5f5f5"));

    //Y//
    Object.defineProperty(color, "yellow", colorConstructor("#ffff00"));
    Object.defineProperty(color, "yellowGreen", colorConstructor("#9acd32"));
}