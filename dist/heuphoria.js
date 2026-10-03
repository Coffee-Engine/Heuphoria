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
    window.Color = class {
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
            this.#h %= 360;

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
            this.#r = Math.max(0, Math.min(cleanNumber(r), 255));
            this.#g = Math.max(0, Math.min(cleanNumber(g), 255));
            this.#b = Math.max(0, Math.min(cleanNumber(b), 255));
            if (a !== undefined) this.#a = Math.max(0, Math.min(cleanNumber(a), 255));

            this._updateRGB();
        }

        setHSV(h, s, v, a) {
            this.#h = cleanNumber(h);
            this.#h -= Math.floor(this.#h / 360) * 360;
            this.#h %= 360;

            this.#s = Math.max(0, Math.min(cleanNumber(s), 100));
            this.#v = Math.max(0, Math.min(cleanNumber(v), 100));

            if (a !== undefined) this.#a = Math.max(0, Math.min(cleanNumber(a), 255));
            
            this._updateHSV();
        }

        invert() { return new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a); }

        duplicate() { return new Color(this.r, this.g, this.b, this.a); }

        mix(other, amount, useRGB) {
            const output = this.duplicate();
            amount = Math.max(Math.min(1, cleanNumber(amount)), 0);

            //Make sure we are mixing with another color
            if (!(other instanceof Color)) return output;
            
            //RGB interpolation
            if (useRGB) {
                output.setRGB(
                    output.r + (other.r - output.r) * amount,
                    output.g + (other.g - output.g) * amount,
                    output.b + (other.b - output.b) * amount,
                    output.a + (other.a - output.a) * amount
                );
            }
            else {
                let targetH = other.h;
                
                //Adjust H for clean interpolation across boundries
                if (targetH - output.h > 180) targetH -= 360;
                else if (targetH - output.h < -180) targetH += 360;

                output.setHSV(
                    output.h + (targetH - output.h) * amount,
                    output.s + (other.s - output.s) * amount,
                    output.v + (other.v - output.v) * amount,
                    output.a + (other.a - output.a) * amount
                );
            }

            return output;
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
    Color.hex = (hex) => {
        const created = new Color(0, 0, 0, 255);
        created.hex = hex;
        return created;
    }

    Color.hsv = (h, s, v, a) => {
        const created = new Color(0, 0, 0, a);
        created.setHSV(h, s, v);
        return created;
    }

    //Now for colors you can create
    const colorConstructor = (hex) => ({
        set: () => console.error("Trying to set a read only value!"),
        get: () => Color.hex(hex)
    });

    //If you want to check the colours, search up //LETTER// -Alex

    //A//
    Object.defineProperty(Color, "transparent", colorConstructor("#00000000"));
    Object.defineProperty(Color, "aliceBlue", colorConstructor("#f0f8ff"));
    Object.defineProperty(Color, "antiqueWhite", colorConstructor("#faebd7"));
    Object.defineProperty(Color, "aqua", colorConstructor("#00ffff"));
    Object.defineProperty(Color, "aquamarine", colorConstructor("#7fffd4"));
    Object.defineProperty(Color, "azure", colorConstructor("#f0ffff"));
    
    //B//
    Object.defineProperty(Color, "beige", colorConstructor("#f5f5dc"));
    Object.defineProperty(Color, "bisque", colorConstructor("#ffe4c4"));
    Object.defineProperty(Color, "black", colorConstructor("#000000"));
    Object.defineProperty(Color, "blanchedAlmond", colorConstructor("#ffebcd"));
    Object.defineProperty(Color, "blue", colorConstructor("#0000ff"));
    Object.defineProperty(Color, "blueViolet", colorConstructor("#8a2be2"));
    Object.defineProperty(Color, "brown", colorConstructor("#a52a2a"));
    Object.defineProperty(Color, "burlyWood", colorConstructor("#deb887"));
    
    //C//
    Object.defineProperty(Color, "cadetBlue", colorConstructor("#5f9ea0"));
    Object.defineProperty(Color, "chartreuse", colorConstructor("#7fff00"));
    Object.defineProperty(Color, "chocolate", colorConstructor("#d2691e"));
    Object.defineProperty(Color, "coral", colorConstructor("#ff7f50"));
    Object.defineProperty(Color, "cornflowerBlue", colorConstructor("#6495ed"));
    Object.defineProperty(Color, "cornsilk", colorConstructor("#fff8dc"));
    Object.defineProperty(Color, "crimson", colorConstructor("#dc143c"));
    Object.defineProperty(Color, "cyan", colorConstructor("#00ffff"));

    //D//
    Object.defineProperty(Color, "darkBlue", colorConstructor("#00008b"));
    Object.defineProperty(Color, "darkCyan", colorConstructor("#008b8b"));
    Object.defineProperty(Color, "darkGoldenRod", colorConstructor("#b8860b"));
    Object.defineProperty(Color, "darkGray", colorConstructor("#a9a9a9"));
    Object.defineProperty(Color, "darkGrey", colorConstructor("#a9a9a9"));
    Object.defineProperty(Color, "darkGreen", colorConstructor("#006400"));
    Object.defineProperty(Color, "darkKhaki", colorConstructor("#bdb76b"));
    Object.defineProperty(Color, "darkMagenta", colorConstructor("#8b008b"));
    Object.defineProperty(Color, "darkOliveGreen", colorConstructor("#556b2f"));
    Object.defineProperty(Color, "darkOrange", colorConstructor("#ff8c00"));
    Object.defineProperty(Color, "darkOrchid", colorConstructor("#9932cc"));
    Object.defineProperty(Color, "darkRed", colorConstructor("#8b0000"));
    Object.defineProperty(Color, "darkSalmon", colorConstructor("#e9967a"));
    Object.defineProperty(Color, "darkSeaGreen", colorConstructor("#8fbc8f"));
    Object.defineProperty(Color, "darkSlateBlue", colorConstructor("#483d8b"));
    Object.defineProperty(Color, "darkSlateGray", colorConstructor("#2f4f4f"));
    Object.defineProperty(Color, "darkSlateGrey", colorConstructor("#2f4f4f"));
    Object.defineProperty(Color, "darkTurquoise", colorConstructor("#00ced1"));
    Object.defineProperty(Color, "darkViolet", colorConstructor("#9400d3"));
    Object.defineProperty(Color, "deepPink", colorConstructor("#ff1493"));
    Object.defineProperty(Color, "deepSkyBlue", colorConstructor("#00bfff"));
    Object.defineProperty(Color, "dimGray", colorConstructor("#696969"));
    Object.defineProperty(Color, "dimGrey", colorConstructor("#696969"));
    Object.defineProperty(Color, "dodgerBlue", colorConstructor("#1e90ff"));
    
    //F//
    Object.defineProperty(Color, "fireBrick", colorConstructor("#b22222"));
    Object.defineProperty(Color, "floralWhite", colorConstructor("#fffaf0"));
    Object.defineProperty(Color, "forestGreen", colorConstructor("#228b22"));
    Object.defineProperty(Color, "fuchsia", colorConstructor("#ff00ff"));
    
    //G//
    Object.defineProperty(Color, "gainsboro", colorConstructor("#dcdcdc"));
    Object.defineProperty(Color, "ghostWhite", colorConstructor("#f8f8ff"));
    Object.defineProperty(Color, "gold", colorConstructor("#ffd700"));
    Object.defineProperty(Color, "goldenRod", colorConstructor("#daa520"));
    Object.defineProperty(Color, "gray", colorConstructor("#808080"));
    Object.defineProperty(Color, "grey", colorConstructor("#808080"));
    Object.defineProperty(Color, "green", colorConstructor("#008000"));
    Object.defineProperty(Color, "greenYellow", colorConstructor("#adff2f"));
    
    //H//
    Object.defineProperty(Color, "honeyDew", colorConstructor("#f0fff0"));
    Object.defineProperty(Color, "hotPink", colorConstructor("#ff69b4"));

    //I//
    Object.defineProperty(Color, "indianRed", colorConstructor("#cd5c5c"));
    Object.defineProperty(Color, "indigo", colorConstructor("#4b0082"));
    Object.defineProperty(Color, "ivory", colorConstructor("#fffff0"));
    
    //K//
    Object.defineProperty(Color, "khaki", colorConstructor("#f0e68c"));

    //L//
    Object.defineProperty(Color, "lavender", colorConstructor("#e6e6fa"));
    Object.defineProperty(Color, "lavenderBlush", colorConstructor("#fff0f5"));
    Object.defineProperty(Color, "lawnGreen", colorConstructor("#7cfc00"));
    Object.defineProperty(Color, "lemonChiffon", colorConstructor("#fffacd"));
    Object.defineProperty(Color, "lightBlue", colorConstructor("#add8e6"));
    Object.defineProperty(Color, "lightCoral", colorConstructor("#f08080"));
    Object.defineProperty(Color, "lightCyan", colorConstructor("#e0ffff"));
    Object.defineProperty(Color, "lightGoldenRodYellow", colorConstructor("#fafad2"));
    Object.defineProperty(Color, "lightGray", colorConstructor("#d3d3d3"));
    Object.defineProperty(Color, "lightGrey", colorConstructor("#d3d3d3"));
    Object.defineProperty(Color, "lightGreen", colorConstructor("#90ee90"));
    Object.defineProperty(Color, "lightPink", colorConstructor("#ffb6c1"));
    Object.defineProperty(Color, "lightSalmon", colorConstructor("#ffa07a"));
    Object.defineProperty(Color, "lightSeaGreen", colorConstructor("#20b2aa"));
    Object.defineProperty(Color, "lightSkyBlue", colorConstructor("#87cefa"));
    Object.defineProperty(Color, "lightSlateGray", colorConstructor("#778899"));
    Object.defineProperty(Color, "lightSlateGrey", colorConstructor("#778899"));
    Object.defineProperty(Color, "lightSteelBlue", colorConstructor("#b0c4de"));
    Object.defineProperty(Color, "lightYellow", colorConstructor("#ffffe0"));
    Object.defineProperty(Color, "lime", colorConstructor("#00ff00"));
    Object.defineProperty(Color, "limeGreen", colorConstructor("#32cd32"));
    Object.defineProperty(Color, "linen", colorConstructor("#faf0e6"));
    
    //M//
    Object.defineProperty(Color, "magenta", colorConstructor("#ff00ff"));
    Object.defineProperty(Color, "maroon", colorConstructor("#800000"));
    Object.defineProperty(Color, "mediumAquaMarine", colorConstructor("#66cdaa"));
    Object.defineProperty(Color, "mediumBlue", colorConstructor("#0000cd"));
    Object.defineProperty(Color, "mediumOrchid", colorConstructor("#ba55d3"));
    Object.defineProperty(Color, "mediumPurple", colorConstructor("#9370db"));
    Object.defineProperty(Color, "mediumSeaGreen", colorConstructor("#3cb371"));
    Object.defineProperty(Color, "mediumSlateBlue", colorConstructor("#7b68ee"));
    Object.defineProperty(Color, "mediumSpringGreen", colorConstructor("#00fa9a"));
    Object.defineProperty(Color, "mediumTurquoise", colorConstructor("#48d1cc"));
    Object.defineProperty(Color, "mediumVioletRed", colorConstructor("#c71585"));
    Object.defineProperty(Color, "midnightBlue", colorConstructor("#191970"));
    Object.defineProperty(Color, "mintCream", colorConstructor("#f5fffa"));
    Object.defineProperty(Color, "mistyRose", colorConstructor("#ffe4e1"));
    Object.defineProperty(Color, "moccasin", colorConstructor("#ffe4b5"));
    
    //N//
    Object.defineProperty(Color, "navajoWhite", colorConstructor("#ffdead"));
    Object.defineProperty(Color, "navy", colorConstructor("#000080"));
    
    //O//
    Object.defineProperty(Color, "oldLace", colorConstructor("#fdf5e6"));
    Object.defineProperty(Color, "olive", colorConstructor("#808000"));
    Object.defineProperty(Color, "oliveDrab", colorConstructor("#6b8e23"));
    Object.defineProperty(Color, "orange", colorConstructor("#ffa500"));
    Object.defineProperty(Color, "orangeRed", colorConstructor("#ff4500"));
    Object.defineProperty(Color, "orchid", colorConstructor("#da70d6"));
    
    //P//
    Object.defineProperty(Color, "paleGoldenRod", colorConstructor("#eee8aa"));
    Object.defineProperty(Color, "paleGreen", colorConstructor("#98fb98"));
    Object.defineProperty(Color, "paleTurquoise", colorConstructor("#afeeee"));
    Object.defineProperty(Color, "paleVoiletRed", colorConstructor("#db7093"));
    Object.defineProperty(Color, "papayaWhip", colorConstructor("#ffefd5"));
    Object.defineProperty(Color, "peachPuff", colorConstructor("#ffdab9"));
    Object.defineProperty(Color, "peru", colorConstructor("#cd853f"));
    Object.defineProperty(Color, "pink", colorConstructor("#ffc0cb"));
    Object.defineProperty(Color, "plum", colorConstructor("#dda0dd"));
    Object.defineProperty(Color, "powderBlue", colorConstructor("#b0e0e6"));
    Object.defineProperty(Color, "purple", colorConstructor("#800080"));
    
    //R//
    Object.defineProperty(Color, "rebeccaPurple", colorConstructor("#663399"));
    Object.defineProperty(Color, "red", colorConstructor("#ff0000"));
    Object.defineProperty(Color, "rosyBrown", colorConstructor("#bc8f8f"));
    Object.defineProperty(Color, "royalBlue", colorConstructor("#4169e1"));
    
    //S//
    Object.defineProperty(Color, "saddleBrown", colorConstructor("#8b4513"));
    Object.defineProperty(Color, "salmon", colorConstructor("#fa8072"));
    Object.defineProperty(Color, "sandyBrown", colorConstructor("#f4a460"));
    Object.defineProperty(Color, "seaGreen", colorConstructor("#2e8b57"));
    Object.defineProperty(Color, "seaShell", colorConstructor("#fff5ee"));
    Object.defineProperty(Color, "sienna", colorConstructor("#a0522d"));
    Object.defineProperty(Color, "silver", colorConstructor("#c0c0c0"));
    Object.defineProperty(Color, "skyBlue", colorConstructor("#87ceeb"));
    Object.defineProperty(Color, "slateBlue", colorConstructor("#6a5acd"));
    Object.defineProperty(Color, "slateGray", colorConstructor("#708090"));
    Object.defineProperty(Color, "slateGrey", colorConstructor("#708090"));
    Object.defineProperty(Color, "snow", colorConstructor("#fffafa"));
    Object.defineProperty(Color, "springGreen", colorConstructor("#00ff7f"));
    Object.defineProperty(Color, "steelBlue", colorConstructor("#4682b4"));
    
    //T//
    Object.defineProperty(Color, "tan", colorConstructor("#d2b48c"));
    Object.defineProperty(Color, "teal", colorConstructor("#008080"));
    Object.defineProperty(Color, "thistle", colorConstructor("#d8bfd8"));
    Object.defineProperty(Color, "tomato", colorConstructor("#ff6347"));
    Object.defineProperty(Color, "turquoise", colorConstructor("#40e0d0"));
    
    //V//
    Object.defineProperty(Color, "violet", colorConstructor("#ee82ee"));

    //W//
    Object.defineProperty(Color, "wheat", colorConstructor("#f5deb3"));
    Object.defineProperty(Color, "white", colorConstructor("#ffffff"));
    Object.defineProperty(Color, "whiteSmoke", colorConstructor("#f5f5f5"));

    //Y//
    Object.defineProperty(Color, "yellow", colorConstructor("#ffff00"));
    Object.defineProperty(Color, "yellowGreen", colorConstructor("#9acd32"));
}