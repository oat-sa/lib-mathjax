/****************************
 * MathJax/extensions/HighlightingAssist.js
 *
 * This allows highlighting of elements within a math equation using MathJax.
 *
 * Development build.
 * Written by Stuart McWilliams, Texthelp Ltd.
*/

MathJax.Hub.Highlight =
{
  elementHelper:(
    function ()
    {
      function LoopState()
      {
        var self = this;
        this.count = 1; // When loop starts already at the second element
        this.list = [];

        this.pushToList = function(obj)
        {
            self.list.push(obj);
        }
      }

      // Recursive loop through the dom.
      // Adds elements in given range to the list
      // Returns true when gone as far as it needs to go.
      function looper(dataElem, start, end, state)
      {
        if (!dataElem.inferred)
        {
          // If it is a token, could have multiple characters in a single item.  These are all references by separate
          // numbers for the start/end values even though they are a single math element. Just add the element once
          // even if matched several times.
          if (dataElem.isToken)
          {
            if (dataElem.data[0] && dataElem.data[0].type === "chars" && typeof(dataElem.data[0].data[0]) === "string")
            {
              var token = dataElem.data[0].data[0];
              if (token.length > 1)
              {
                var isMatch = false;
                for (var i = 0, nLen = token.length; i < nLen; i++)
                {
                  ++state.count;
                  if (state.count >= start && state.count <= end)
                  {
                    isMatch = true;
                  }
                }
                if (isMatch)
                {
                  state.pushToList(dataElem);
                }
              }
            }
          }

          ++state.count;
          if (state.count >= start && state.count <= end)
          {
            state.pushToList(dataElem);
          }
        }

        if (state.count >= end)
        {
          return true;
        }

        if (dataElem.type === "mspace")
        {   // don't go to children of this if any (based on toMathML skipping this
          return false;
        }

        for (var i = 0, nLen = dataElem.data.length; i < nLen; i++)
        {
          if(dataElem.data[i].type !== "chars")
          {
            if(looper(dataElem.data[i], start, end, state))
            {
              return true;
            }
          }
        }

        return false;
      }

      return {
        // Get list of math jax elements.
        // Pass in the root from the jax object for the equation.
        // Then the start and end are the count of mathml elements, starting at 1 for the math element.
        getList:function (root, start, end)
        {
          var state = new LoopState();

          if (start === 1)
          {
            state.pushToList(root);
          }

          looper(root.data[0], start, end, state);

          return state.list;
        }
      };
    }
  )(),

  // Pass in the jax object of the equation that is to be highlighted
  getHighlighter:(function ()
  {
    // add in hash and class and only return function that uses them
    var highlighterHash = {};

    var Highlighter = function (jax)
    {
      var HighlightData = function ()
      {
        this.style = null;
        this.fg = null;
        this.bg = null;
        this.lastStart = 0;
        this.lastEnd = 0;
      };
      var highlightDataStore = {}; // stores highlight data for given type.
      var highlightJaxRoot = jax.root;
      var highlightClearLast = true;

      // Set whether or not the previous highlight should be cleared when adding new one.
      // If set to false and highlights added the old highlights are not stored and adding a new highlight
      // does not clear the old one.  Calling clearHighlights() will not remove them.  Setting this to true
      // will only affect highlights added after it is set true.
      // The caller needs to keep its own record of highlights added while this is false.
      this.setClearLastHighlight = function (b)
      {
        highlightClearLast = b;
      };

      // type "context" or "word" or custom value matched to highlightNodes call.
      // style  "outline", "underline", "fg" or "bg"
      // r g b value 0-255
      // returns true if style updated, false otherwise
      this.setHighlightStyle = function (type, style, r, g, b)
      {
        if (typeof(type) !== "string")
        {
          return false;
        }

        // need to check if there is currently highlighting for this type, if so need to remove this
        // prior to changing or removing the style for this type.
        if (highlightDataStore[type] && highlightDataStore.hasOwnProperty(type))
        {
          var tmpData = highlightDataStore[type];
          if (tmpData && tmpData.lastStart > 0 && tmpData.lastStart > 0)
          {
            clearHighlightNodesImpl(type, tmpData.style, tmpData.lastStart, tmpData.lastEnd)
          }
        }

        if (style === null)
        {
          delete highlightDataStore[type];
          return true;
        }

        if (typeof(style) === "string")
        {
          style = style.toLowerCase();
        }
        else
        {
          return false;
        }

        if (style === "")
        {
          delete highlightDataStore[type];
          return true;
        }

        var nR, nG, nB;
        try
        {
          nR = parseColor(r);
          nG = parseColor(g);
          nB = parseColor(b);
        }
        catch (err)
        {   // invalid values passed in
          return false;
        }

        var data;

        if (highlightDataStore[type] && highlightDataStore.hasOwnProperty(type))
        {
          data = highlightDataStore[type];
          // If is already highlight and adding highlight might want existing fg or bg kept.
          // if existing style is not highlight, always want to clear values.
          if (data.style !== "highlight")
          {
            data.fg = null;
            data.bg = null;
          }
        }
        else {
          data = new HighlightData();
        }

        if (style === "fg")
        {
          data.style = "highlight";
          data.fg = "rgb(" + nR + "," + nG + "," + nB + ")";
        }
        else if (style === "bg")
        {
          data.style = "highlight";
          data.bg = "rgb(" + nR + "," + nG + "," + nB + ")";
        }
        else if (style === "outline")
        {
          data.style = style;
          data.fg = "rgb(" + nR + "," + nG + "," + nB + ")";
          data.bg = null;
        }
        else if (style === "underline")
        {
          data.style = style;
          data.fg = "rgb(" + nR + "," + nG + "," + nB + ")";
          data.bg = null;
        }

        highlightDataStore[type] = data;
        return true;
      };

      // Add highlighting to elements from given range
      // type is used to select the style set for that type with setHighlightStyle (i.e. "context" or "word")
      // start and end give the inclusive range to highlight.
      this.highlightNodes = function (type, start, end)
      {
        var data;
        if (highlightDataStore[type] && highlightDataStore.hasOwnProperty(type))
        {
          data = highlightDataStore[type];
        }
        else
        {
          return;
        }
        if (data.style === null)
        {
          return;
        }

        if (data.lastStart > 0 && data.lastEnd > 0 && highlightClearLast)
        {
          clearHighlightNodesImpl(type, data.style, data.lastStart, data.lastEnd);
        }

        data.lastStart = start;
        data.lastEnd = end;

        // Pass root, then count for position of element for the start and end point to fetch, inclusive.
        var list = MathJax.Hub.Highlight.elementHelper.getList(highlightJaxRoot, start, end);

        highlightImpl(list, type, data.style, data.fg, data.bg);
      };

      // clear all highlights
      this.clearHighlights = function ()
      {
        for (var type in highlightDataStore)
        {
          if (highlightDataStore.hasOwnProperty(type))
          {
            var data = highlightDataStore[type];
            if (data.lastStart > 0 && data.lastEnd > 0)
            {
              clearHighlightNodesImpl(type, "", data.lastStart, data.lastEnd);
              data.lastStart = 0;
              data.lastEnd = 0;
            }
          }
        }
      };

      this.clearHighlightNodes = function (type, start, end)
      {
        clearHighlightNodesImpl(type, "", start, end);
      };

      function parseColor(val)
      {
        var tmpVal;
        if (typeof(val) === "string")
        {
          tmpVal = parseInt(val, 10);
        }
        else if (typeof(val) === "number")
        {
          tmpVal = val;
        }
        else
        {
          throw "invalid";
        }
        if (tmpVal < 0 || tmpVal > 255)
        {
          throw "invalid";
        }

        return tmpVal;
      }

      function clearHighlightNodesImpl(type, style, start, end)
      {
        var list = MathJax.Hub.Highlight.elementHelper.getList(highlightJaxRoot, start, end);

        for (var i = 0, nLen = list.length; i < nLen; i++)
        {
          var item = list[i];
          if (typeof(item.HTMLremoveColor) == "function")
          {
            if (style === "" || style === "outline")
            {
              delete item.mathoutline;
            }

            if (style === "" || style === "underline")
            {
              if (item.previousline)
              {
                removeFromPrevious(item.previousline, type);
                // set to what is left as last in list
                var len = item.previousline.length;
                if (len > 0)
                {
                  item.mathunderline = item.previousline[len - 1].val;
                }
                else
                {
                  item.mathunderline = "";
                }
              }
              else
              {
                item.mathunderline = "";
              }
            }

            if (style === "" || style === "highlight")
            {
              if (item.previouscolor) {
                removeFromPrevious(item.previouscolor, type);
                // set color to what is left as last in list
                var len = item.previouscolor.length;
                if (len > 0)
                {
                  item.mathcolor = item.previouscolor[len - 1].val;
                }
                else
                {
                  item.mathcolor = "";
                }
              }
              else {
                item.mathcolor = "";
              }
              delete item.mathbackground;
            }

            if (item.HTMLspanElement() == null)
            {
              return;
            }

            // fix colour
            item.HTMLhandleColor(item.HTMLspanElement(), type);

            // remove the background
            item.HTMLremoveColor(type);
          }
        }
      }

      function highlightImpl(list, type, style, fg, bg)
      {
        for (var i = 0, nLen = list.length; i < nLen; i++)
        {
          var item = list[i];

          if (typeof(item.HTMLhandleColor) == "function")
          {
            var spanElem = item.HTMLspanElement();

            if (spanElem == null)
            {
              return;
            }

            if (style === "highlight")
            {
              if (bg != null)
              {
                item.mathbackground = bg;
              }

              if (fg != null)
              {
                if (!item.previouscolor)
                {
                  item.previouscolor = [];
                  if (item.mathcolor)
                  {
                    item.previouscolor.push({"key":"", "val":item.mathcolor});
                  }
                }
                else
                {
                  removeFromPrevious(item.previouscolor, type);
                }

                item.previouscolor.push({"key":type, "val":fg});
                item.mathcolor = fg;
              }
            }
            else if (style === "outline")
            {
              item.mathoutline = fg + "thin solid";
            }
            else if (style === "underline")
            {
              if (!item.previousline)
              {
                item.previousline = [];
                if (item.textDecoration)
                {
                  item.previousline.push({"key":"", "val":item.textDecoration});
                }
              }
              else
              {
                removeFromPrevious(item.previousline, type);
              }
              item.previousline.push({"key":type, "val":"underline"});

              item.mathunderline = "underline";
              // Currently cannot set text-decoration color so color ignored for this
            }

            item.HTMLhandleColor(spanElem, type);
          }
        }
      }

      function removeFromPrevious(arr, type)
      {
        for (var i = 0; i < arr.length; i++)
        {
          if (arr[i].key === type)
          {
            arr.splice(i, 1);
            return;
          }
        }
      }
    };

    return function (jax) {
      if (highlighterHash[jax.inputID] && highlighterHash.hasOwnProperty(jax.inputID))
      {
        return highlighterHash[jax.inputID];
      }
      else
      {
        return (highlighterHash[jax.inputID] = new Highlighter(jax));
      }
    }
  })()

};


MathJax.Hub.Register.StartupHook("HTML-CSS Jax Ready",function ()
    {
      MathJax.ElementJax.mml.mbase.Augment(
          {
            "HTMLremoveColor": function (marker)
                {
                  var HTMLCSS = MathJax.OutputJax["HTML-CSS"];
                  var strSpanID =  "MathJax-Color-" + this.spanID + ((typeof(marker) === "string")?"-"+marker:"") +
                      HTMLCSS.idPostfix;
                  var color = document.getElementById(strSpanID);
                  if (color) {color.parentNode.removeChild(color)}
                }
          }
      );

      MathJax.ElementJax.mml.mbase.Augment(
          {
            "HTMLhandleColor":function (span, marker)
            {
              var HTMLCSS = MathJax.OutputJax["HTML-CSS"];
              var MML = MathJax.ElementJax.mml;
              var values = this.getValues("mathcolor", "color");
              if (this.mathbackground)
              {
                values.mathbackground = this.mathbackground
              }
              if (this.background)
              {
                values.background = this.background
              }
              if (this.style && span.style.backgroundColor)
              {
                values.mathbackground = span.style.backgroundColor;
                span.style.backgroundColor = "transparent";
              }
              var borders = (this.styles || {}).border, padding = (this.styles || {}).padding;
              if (values.color && !this.mathcolor)
              {
                values.mathcolor = values.color
              }
              if (values.background && !this.mathbackground)
              {
                values.mathbackground = values.background
              }
              if (values.mathcolor || values.mathcolor === "")
              {
                span.style.color = values.mathcolor
              }
              var mathOutline = this.mathoutline;
              var mathUnderline = this.mathunderline;
              if (typeof(mathUnderline) === "string")
              {
                span.style.textDecoration = mathUnderline;
              }
              if ((values.mathbackground && values.mathbackground !== MML.COLOR.TRANSPARENT) ||
                  borders || padding || mathOutline)
              {
                var bbox = span.bbox, dd = (bbox.exact ? 0 : 1 / HTMLCSS.em), lW = 0, rW = 0,
                    lpad = span.style.paddingLeft, rpad = span.style.paddingRight;
                if (this.isToken)
                {
                  lW = bbox.lw;
                  rW = bbox.rw - bbox.w
                }
                if (lpad !== "")
                {
                  lW += HTMLCSS.unEm(lpad) * (span.scale || 1)
                }
                if (rpad !== "")
                {
                  rW -= HTMLCSS.unEm(rpad) * (span.scale || 1)
                }
                var dw = (HTMLCSS.PaddingWidthBug || bbox.keepPadding || bbox.exactW ? 0 : rW - lW);
                var W = Math.max(0, HTMLCSS.getW(span) + dw);
                var H = bbox.h + bbox.d, D = -bbox.d, lp = 0, rp = 0;
                if (W > 0)
                {
                  W += 2 * dd;
                  lW -= dd
                }
                if (H > 0)
                {
                  H += 2 * dd;
                  D -= dd
                }
                rW = -W - lW;
                if (borders)
                {
                  rW -= borders.right;
                  D -= borders.bottom;
                  lp += borders.left;
                  rp += borders.right;
                  bbox.h += borders.top;
                  bbox.d += borders.bottom;
                  bbox.w += borders.left + borders.right;
                  bbox.lw -= borders.left;
                  bbox.rw += borders.right;
                }
                if (padding)
                {
                  H += padding.top + padding.bottom;
                  W += padding.left + padding.right;
                  rW -= padding.right;
                  D -= padding.bottom;
                  lp += padding.left;
                  rp += padding.right;
                  bbox.h += padding.top;
                  bbox.d += padding.bottom;
                  bbox.w += padding.left + padding.right;
                  bbox.lw -= padding.left;
                  bbox.rw += padding.right;
                }
                if (rp)
                {
                  span.style.paddingRight = HTMLCSS.Em(rp)
                }

                var strSpanID;
                if (typeof(marker) === "string")
                {
                  strSpanID = "MathJax-Color-" + this.spanID + "-" + marker + HTMLCSS.idPostfix;
                  if (document.getElementById(strSpanID) != null)
                  {   // when marker given ensure that the ID is unique
                    return null;
                  }
                }
                else
                {
                  strSpanID = "MathJax-Color-" + this.spanID + HTMLCSS.idPostfix;
                }

                var styleObj = {
                    display:"inline-block", backgroundColor:values.mathbackground,
                    width:HTMLCSS.Em(W), height:HTMLCSS.Em(H), verticalAlign:HTMLCSS.Em(D),
                    marginLeft:HTMLCSS.Em(lW), marginRight:HTMLCSS.Em(rW)
                };
                if (typeof(mathOutline) === "string")
                {
                  styleObj["outline"] = mathOutline;
                }


                var frame = HTMLCSS.Element("span", {
                      id:strSpanID, isMathJax:true,
                      style:styleObj
                    });
                HTMLCSS.setBorders(frame, borders);
                if (bbox.width)
                {
                  frame.style.width = bbox.width;
                  frame.style.marginRight = "-" + bbox.width
                }
                if (HTMLCSS.msieInlineBlockAlignBug)
                {
                  // FIXME:  handle variable width background
                  frame.style.position = "relative";
                  frame.style.width = frame.style.height = 0;
                  frame.style.verticalAlign = frame.style.marginLeft = frame.style.marginRight = "";
                  frame.style.border = frame.style.padding = "";
                  if (borders && HTMLCSS.msieBorderWidthBug)
                  {
                    H += borders.top + borders.bottom;
                    W += borders.left + borders.right
                  }
                  frame.style.width = HTMLCSS.Em(lp + dd);
                  HTMLCSS.placeBox(HTMLCSS.addElement(frame, "span", {
                    noAdjust:true, isMathJax:true,
                    style:{display:"inline-block", position:"absolute", overflow:"hidden",
                      background:(values.mathbackground || "transparent"),
                      width:HTMLCSS.Em(W), height:HTMLCSS.Em(H)}
                  }), lW, bbox.h + dd);
                  HTMLCSS.setBorders(frame.firstChild, borders);
                }
                span.parentNode.insertBefore(frame, span);
                if (HTMLCSS.msieColorPositionBug)
                {
                  span.style.position = "relative"
                }
                return frame;
              }
              return null;
            }
          }
        );
    });



MathJax.Ajax.loadComplete("[MathJax]/extensions/HTML-CSS/HighlightingAssist.js");
