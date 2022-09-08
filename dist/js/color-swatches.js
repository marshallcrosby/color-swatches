/*!
    * Color Swatches v1.2.1
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

var GradientParser = (window.GradientParser || {});

// Copyright (c) 2014 Rafael Caricio. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var GradientParser = (GradientParser || {});

GradientParser.parse = (function() {

  var tokens = {
    linearGradient: /^(\-(webkit|o|ms|moz)\-)?(linear\-gradient)/i,
    repeatingLinearGradient: /^(\-(webkit|o|ms|moz)\-)?(repeating\-linear\-gradient)/i,
    radialGradient: /^(\-(webkit|o|ms|moz)\-)?(radial\-gradient)/i,
    repeatingRadialGradient: /^(\-(webkit|o|ms|moz)\-)?(repeating\-radial\-gradient)/i,
    sideOrCorner: /^to (left (top|bottom)|right (top|bottom)|left|right|top|bottom)/i,
    extentKeywords: /^(closest\-side|closest\-corner|farthest\-side|farthest\-corner|contain|cover)/,
    positionKeywords: /^(left|center|right|top|bottom)/i,
    pixelValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))px/,
    percentageValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))\%/,
    emValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))em/,
    angleValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))deg/,
    startCall: /^\(/,
    endCall: /^\)/,
    comma: /^,/,
    hexColor: /^\#([0-9a-fA-F]+)/,
    literalColor: /^([a-zA-Z]+)/,
    rgbColor: /^rgb/i,
    rgbaColor: /^rgba/i,
    number: /^(([0-9]*\.[0-9]+)|([0-9]+\.?))/
  };

  var input = '';

  function error(msg) {
    var err = new Error(input + ': ' + msg);
    err.source = input;
    throw err;
  }

  function getAST() {
    var ast = matchListDefinitions();

    if (input.length > 0) {
      error('Invalid input not EOF');
    }

    return ast;
  }

  function matchListDefinitions() {
    return matchListing(matchDefinition);
  }

  function matchDefinition() {
    return matchGradient(
            'linear-gradient',
            tokens.linearGradient,
            matchLinearOrientation) ||

          matchGradient(
            'repeating-linear-gradient',
            tokens.repeatingLinearGradient,
            matchLinearOrientation) ||

          matchGradient(
            'radial-gradient',
            tokens.radialGradient,
            matchListRadialOrientations) ||

          matchGradient(
            'repeating-radial-gradient',
            tokens.repeatingRadialGradient,
            matchListRadialOrientations);
  }

  function matchGradient(gradientType, pattern, orientationMatcher) {
    return matchCall(pattern, function(captures) {

      var orientation = orientationMatcher();
      if (orientation) {
        if (!scan(tokens.comma)) {
          error('Missing comma before color stops');
        }
      }

      return {
        type: gradientType,
        orientation: orientation,
        colorStops: matchListing(matchColorStop)
      };
    });
  }

  function matchCall(pattern, callback) {
    var captures = scan(pattern);

    if (captures) {
      if (!scan(tokens.startCall)) {
        error('Missing (');
      }

      var result = callback(captures);

      if (!scan(tokens.endCall)) {
        error('Missing )');
      }

      return result;
    }
  }

  function matchLinearOrientation() {
    return matchSideOrCorner() ||
      matchAngle();
  }

  function matchSideOrCorner() {
    return match('directional', tokens.sideOrCorner, 1);
  }

  function matchAngle() {
    return match('angular', tokens.angleValue, 1);
  }

  function matchListRadialOrientations() {
    var radialOrientations,
        radialOrientation = matchRadialOrientation(),
        lookaheadCache;

    if (radialOrientation) {
      radialOrientations = [];
      radialOrientations.push(radialOrientation);

      lookaheadCache = input;
      if (scan(tokens.comma)) {
        radialOrientation = matchRadialOrientation();
        if (radialOrientation) {
          radialOrientations.push(radialOrientation);
        } else {
          input = lookaheadCache;
        }
      }
    }

    return radialOrientations;
  }

  function matchRadialOrientation() {
    var radialType = matchCircle() ||
      matchEllipse();

    if (radialType) {
      radialType.at = matchAtPosition();
    } else {
      var extent = matchExtentKeyword();
      if (extent) {
        radialType = extent;
        var positionAt = matchAtPosition();
        if (positionAt) {
          radialType.at = positionAt;
        }
      } else {
        var defaultPosition = matchPositioning();
        if (defaultPosition) {
          radialType = {
            type: 'default-radial',
            at: defaultPosition
          };
        }
      }
    }

    return radialType;
  }

  function matchCircle() {
    var circle = match('shape', /^(circle)/i, 0);

    if (circle) {
      circle.style = matchLength() || matchExtentKeyword();
    }

    return circle;
  }

  function matchEllipse() {
    var ellipse = match('shape', /^(ellipse)/i, 0);

    if (ellipse) {
      ellipse.style =  matchDistance() || matchExtentKeyword();
    }

    return ellipse;
  }

  function matchExtentKeyword() {
    return match('extent-keyword', tokens.extentKeywords, 1);
  }

  function matchAtPosition() {
    if (match('position', /^at/, 0)) {
      var positioning = matchPositioning();

      if (!positioning) {
        error('Missing positioning value');
      }

      return positioning;
    }
  }

  function matchPositioning() {
    var location = matchCoordinates();

    if (location.x || location.y) {
      return {
        type: 'position',
        value: location
      };
    }
  }

  function matchCoordinates() {
    return {
      x: matchDistance(),
      y: matchDistance()
    };
  }

  function matchListing(matcher) {
    var captures = matcher(),
      result = [];

    if (captures) {
      result.push(captures);
      while (scan(tokens.comma)) {
        captures = matcher();
        if (captures) {
          result.push(captures);
        } else {
          error('One extra comma');
        }
      }
    }

    return result;
  }

  function matchColorStop() {
    var color = matchColor();

    if (!color) {
      error('Expected color definition');
    }

    color.length = matchDistance();
    return color;
  }

  function matchColor() {
    return matchHexColor() ||
      matchRGBAColor() ||
      matchRGBColor() ||
      matchLiteralColor();
  }

  function matchLiteralColor() {
    return match('literal', tokens.literalColor, 0);
  }

  function matchHexColor() {
    return match('hex', tokens.hexColor, 1);
  }

  function matchRGBColor() {
    return matchCall(tokens.rgbColor, function() {
      return  {
        type: 'rgb',
        value: matchListing(matchNumber)
      };
    });
  }

  function matchRGBAColor() {
    return matchCall(tokens.rgbaColor, function() {
      return  {
        type: 'rgba',
        value: matchListing(matchNumber)
      };
    });
  }

  function matchNumber() {
    return scan(tokens.number)[1];
  }

  function matchDistance() {
    return match('%', tokens.percentageValue, 1) ||
      matchPositionKeyword() ||
      matchLength();
  }

  function matchPositionKeyword() {
    return match('position-keyword', tokens.positionKeywords, 1);
  }

  function matchLength() {
    return match('px', tokens.pixelValue, 1) ||
      match('em', tokens.emValue, 1);
  }

  function match(type, pattern, captureIndex) {
    var captures = scan(pattern);
    if (captures) {
      return {
        type: type,
        value: captures[captureIndex]
      };
    }
  }

  function scan(regexp) {
    var captures,
        blankCaptures;

    blankCaptures = /^[\n\r\t\s]+/.exec(input);
    if (blankCaptures) {
        consume(blankCaptures[0].length);
    }

    captures = regexp.exec(input);
    if (captures) {
        consume(captures[0].length);
    }

    return captures;
  }

  function consume(size) {
    input = input.substr(size);
  }

  return function(code) {
    input = code.toString();
    return getAST();
  };
})();

// Copyright (c) 2014 Rafael Caricio. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var GradientParser = (GradientParser || {});

GradientParser.stringify = (function() {

  var visitor = {

    'visit_linear-gradient': function(node) {
      return visitor.visit_gradient(node);
    },

    'visit_repeating-linear-gradient': function(node) {
      return visitor.visit_gradient(node);
    },

    'visit_radial-gradient': function(node) {
      return visitor.visit_gradient(node);
    },

    'visit_repeating-radial-gradient': function(node) {
      return visitor.visit_gradient(node);
    },

    'visit_gradient': function(node) {
      var orientation = visitor.visit(node.orientation);
      if (orientation) {
        orientation += ', ';
      }

      return node.type + '(' + orientation + visitor.visit(node.colorStops) + ')';
    },

    'visit_shape': function(node) {
      var result = node.value,
          at = visitor.visit(node.at),
          style = visitor.visit(node.style);

      if (style) {
        result += ' ' + style;
      }

      if (at) {
        result += ' at ' + at;
      }

      return result;
    },

    'visit_default-radial': function(node) {
      var result = '',
          at = visitor.visit(node.at);

      if (at) {
        result += at;
      }
      return result;
    },

    'visit_extent-keyword': function(node) {
      var result = node.value,
          at = visitor.visit(node.at);

      if (at) {
        result += ' at ' + at;
      }

      return result;
    },

    'visit_position-keyword': function(node) {
      return node.value;
    },

    'visit_position': function(node) {
      return visitor.visit(node.value.x) + ' ' + visitor.visit(node.value.y);
    },

    'visit_%': function(node) {
      return node.value + '%';
    },

    'visit_em': function(node) {
      return node.value + 'em';
    },

    'visit_px': function(node) {
      return node.value + 'px';
    },

    'visit_literal': function(node) {
      return visitor.visit_color(node.value, node);
    },

    'visit_hex': function(node) {
      return visitor.visit_color('#' + node.value, node);
    },

    'visit_rgb': function(node) {
      return visitor.visit_color('rgb(' + node.value.join(', ') + ')', node);
    },

    'visit_rgba': function(node) {
      return visitor.visit_color('rgba(' + node.value.join(', ') + ')', node);
    },

    'visit_color': function(resultColor, node) {
      var result = resultColor,
          length = visitor.visit(node.length);

      if (length) {
        result += ' ' + length;
      }
      return result;
    },

    'visit_angular': function(node) {
      return node.value + 'deg';
    },

    'visit_directional': function(node) {
      return 'to ' + node.value;
    },

    'visit_array': function(elements) {
      var result = '',
          size = elements.length;

      elements.forEach(function(element, i) {
        result += visitor.visit(element);
        if (i < size - 1) {
          result += ', ';
        }
      });

      return result;
    },

    'visit': function(element) {
      if (!element) {
        return '';
      }
      var result = '';

      if (element instanceof Array) {
        return visitor.visit_array(element, result);
      } else if (element.type) {
        var nodeVisitor = visitor['visit_' + element.type];
        if (nodeVisitor) {
          return nodeVisitor(element);
        } else {
          throw Error('Missing visitor visit_' + element.type);
        }
      } else {
        throw Error('Invalid node.');
      }
    }

  };

  return function(root) {
    return visitor.visit(root);
  };
})();


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
            :root{--cs-color-body:#1e2125;--cs-gray-100:#eee;--cs-gray-200:#e2e2e2;--cs-border-radius:18px;--cs-gutter:12px;--cs-font-size:11px;--cs-box-shadow-deep:0 15px 80px 0 rgba(0, 0, 0, 0.12);--cs-box-shadow-shallow:2px 2px 10px rgba(0, 0, 0, .2)}.color-swatch *{box-sizing:border-box}.color-swatches:not(.row){display:flex;flex-wrap:wrap;gap:var(--cs-gutter)}.color-swatch{border-top-left-radius:var(--cs-border-radius);border-top-right-radius:var(--cs-border-radius);border-bottom-left-radius:calc(var(--cs-border-radius) + 10px);border-bottom-right-radius:calc(var(--cs-border-radius) + 10px);box-shadow:var(--cs-box-shadow-deep);flex:1 1 0;height:100%;display:flex;flex-direction:column;color:var(--cs-color-body)}.color-swatch__color{aspect-ratio:1/1;border-top-left-radius:var(--cs-border-radius);border-top-right-radius:var(--cs-border-radius)}.color-swatch__info{padding:8px 5px 14px 5px;font-size:var(--cs-font-size);font-weight:700;font-family:sans-serif;display:flex;flex-direction:column;background-color:#fff;border-bottom-left-radius:var(--cs-border-radius);border-bottom-right-radius:var(--cs-border-radius);flex:1}.color-swatch__copy-btn{border:0;background:0 0;cursor:pointer;display:inline-flex;align-items:center;margin:0 10px;white-space:nowrap;overflow:hidden;width:calc(100% - 5px);position:relative;-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 15px),transparent 100%);mask-image:linear-gradient(to right,#000 calc(100% - 15px),transparent 100%)}.color-swatch__copy-btn:hover{overflow:visible;-webkit-mask-image:none;mask-image:none}.color-swatch__copy-btn:hover .color-swatch__value:after{opacity:1}.color-swatch__copy-btn:hover .color-swatch__copy-bubble{opacity:1}.color-swatch__copy-btn:active .color-swatch__copy-bubble{opacity:.75}.color-swatch__value{position:relative;margin-left:5px}.color-swatch__value:after{content:"";position:absolute;top:-5px;left:-9px;width:calc(100% + 18px);height:25px;background:var(--cs-gray-100);z-index:0;border-radius:20px;opacity:0;transition:opacity .1s linear}.color-swatch__value__text{position:relative;z-index:1}.color-swatch__copy-bubble{display:inline-flex;height:20px;background:var(--cs-color-body);color:#fff;text-transform:uppercase;font-size:9px;padding:3px 12px;border-radius:20px;justify-content:center;align-items:center;line-height:0;margin-left:15px;position:relative;box-shadow:var(--cs-box-shadow-shallow);opacity:0;z-index:1}.color-swatch__copy-bubble:after{position:absolute;right:calc(100% - 1px);content:"";width:0;height:0;border-style:solid;border-width:4px 6.9px 4px 0;border-color:transparent var(--cs-color-body) transparent transparent}.color-swatch__code{display:flex;position:relative}.color-swatch__type{font-weight:400;margin-right:5px;min-width:10px;opacity:.7}.color-swatch__color-stops{margin-left:10px}

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
//# sourceMappingURL=color-swatches.js.map