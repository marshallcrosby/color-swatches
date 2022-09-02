/*!
    * Color Swatches v1.0.3
    * Plugin that makes it easy to render color swatches.
    *
    * Copyright 2021-2022 Marshall Crosby
    * https://marshallcrosby.com
*/

/* -----------------------------------------------------------------------------
    TODOS:
    ✓ Allow inline css background-color
    ✓ Allow color class
    • Setup gulp
    • Display hsl(a) in a good way when it's too long
----------------------------------------------------------------------------- */

(function () {
    "use strict"
    
    // Convert rgb(a) to hex
    const rgbaToHex = (rgba) => `#${rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/).slice(1).map((n, i) => (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n)).toString(16).padStart(2, '0').replace('NaN', '')).join('')}`;

    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }
                    
    // Swatch CSS
    const swatchStyles = /* css */`
        :root {
            --cs-color-body: #1e2125;
            --cs-gray-100: #eee;
            --cs-gray-200: #e2e2e2;
            --cs-border-radius: 18px;
            --cs-gutter: 12px;
            --cs-font-size: 11px;
            --cs-box-shadow: 0 15px 80px 0 rgba(0, 0, 0, 0.12);
        }

        .color-swatch * {
            box-sizing: border-box;
        }

        .color-swatches:not(.row) {
            display: flex;
            flex-wrap: wrap;
            gap: var(--cs-gutter);
        }

        .color-swatch {
            border-top-left-radius: var(--cs-border-radius);
            border-top-right-radius: var(--cs-border-radius);
            border-bottom-left-radius: calc(var(--cs-border-radius) + 10px);
            border-bottom-right-radius: calc(var(--cs-border-radius) + 10px);
            box-shadow: var(--cs-box-shadow);
            flex: 1 1 0;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .color-swatch__color {
            aspect-ratio: 1 / 1;
            border-top-left-radius: var(--cs-border-radius);
            border-top-right-radius: var(--cs-border-radius);
        }

        .color-swatch__info {
            padding: 8px 5px 14px 5px;
            font-size: var(--cs-font-size);
            font-weight: 700;
            font-family: sans-serif;
            display: flex;
            flex-direction: column;
            background-color: #fff;
            border-bottom-left-radius: var(--cs-border-radius);
            border-bottom-right-radius: var(--cs-border-radius);
            flex: 1;
        }

        .color-swatch__copy-btn {
            border: 0;
            background: transparent;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            margin: 0 10px;
            white-space: nowrap;
            overflow: hidden;
        }

        .color-swatch__copy-btn:hover {
            overflow: visible;
        }

        .color-swatch__value  {
            position: relative;
            margin-left: 5px;
        }

        .color-swatch__value__text {
            position: relative;
            z-index: 1;
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
            z-index: 1;
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

        .color-swatch__copy-btn:hover .color-swatch__value {
            text-decoration: underline;
        }

        .color-swatch__copy-btn:hover .color-swatch__copy-bubble {
            opacity: 1;
        }

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
            min-width: 21px;
        }

        .color-swatch__color-stops {
            margin-left: 10px;
        }
    `;

    // Add styles to head
    const swatchStyleTag = document.createElement('style');
    swatchStyleTag.setAttribute('id', 'swatchesStyle');
    swatchStyleTag.textContent = swatchStyles;
    document.head.appendChild(swatchStyleTag);

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
        </div>
    `;

    function renderSwatches () {

        // Render swatch elements
        document.querySelectorAll('[data-swatch-color]').forEach(swatchEl => {
            swatchEl.classList.add('color-swatch');
            swatchEl.innerHTML = swatchInnerEls;
            
            const colorEl = swatchEl.querySelector('.color-swatch__color');
            const hexEl = swatchEl.querySelector('.color-swatch__code--hex');
            const varEl = swatchEl.querySelector('.color-swatch__code--var');
            const rgbEl = swatchEl.querySelector('.color-swatch__code--rgb');
            const hslEl = swatchEl.querySelector('.color-swatch__hsl');
            const currentBgColor = getComputedStyle(swatchEl).backgroundColor;        
    
            colorEl.style.backgroundColor = (swatchEl.getAttribute('data-swatch-color') === '') ? currentBgColor.toString() : swatchEl.getAttribute('data-swatch-color');
    
            const bgColor = getComputedStyle(colorEl).backgroundColor;
            const varValue = (colorEl.style.getPropertyValue('background-color').toString().includes('var(--')) ? colorEl.style.getPropertyValue('background-color').toString().replace(/var\(|\)/g, '') : null;
    
            hexEl.innerHTML =  /* html */`
                <span class="color-swatch__type">hex:</span>
                <span class="color-swatch__value">
                    <span class="color-swatch__value__text">
                        ${rgbaToHex(bgColor).toUpperCase()}
                    </span>
                </span>
            `;
            
            rgbEl.innerHTML =  /* html */`
                <span class="color-swatch__type">rgb:</span>
                <span class="color-swatch__value">
                    <span class="color-swatch__value__text">${bgColor}</span>
                </span>
            `;
            
            // hslEl.innerHTML = `<span class="color-swatch__type">hsl:</span> <span class="color-swatch__value">${rgbaToHsla(bgColor)}</span>`;
            
            if (varValue !== null) {
                varEl.innerHTML =  /* html */`
                    <span class="color-swatch__type">var:</span>
                    <span class="color-swatch__value">
                        <span class="color-swatch__value__text">${varValue}</span>
                    </span>
                `;
            } else {
                varEl.closest('.color-swatch__copy-btn').remove();
            }
    
            // Parse gradient settings
            colorEl.style.backgroundImage = (swatchEl.getAttribute('data-swatch-color') === '') ? getComputedStyle(swatchEl).backgroundImage.toString() : swatchEl.getAttribute('data-swatch-color');
            const cssBgGradient = getComputedStyle(colorEl).backgroundImage;
            const gradientVarValue = (colorEl.style.getPropertyValue('background-image').toString().includes('var(--')) ? colorEl.style.getPropertyValue('background-image').toString().replace(/var\(|\)/g, '') : null;
            let cssGradientArray = null;    
            
            
            if (cssBgGradient.toString().includes('linear-gradient') || cssBgGradient.toString().includes('radial-gradient') || cssGradientArray !== null) {
                
                const colorInfo = swatchEl.querySelector('.color-swatch__info');
                
                // Clear info
                colorInfo.innerHTML = '';
    
                const emptyEntryEl = /* html */`
                    <div class="color-swatch__copy-btn" role="button" tabindex="0">
                        <span class="color-swatch__code">
                            <span class="color-swatch__type"></span>
                            <span class="color-swatch__value">
                                <span class="color-swatch__value__text">
                                </span>
                            </span>
                        </span>
                        <span class="color-swatch__copy-bubble">Copy</span>
                    </div>
                `;
    
                const gradientObject = GradientParser.parse(cssBgGradient);
                for (let i = 0, len = gradientObject.length; i < len; ++i) {
                    let gradType = gradientObject[i].type;
                    
                    const gradTypeEntry = htmlToElement(emptyEntryEl);
                    gradTypeEntry.querySelector('.color-swatch__type').innerText = 'type:';
                    gradTypeEntry.querySelector('.color-swatch__value__text').innerText = gradType;
                    colorInfo.appendChild(gradTypeEntry);
    
                    console.log(gradType);
    
                    let grad = gradientObject[i];
    
                    if (grad.colorStops.length) {
                        const gradColorStopsEntryHtml = /* html */`
                            <div class="color-swatch__color-stops">
                                <div class="color-swatch__type">color stops:</div>
                                <div class="color-swatch__color-stops__entries">
                                </div>
                            </div>
                        `;
        
                        const gradStopEntry = htmlToElement(gradColorStopsEntryHtml);
                        // gradStopEntry.querySelector('.color-swatch__value__text').innerText = colorStopValue;
                        colorInfo.appendChild(gradStopEntry);
    
                        for (let i = 0, len = grad.colorStops.length; i < len; ++i) {
                            let stop = grad.colorStops[i];
                            
                            let colorFull = '';
                            if (stop.type === 'rgb') {
                                colorFull = rgbaToHex(`rgb(${stop.value})`);
                            }
                            
                            if (stop.type === 'rgba') {
                                colorFull = `rgba(${stop.value.toString().replace(/,/g, ', ')})`;
                            }
                            
                            if (stop.type === 'hex') {
                                colorFull = rgbaToHex(`#${stop.value}`);
                            }
        
                            let stopFull = '';
                            if (stop.length !== undefined) {
                                stopFull = ` ${stop.length.value}${stop.length.type}`
                            }
        
                            const colorStopValue = `${colorFull}${stopFull}`;
                            const gradColorStopEntry = htmlToElement(emptyEntryEl);
        
                            gradColorStopEntry.querySelector('.color-swatch__type').innerText = (i + 1) + '.';
                            gradColorStopEntry.querySelector('.color-swatch__value__text').innerText = colorStopValue;
                            colorInfo.querySelector('.color-swatch__color-stops__entries').appendChild(gradColorStopEntry);
                        }
                    }
                }
    
                if (gradientVarValue !== null) {
                    const gradientVarEntry = htmlToElement(emptyEntryEl);
                    gradientVarEntry.querySelector('.color-swatch__type').innerText = `var:`;
                    gradientVarEntry.querySelector('.color-swatch__value__text').innerText = `${gradientVarValue}`;
                    colorInfo.appendChild(gradientVarEntry);
                }
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
    }

    // Thanks to gradient-parser.js. Project repo: https://github.com/rafaelcaricio/gradient-parser
    const gradientParserScript = `https://cdn.jsdelivr.net/npm/gradient-parser@1.0.2/build/web.js`;
    const scriptEl = document.createElement('script');
    scriptEl.src = gradientParserScript;
    document.head.appendChild(scriptEl);
    scriptEl.onload = function () {
        renderSwatches();
    };

})();