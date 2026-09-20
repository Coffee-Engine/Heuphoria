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
    const colorConstructor = (hex) => { return () => { return color.hex(hex); }; };

    //CSS NAMED COLOURS GO HERE (DO LATER)
    //If you want to check the colours, search up //LETTER// -Alex

    //A//
    color.transparent = colorConstructor("#00000000");
    color.aliceBlue = colorConstructor("#f0f8ff");
    color.antiqueWhite = colorConstructor("#faebd7");
    color.aqua = colorConstructor("#00ffff");
    color.aquamarine = colorConstructor("#7fffd4");
    color.azure = colorConstructor("#f0ffff");
    
    //B//
    color.beige = colorConstructor("#f5f5dc");
    color.bisque = colorConstructor("#ffe4c4");
    color.black = colorConstructor("#000000");
    color.blanchedAlmond = colorConstructor("#ffebcd");
    color.blue = colorConstructor("#0000ff");
    color.blueViolet = colorConstructor("#8a2be2");
    color.brown = colorConstructor("#a52a2a");
    color.burlyWood = colorConstructor("#deb887");
    
    //C//
    color.cadetBlue = colorConstructor("#5f9ea0");
    color.chartreuse = colorConstructor("#7fff00");
    color.chocolate = colorConstructor("#d2691e");
    color.coral = colorConstructor("#ff7f50");
    color.cornflowerBlue = colorConstructor("#6495ed");
    color.cornsilk = colorConstructor("#fff8dc");
    color.crimson = colorConstructor("#dc143c");
    color.cyan = colorConstructor("#00ffff");

    //D//
    color.darkBlue = colorConstructor("#00008b");
    color.darkCyan = colorConstructor("#008b8b");
    color.darkGoldenRod = colorConstructor("#b8860b");
    color.darkGray = colorConstructor("#a9a9a9");
    color.darkGrey = colorConstructor("#a9a9a9");
    color.darkGreen = colorConstructor("#006400");
    color.darkKhaki = colorConstructor("#bdb76b");
    color.darkMagenta = colorConstructor("#8b008b");
    color.darkOliveGreen = colorConstructor("#556b2f");
    color.darkOrange = colorConstructor("#ff8c00");
    color.darkOrchid = colorConstructor("#9932cc");
    color.darkRed = colorConstructor("#8b0000");
    color.darkSalmon = colorConstructor("#e9967a");
    color.darkSeaGreen = colorConstructor("#8fbc8f");
    color.darkSlateBlue = colorConstructor("#483d8b");
    color.darkSlateGray = colorConstructor("#2f4f4f");
    color.darkSlateGrey = colorConstructor("#2f4f4f");
    color.darkTurquoise = colorConstructor("#00ced1");
    color.darkViolet = colorConstructor("#9400d3");
    color.deepPink = colorConstructor("#ff1493");
    color.deepSkyBlue = colorConstructor("#00bfff");
    color.dimGray = colorConstructor("#696969");
    color.dimGrey = colorConstructor("#696969");
    color.dodgerBlue = colorConstructor("#1e90ff");
    
    //F//
    color.fireBrick = colorConstructor("#b22222");
    color.floralWhite = colorConstructor("#fffaf0");
    color.forestGreen = colorConstructor("#228b22");
    color.fuchsia = colorConstructor("#ff00ff");
    
    //G//
    color.gainsboro = colorConstructor("#dcdcdc");
    color.ghostWhite = colorConstructor("#f8f8ff");
    color.gold = colorConstructor("#ffd700");
    color.goldenRod = colorConstructor("#daa520");
    color.gray = colorConstructor("#808080");
    color.grey = colorConstructor("#808080");
    color.green = colorConstructor("#008000");
    color.greenYellow = colorConstructor("#adff2f");
    
    //H//
    color.honeyDew = colorConstructor("#f0fff0");
    color.hotPink = colorConstructor("#ff69b4");

    //I//
    color.indianRed = colorConstructor("#cd5c5c");
    color.indigo = colorConstructor("#4b0082");
    color.ivory = colorConstructor("#fffff0");
    
    //K//
    color.khaki = colorConstructor("#f0e68c");

    //L//
    color.lavender = colorConstructor("#e6e6fa");
    color.lavenderBlush = colorConstructor("#fff0f5");
    color.lawnGreen = colorConstructor("#7cfc00");
    color.lemonChiffon = colorConstructor("#fffacd");
    color.lightBlue = colorConstructor("#add8e6");
    color.lightCoral = colorConstructor("#f08080");
    color.lightCyan = colorConstructor("#e0ffff");
    color.lightGoldenRodYellow = colorConstructor("#fafad2");
    color.lightGray = colorConstructor("#d3d3d3");
    color.lightGrey = colorConstructor("#d3d3d3");
    color.lightGreen = colorConstructor("#90ee90");
    color.lightPink = colorConstructor("#ffb6c1");
    color.lightSalmon = colorConstructor("#ffa07a");
    color.lightSeaGreen = colorConstructor("#20b2aa");
    color.lightSkyBlue = colorConstructor("#87cefa");
    color.lightSlateGray = colorConstructor("#778899");
    color.lightSlateGrey = colorConstructor("#778899");
    color.lightSteelBlue = colorConstructor("#b0c4de");
    color.lightYellow = colorConstructor("#ffffe0");
    color.lime = colorConstructor("#00ff00");
    color.limeGreen = colorConstructor("#32cd32");
    color.linen = colorConstructor("#faf0e6");
    
    //M//
    color.magenta = colorConstructor("#ff00ff");
    color.maroon = colorConstructor("#800000");
    color.mediumAquaMarine = colorConstructor("#66cdaa");
    color.mediumBlue = colorConstructor("#0000cd");
    color.mediumOrchid = colorConstructor("#ba55d3");
    color.mediumPurple = colorConstructor("#9370db");
    color.mediumSeaGreen = colorConstructor("#3cb371");
    color.mediumSlateBlue = colorConstructor("#7b68ee");
    color.mediumSpringGreen = colorConstructor("#00fa9a");
    color.mediumTurquoise = colorConstructor("#48d1cc");
    color.mediumVioletRed = colorConstructor("#c71585");
    color.midnightBlue = colorConstructor("#191970");
    color.mintCream = colorConstructor("#f5fffa");
    color.mistyRose = colorConstructor("#ffe4e1");
    color.moccasin = colorConstructor("#ffe4b5");
    
    //N//
    color.navajoWhite = colorConstructor("#ffdead");
    color.navy = colorConstructor("#000080");
    
    //O//
    color.oldLace = colorConstructor("#fdf5e6");
    color.olive = colorConstructor("#808000");
    color.oliveDrab = colorConstructor("#6b8e23");
    color.orange = colorConstructor("#ffa500");
    color.orangeRed = colorConstructor("#ff4500");
    color.orchid = colorConstructor("#da70d6");
    
    //P//
    color.paleGoldenRod = colorConstructor("#eee8aa");
    color.paleGreen = colorConstructor("#98fb98");
    color.paleTurquoise = colorConstructor("#afeeee");
    color.paleVoiletRed = colorConstructor("#db7093");
    color.papayaWhip = colorConstructor("#ffefd5");
    color.peachPuff = colorConstructor("#ffdab9");
    color.peru = colorConstructor("#cd853f");
    color.pink = colorConstructor("#ffc0cb");
    color.plum = colorConstructor("#dda0dd");
    color.powderBlue = colorConstructor("#b0e0e6");
    color.purple = colorConstructor("#800080");
    
    //R//
    color.rebeccaPurple = colorConstructor("#663399");
    color.red = colorConstructor("#ff0000");
    color.rosyBrown = colorConstructor("#bc8f8f");
    color.royalBlue = colorConstructor("#4169e1");
    
    //S//
    color.saddleBrown = colorConstructor("#8b4513");
    color.salmon = colorConstructor("#fa8072");
    color.sandyBrown = colorConstructor("#f4a460");
    color.seaGreen = colorConstructor("#2e8b57");
    color.seaShell = colorConstructor("#fff5ee");
    color.sienna = colorConstructor("#a0522d");
    color.silver = colorConstructor("#c0c0c0");
    color.skyBlue = colorConstructor("#87ceeb");
    color.slateBlue = colorConstructor("#6a5acd");
    color.slateGray = colorConstructor("#708090");
    color.slateGrey = colorConstructor("#708090");
    color.snow = colorConstructor("#fffafa");
    color.springGreen = colorConstructor("#00ff7f");
    color.steelBlue = colorConstructor("#4682b4");
    
    //T//
    color.tan = colorConstructor("#d2b48c");
    color.teal = colorConstructor("#008080");
    color.thistle = colorConstructor("#d8bfd8");
    color.tomato = colorConstructor("#ff6347");
    color.turquoise = colorConstructor("#40e0d0");
    
    //V//
    color.violet = colorConstructor("#ee82ee");

    //W//
    color.wheat = colorConstructor("#f5deb3");
    color.white = colorConstructor("#ffffff");
    color.whiteSmoke = colorConstructor("#f5f5f5");

    //Y//
    color.yellow = colorConstructor("#ffff00");
    color.yellowGreen = colorConstructor("#9acd32");
}