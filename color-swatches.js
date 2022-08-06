/*!
    * Color Swatches v1.0.1
    * Plugin that makes it easy to render color swatches.
    *
    * Copyright 2021-2022 Marshall Crosby
    * https://marshallcrosby.com
*/

(function () {
    "use strict"
    
    // Convert rgb(a) to hex
    const rgbaToHex = (rgba) => `#${rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/).slice(1).map((n, i) => (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n)).toString(16).padStart(2, '0').replace('NaN', '')).join('')}`

    /*
        Convert rgb(a) to hsl(a)
        With help from https://css-tricks.com/converting-color-spaces-in-javascript/
    */

    function rgbaToHsla(rgbaArg) {
        let rgba = rgbaArg.replace(/[^\d,.]/g, '').split(',');
        
        for (let R in rgba) {
            let r = rgba[R];
            
            if (r.indexOf('%') > -1) {
                let p = r.substr(0, r.length - 1) / 100;
                
                if (R < 3) {
                    rgba[R] = Math.round(p * 255);
                } else {
                    rgba[R] = p;
                }
            }
        }

        // Make r, g, and b fractions of 1
        let r = rgba[0] / 255;
        let g = rgba[1] / 255;
        let b = rgba[2] / 255;
        let a = rgba[3];

        // Find greatest and smallest channel values
        let cmin = Math.min(r,g,b);
        let cmax = Math.max(r,g,b);
        let delta = cmax - cmin;
        let h = 0;
        let s = 0;
        let l = 0;

        //
        // Calculate hue
        //
        
        // No difference
        if (delta === 0) {
            h = 0;
        } else if (cmax === r) {
            
            // Red is max
            h = ((g - b) / delta) % 6;
        } else if (cmax === g) {
            
            // Green is max
            h = (b - r) / delta + 2;
        } else {

            // Blue is max
            h = (r - g) / delta + 4;
        }
        
        h = Math.round(h * 60);
            
        // Make negative hues positive behind 360°
        if (h < 0) {
            h += 360;
        }

        //
        // Calculate lightness
        //

        l = (cmax + cmin) / 2;

        //
        // Calculate saturation
        //

        s = (delta === 0) ? 0 : delta / (1 - Math.abs(2 * l - 1));

        // Multiply l and s by 100 to make percentage value
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);

        if (a !== undefined) {
            return 'hsla(' + h + ', ' + s + '%, ' +l + '%, ' + a + ')';
        } else {
            return 'hsl(' + h + ', ' + s + '%, ' +l + '%)';
        }
    }

    const copyIconSvg = /* html */`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path d="M384 96L384 0h-112c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48H464c26.51 0 48-21.49 48-48V128h-95.1C398.4 128 384 113.6 384 96zM416 0v96h96L416 0zM192 352V128h-144c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h192c26.51 0 48-21.49 48-48L288 416h-32C220.7 416 192 387.3 192 352z"/>
        </svg>
    `;

                    
    // Swatch component markup
    const swatchInnerEls = /* html */`
        <div class="color-swatch__color"></div>
        <div class="color-swatch__info">
            <div class="color-swatch__copy-btn" role="button" tabindex="0">
                <span class="color-swatch__code color-swatch__code--hex"></span>
                <span class="color-swatch__copy-bubble">Copy</span>
            </div>
            <div class="color-swatch__copy-btn" role="button" tabindex="0">
                <span class="color-swatch__code color-swatch__code--rgb"></span>
                <span class="color-swatch__copy-bubble">Copy</span>
            </div>
            <div class="color-swatch__copy-btn" role="button" tabindex="0">
                <span class="color-swatch__code color-swatch__code--var"></span>
                <span class="color-swatch__copy-bubble">Copy</span>
            </div>
            <!--
            <div class="color-swatch__copy-btn" role="button">
                <span class="color-swatch__hsl"></span>
                <span class="color-swatch__copy-bubble">Copy</span>
            </div>
            -->
        </div>
    `;

    // Swatch CSS
    const swatchStyles = /* css */`
        :root {
            --cs-color-body: #1e2125;
            --cs-border-radius: 18px;
        }

        .color-swatches:not(.row) {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .color-swatch {
            border-radius: var(--cs-border-radius);
            box-shadow: 0 15px 80px 0 rgba(0, 0, 0, 0.12);
            flex: 1 1 0;
            height: 100%;
        }

        .color-swatch__color {
            aspect-ratio: 1 / 1;
            border-top-left-radius: var(--cs-border-radius);
            border-top-right-radius: var(--cs-border-radius);
        }

        .color-swatch__info {
            padding: 8px 5px;
            font-size: 11px;
            font-weight: 700;
            font-family: sans-serif;
            display: flex;
            flex-direction: column;
        }

        .color-swatch__copy-btn {
            border: 0;
            background: transparent;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            padding: 0 10px;
            border-radius: 20px;
            white-space: nowrap;
        }

        .color-swatch__value  {
            position: relative;
            margin-left: 5px;
        }

        .color-swatch__value:after {
            content: '';
            position: absolute;
            top: -5px;
            left: -9px;
            width: calc(100% + 18px);
            height: 25px;
            background: #eee;
            z-index: -1;
            border-radius: 20px;
            opacity: 0;
            transition: opacity 100ms linear;
        }

        .color-swatch__copy-bubble {
            display: inline-flex;
            height: 20px;
            background: var(--cs-color-body);
            color: #fff;
            text-transform: uppercase;
            font-size: 9px;
            padding: 3px 12px;
            border-radius: 20px;
            justify-content: center;
            align-items: center;
            line-height: 0;
            margin-left: 15px;
            position: relative;
            box-shadow: 2px 2px 10px rgba(0, 0, 0, .2);
            opacity: 0;
            transition: opacity 100ms linear;
        }

        .color-swatch__copy-bubble:after {
            position: absolute;
            right: calc(100% - 1px);
            content: '';
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 4px 6.9px 4px 0;
            border-color: transparent var(--cs-color-body) transparent transparent;
        }

        .color-swatch__copy-btn:hover .color-swatch__value:after,
        .color-swatch__copy-btn:hover .color-swatch__copy-bubble {
            opacity: 1;
        }

        .color-swatch__copy-btn:active .color-swatch__value:after,
        .color-swatch__copy-btn:active .color-swatch__copy-bubble {
            opacity: .75;
        }

        .color-swatch__code--hex,
        .color-swatch__code--rgb,
        .color-swatch__code--var {
            display: flex;
            position: relative;
        }

        .color-swatch__type {
            font-weight: normal;
            margin-right: 5px;
        }
    `;

    // Add styles to head
    const swatchStyleTag = document.createElement('style');
    swatchStyleTag.setAttribute('id', 'swatchesStyle');
    swatchStyleTag.textContent = swatchStyles;
    document.head.appendChild(swatchStyleTag);

    // Render swatch elements
    document.querySelectorAll('[data-swatch-color]').forEach(swatchEl => {
        swatchEl.classList.add('color-swatch');
        swatchEl.innerHTML = swatchInnerEls;

        const colorEl = swatchEl.querySelector('.color-swatch__color');
        const hexEl = swatchEl.querySelector('.color-swatch__code--hex');
        const varEl = swatchEl.querySelector('.color-swatch__code--var');
        const rgbEl = swatchEl.querySelector('.color-swatch__code--rgb');
        const hslEl = swatchEl.querySelector('.color-swatch__hsl');
        
        colorEl.style.backgroundColor = swatchEl.getAttribute('data-swatch-color');
        
        const bgColor = getComputedStyle(colorEl).backgroundColor;
        const varValue = (colorEl.style.getPropertyValue('background-color').toString().includes('var(--')) ? colorEl.style.getPropertyValue('background-color').toString().replace(/var\(|\)/g, '') : null;

        hexEl.innerHTML = '<span class="color-swatch__type">hex:</span> <span class="color-swatch__value">' + rgbaToHex(bgColor).toUpperCase() + '</span>';
        rgbEl.innerHTML = '<span class="color-swatch__type">rgb:</span> <span class="color-swatch__value">' + bgColor + '</span>';
        // hslEl.innerHTML = '<span class="color-swatch__type">hsl:</span> <span class="color-swatch__value">' + rgbaToHsla(bgColor) + '</span>';
        
        if (varValue !== null) {
            varEl.innerHTML = '<span class="color-swatch__type">var:</span> <span class="color-swatch__value">' + varValue + '</span>';
        } else {
            varEl.closest('.color-swatch__copy-btn').remove();
        }
    });

    // Copy button
    const copyButton = document.querySelectorAll('.color-swatch__copy-btn');
    copyButton.forEach((item) => {
        item.addEventListener('click', function () {
            navigator.clipboard.writeText(item.querySelector('.color-swatch__value').innerText);
            item.querySelector('.color-swatch__copy-bubble').innerText = 'Copied';
        });

        item.addEventListener('mouseout', function () {
            let itemBubble = item.querySelector('.color-swatch__copy-bubble');
            let itemBubbleText = itemBubble.innerText.toLowerCase();
            if (itemBubbleText.includes('copied')) {
                setTimeout(function () {
                    itemBubble.innerText = 'Copy';
                }, 100);
            }
        });
    });
})();