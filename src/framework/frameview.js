'use strict';
var Kern = require('../kern/Kern.js');
var pluginManager = require('./pluginmanager.js')
var FrameData = require('./framedata.js');
var CGroupView = require('./cgroupview.js');

/**
 * A View which can have child views
 * @param {FrameData} dataModel
 * @param {object}        options
 * @extends CGroupView
 */
var FrameView = CGroupView.extend({
  constructor: function(dataModel, options) {
    options = options || {};
    this.transformData = undefined;
    CGroupView.call(this, dataModel, Kern._extend({}, options, { noRender: true }));

    if (!options.noRender && (options.forceRender || !options.el)) this.render();
  },
  /**
   * get the transformData of the frame that describes how to fit the frame into the stage
   *
   * @param {StageView} stage - the stage to be fit into
   * @param {Transtion} transition - the transition data for the current transition
   * @returns {TransformData} the transform data
   */
  getTransformData: function(stage, transition) {
    // check if we can return cached version of transfromData
    var d = this.transformData;
    if (d && d.stage === stage && !transition.startPosition) {
      // scroll data in transition may differ from cached version
      if (d.scrollX !== undefined) {
        if (transition.scroll !== undefined) d.scrollX = transition.scroll / d.scale;
        if (transition.scrollX !== undefined) d.scrollX = transition.scrollX / d.scale;
        if (d.scrollX > d.maxScrollX) d.scrollX = d.maxScrollX;
      }
      if (d.scrollY !== undefined) {
        if (transition.scroll !== undefined) d.scrollY = transition.scroll / d.scale;
        if (transition.scrollY !== undefined) d.scrollY = transition.scrollY / d.scale;
        if (d.scrollY > d.maxScrollY) d.scrollY = d.maxScrollY;
      }
      return d;
    }
    // calculate transformData and return
    return this.calculateTransformData(stage, transition);
  },
  /**
   * calculate transform data (scale, scoll position and displacement) when fitting current frame into associated stage
   *
   * @param {StageView} stage - the stage to be fit into
   * @param {Transtion} transition - the transition data for the current transition
   * @returns {TransformData} the transform data
   */
  calculateTransformData: function(stage, transition) {
    var stageWidth = stage.width();
    var stageHeight = stage.height();
    // data record contianing transformation and scrolling information of frame within given stage
    var d = this.transformData = {};
    d.stage = stage;
    // scaling of frame needed to fit frame into stage
    d.scale = 1;
    d.frameWidth = this.width();
    d.frameHeight = this.height();
    // d.shiftX/Y indicate how much the top-left corner of the frame should be shifted from
    // the stage top-left corner (in stage space)
    d.shiftX = 0;
    d.shiftY = 0;
    // d.scrollX/Y give the initial scroll position in X and/or Y direction.
    // if undefined, no scrolling in that direction should happen
    //d.scrollX = undefined;
    //d.scrollY = undefined;
    switch (this.attributes.fitTo) {
      case 'width':
        d.scale = d.frameWidth / stageWidth;
        d.scrollY = 0;
        break;
      case 'height':
        d.scale = d.frameHeight / stageHeight;
        d.scrollX = 0;
        break;
      case 'fixed':
        d.scale = 1;
        d.scrollY = 0;
        d.scrollX = 0;
        break;
      case 'contain':
        d.scaleX = d.frameWidth / stageWidth;
        d.scaleY = d.frameHeight / stageHeight;
        if (d.scaleX > d.scaleY) {
          d.scale = d.scaleX;
          d.scrollY = 0;
        } else {
          d.scale = d.scaleY;
          d.scrollX = 0;
        }
        break;
      case 'cover':
        d.scaleX = d.frameWidth / stageWidth;
        d.scaleY = d.frameHeight / stageHeight;
        if (d.scaleX < d.scaleY) {
          d.scale = d.scaleX;
          d.scrollY = 0;
        } else {
          d.scale = d.scaleY;
          d.scrollX = 0;
        }
        break;
      case 'elastic-width':
        if (stageWidth < d.frameWidth && stageWidth > d.frameWidth - this.attributes['elastic-left'] - this.attributes['elastic-right']) {
          d.scale = 1;
          d.shiftY = this.attributes['elastic-left'] * (d.frameWidth - stageWidth) / (this.attributes['elastic-left'] + this.attributes['elastic-right']);
        } else if (stageWidth > d.frameWidth) {
          d.scale = d.frameWidth / stageWidth;
        } else {
          d.scale = (d.frameWidth - this.attributes['elastic-left'] - this.attributes['elastic-right']) / stageWidth;
        };
        d.scrollY = 0;
        break;
      case 'elastic-height':
        if (stageWidth < d.frameWidth && stageWidth > d.frameWidth - this.attributes['elastic-left'] - this.attributes['elastic-right']) {
          d.scale = 1;
          d.shiftY = this.attributes['elastic-left'] * (d.frameWidth - stageWidth) / (this.attributes['elastic-left'] + this.attributes['elastic-right']);
        } else if (stageWidth > d.frameWidth) {
          d.scale = d.frameWidth / stageWidth;
        } else {
          d.scale = (d.frameWidth - this.attributes['elastic-left'] - this.attributes['elastic-right']) / stageWidth;
        };
        d.scrollX = 0;
        break;
      case 'responsive':
        d.scale = 1;
        this.el.style.width = d.frameWidth = stageWidth;
        this.el.style.height = d.frameHeight = stageHeight;
        break;
      case 'responsive-width':
        d.scale = 1;
        d.scrollY = 0;
        this.el.style.width = d.frameWidth = stageWidth;
        break;
      case 'responsive-height':
        d.scale = 1;
        d.scrollX = 0;
        this.el.style.height = d.frameHeight = stageHeight;
        break;
      default:
        throw "unkown fitTo type '" + this.attributes.fitTo + "'";
    }
    // calculate maximum scroll positions (depend on frame and stage dimensions)
    if (d.scrollY !== undefined) d.maxScrollY = d.frameHeight / d.scale - stageHeight;
    if (d.scrollX !== undefined) d.maxScrollX = d.frameWidth / d.scale - stageWidth;
    // define initial positioning
    // take startPosition from transition or from frame
    switch ((transition.startPosition !== undefined && transition.startPosition) || this.attributes.startPosition) {
      case 'top':
        if (d.scrollY !== undefined) d.scrollY = 0;
        break;
      case 'bottom':
        if (d.scrollY !== undefined) {
          d.scrollY = d.maxScrollY;
          if (d.scrollY < 0) {
            d.shiftY = -d.scrollY;
            d.scrollY = 0;
          }
        }
        break;
      case 'left':
        if (d.scrollX !== undefined) d.scrollX = 0;
        break;
      case 'right':
        if (d.scrollX !== undefined) {
          d.scrollX = d.maxScrollX;
          if (d.scrollX < 0) {
            d.shiftX = -d.scrollX;
            d.scrollX = 0;
          }
        }
        break;
      case 'middle': // middle and center act the same
      case 'center':
        if (d.scrollX !== undefined) {
          d.scrollX = (d.frameWidth / d.scale - stageWidth) / 2;
          if (d.scrollX < 0) {
            d.shiftX = -d.scrollX;
            d.scrollX = 0;
          }
        }
        if (d.scrollY !== undefined) {
          d.scrollY = (d.frameHeight / d.scale - stageHeight) / 2;
          if (d.scrollY < 0) {
            d.shiftY = -d.scrollY;
            d.scrollY = 0;
          }
        }
        break;
      default:
        // same as 'top'
        if (d.scrollY !== undefined) d.scrollY = 0;
        break;
    }
    // calculate actual frame width height in stage space
    d.width = d.frameWidth / d.scale;
    d.height = d.frameHeight / d.scale;
    // disable scrolling if configured in frame
    if (this.attributes.noScrolling) {
      if (d.scrollX !== undefined && d.scrollX > 0) d.shiftX += d.scrollX;
      if (d.scrollY !== undefined && d.scrollY > 0) d.shiftY += d.scrollY;
      delete d.scrollX;
      delete d.scrollY;
      delete d.maxScrollX;
      delete d.maxScrollY;
    } else {
      // apply transition scroll information if available
      // support transition.scroll as direction ambivalent scroll position
      if (d.scrollX !== undefined) {
        if (transition.scroll !== undefined) d.scrollX = transition.scroll / d.scale;
        if (transition.scrollX !== undefined) d.scrollX = transition.scrollX / d.scale;
        if (d.scrollX > d.maxScrollX) d.scrollX = d.maxScrollX;
      }
      if (d.scrollY !== undefined) {
        if (transition.scroll !== undefined) d.scrollY = transition.scroll / d.scale;
        if (transition.scrollY !== undefined) d.scrollY = transition.scrollY / d.scale;
        if (d.scrollY > d.maxScrollY) d.scrollY = d.maxScrollY;
      }
    }
    return this.transformData = d;
  }
}, {
  Model: FrameData
});

pluginManager.registerType('frame', FrameView);
module.exports = FrameView;