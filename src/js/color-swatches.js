/*!
    * Color Swatches v1.2.2
    * Plugin that makes it easy to render color swatches.
    *
    * Copyright 2021-2022 Marshall Crosby
    * https://marshallcrosby.com
*/

/* -----------------------------------------------------------------------------
    TODOS:
    ✓ Allow inline css background-color
    ✓ Allow color class
    ✓ Setup gulp
    ✓ Display gradient
----------------------------------------------------------------------------- */

/*! --------------------------------------------------------------------------
    Thanks to Rafael Carício's gradient-parser.js.
    Project repo: https://github.com/rafaelcaricio/gradient-parser
---------------------------------------------------------------------------- */

//=require ../../node_modules/gradient-parser/build/web.js

(function () {
    "use strict"

    /* --------------------------------------------------------------------------
        Query params
    ---------------------------------------------------------------------------- */

    const scriptLinkage = document.getElementById('color-swatches-js') || document.querySelector('script[src*=color-swatches]');
        
    const param = {
        css: null
    }

    if (scriptLinkage) {
        const urlParam = new URLSearchParams(scriptLinkage.getAttribute('src').split('?')[1]);
        param.css = urlParam.get('css');
    }

    if (param.css !== 'external') {         
        // Swatch CSS. Import from css file via gulp
        const swatchStyles = `
            //import color-swatches.css
        `;

        // Add styles to head
        const swatchStyleTag = document.createElement('style');
        swatchStyleTag.setAttribute('id', 'swatchesStyle');
        swatchStyleTag.textContent = swatchStyles;
        document.head.appendChild(swatchStyleTag);
    }

    /* --------------------------------------------------------------------------
        Functions
    ---------------------------------------------------------------------------- */

    // Convert rgb(a) to hex
    const rgbaToHex = (rgba) => `#${rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/).slice(1).map((n, i) => (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n)).toString(16).padStart(2, '0').replace('NaN', '')).join('')}`;

    // Build DOM element from html string
    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    /* --------------------------------------------------------------------------
        Swatch component markup
    ---------------------------------------------------------------------------- */

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

    /* --------------------------------------------------------------------------
        Render swatch elements
    ---------------------------------------------------------------------------- */

    document.querySelectorAll('[data-swatch-color]').forEach(swatchEl => {
        swatchEl.classList.add('color-swatch');
        swatchEl.innerHTML = swatchInnerEls;
        
        const colorEl = swatchEl.querySelector('.color-swatch__color');
        const hexEl = swatchEl.querySelector('.color-swatch__code--hex');
        const varEl = swatchEl.querySelector('.color-swatch__code--var');
        const rgbEl = swatchEl.querySelector('.color-swatch__code--rgb');
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

                    let shortStopLabelsThree = ['start', 'mid', 'end'];
                    let shortStopLabelsTwo = ['start', 'end'];
                    
                    for (let i = 0, len = grad.colorStops.length; i < len; ++i) {
                        let stop = grad.colorStops[i];
                        let stopLabels = (len === 3) ? shortStopLabelsThree[i] + ':' : (len === 2) ? shortStopLabelsTwo[i] + ':' : (i + 1) + '.' ;

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
    
                        gradColorStopEntry.querySelector('.color-swatch__type').innerText = stopLabels;
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


    /* --------------------------------------------------------------------------
        Copy button
    ---------------------------------------------------------------------------- */

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