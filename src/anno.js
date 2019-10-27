// MIT License

// Copyright (c) 2018 FredDon

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';
import {
    MOUSE_EVENT,
    dotCls,
    imageOpTag,
    PREFIX_RESIZE_DOT,
    defaultPositions,
    defaultConfig,
    UUID
} from './config';
import Movement from './movement';

export default class ResizeAnnotation {

    constructor(parentNode, boundRect, callback = defaultConfig, callback_handler) {
        this.options = {
            ...defaultConfig.options,
            ...callback.options
        };
        this.callback_handler = callback_handler;
        this.annotationContainer = parentNode;
        this.boundRect = boundRect;
        this.actionDown = false;
        this.currentMovement = null;
        this.rawConfig = { ...defaultConfig, ...callback };
        this.data = [];
    }

    setConfigOptions = (newOptions) => {
        this.options = { ...this.options, ...newOptions.options };
        this.rawConfig = { ...this.rawConfig, ...newOptions };
    }
    
    //获取数据模板
    dataTemplate = (tag, x, y, x1, y1) => {
        if (!tag || !/^.+$/gi.test(tag)) {
            tag = {
                tag: `temp@${new Date().getTime()}`,
            };
        }
        return {
            ...tag,
            position: {
                x,
                y,
                x1,
                y1,
            },
        };
    };

    reset = () => {
        this.data = []
    }

    isValid = (rect) => {
        return rect && parseFloat(rect.width) > 1 && parseFloat(rect.height) > 1;
    };

    renderData = (
        dataArray = [], base = { width: this.boundRect().width, height: this.boundRect().height }) => {
        if (dataArray instanceof Array && dataArray.length > 0) {
            dataArray.forEach((data, index, arr) => {
                let rect;
                if (data.position.x.endsWith('%')) {
                    rect = {
                        x: data.position.x,
                        y: data.position.y,
                        width: (parseFloat(data.position.x1) - parseFloat(data.position.x)) + '%',
                        height: (parseFloat(data.position.y1) - parseFloat(data.position.y)) + '%'
                    }
                } else {
                    rect = {
                        x: (100 * data.position.x / base.width).toFixed(3) + '%',
                        y: (100 * data.position.y / base.height).toFixed(3) + '%',
                        width: (100 * (data.position.x1 - data.position.x) / base.width).toFixed(3) + '%',
                        height: (100 * (data.position.y1 - data.position.y) / base.height).toFixed(3) + '%'
                    };
                }
                this.drawAnnotation(rect, data);
            });
        } else {
            this.reset();
        }
        this.rawConfig.onDataRendered();
    };

    dataSource = () => {
        return this.data;
    };

    dataSourceOfTag = (tagId, uuid) => {
        for (let i = 0; i < this.data.length; i++) {
            let value = this.data[i];
            if (value.tag === tagId && value.uuid == uuid) {
                return (value);
            }
        }
    };


    setTagForCurrentMovement = (tagOb) => {
        if (this.currentMovement) {
            const node = this.currentMovement.moveNode;
            let tag_str = '', tag_id = '';
            if (typeof tagOb === 'string') {
                tag_id = tag_str = tagOb;
            }
            const oldtag = node.querySelector(`.${imageOpTag}`).dataset.id;
            let constData = {};
            if (typeof tagOb === 'object') {
                tag_str = tagOb['tagName']
                tag_id = tagOb['tag']
                constData = {
                    ...tagOb
                }
                for (let k in tagOb) {
                    node.querySelector(`.${imageOpTag}`).dataset[k] = tagOb[k];
                }
            }
            let uuid = node.dataset.uuid;
            node.querySelector(`.${imageOpTag}`).innerText = tag_str;
            for (let i = 0; i < this.data.length; i++) {
                let value = this.data[i];
                if (value.tag === oldtag && value.uuid === uuid) {
                    value = {
                        ...value,
                        ...constData,
                        tag: tag_id,
                        tagName: tag_str,
                    }
                    value.tag = tag_id;
                    value.tagName = tag_str;
                    node.querySelector(`.${imageOpTag}`).dataset.id = tag_id;
                    node.querySelector(`.${imageOpTag}`).dataset.name = tag_str;
                }
                this.data[i] = value;
            }
            this.rawConfig.onUpdated(this.dataSource());
        }
    };

    updateMovementData = () => {
        //获取tag
        if (this.currentMovement == null) return;
        const node = this.currentMovement.moveNode;
        let uuid = node.dataset.uuid;
        const tag = node.querySelector(`.${imageOpTag}`).dataset.id;
        let position = {
            x: node.style.left,
            y: node.style.top,
            x1: (parseFloat(node.style.width) + parseFloat(node.style.left)).toFixed(3) + '%',
            y1: (parseFloat(node.style.height) + parseFloat(node.style.top)).toFixed(3) + '%',
        };
        //从原有的数据集查找该tag
        for (let i = 0; i < this.data.length; i++) {
            let value = this.data[i];
            if (value.tag === tag && value.uuid === uuid) {
                value.position = position;
            }
            this.data[i] = value;
        }
        this.rawConfig.onUpdated(this.dataSource(), this.currentMovement);
    };

    removeAnnotationEvent = (e) => {
        if (!this.options.editable) return;
        let selectNode = e.currentTarget.parentNode.parentNode.parentNode;
        if (selectNode) {
            const node = selectNode;
            let uuid = node.dataset.uuid;
            // const tag = node.querySelector(`.${imageOpTag}`).dataset.id;
            for (let i = 0; i < this.data.length; i++) {
                let value = this.data[i];
                if (//value.tag === tag && 
                    value.uuid === uuid) {
                    this.data.splice(i, 1);
                    break;
                }
            }
            this.rawConfig.onUpdated(this.dataSource());
        }
        e.currentTarget.parentNode.parentNode.parentNode.remove();
    };

    //init
    drawAnnotation = (rect, tag = void 0) => {
        if (!this.isValid(rect)) {
            return;
        }
        this.removeSelectedAnnotation();
        //创建Annotation节点
        let annotation = document.createElement('div');
        annotation.className = `${this.options.annotationClass} selected`;
        annotation.style.position = 'absolute';
        annotation.style.top = rect.y;
        annotation.style.left = rect.x;
        annotation.style.width = rect.width;
        annotation.style.height = rect.height;
        //创建8个resizeDot
        const resizeDotClasses = {
            top: `${PREFIX_RESIZE_DOT} top`,
            bottom: `${PREFIX_RESIZE_DOT} bottom`,
            left: `${PREFIX_RESIZE_DOT} left`,
            right: `${PREFIX_RESIZE_DOT} right`,
            topLeft: `${PREFIX_RESIZE_DOT} top-left`,
            topRight: `${PREFIX_RESIZE_DOT} top-right`,
            bottomLeft: `${PREFIX_RESIZE_DOT} bottom-left`,
            bottomRight: `${PREFIX_RESIZE_DOT} bottom-right`,
            trash: 'g-image-op',
        };
        let uu = `${UUID(16, 16)}`;
        annotation.dataset.uuid = uu;
        // this.rawConfig
        let i = 0;
        let tagString, tagId;
        if (typeof tag === 'object') {
            tagString = tag.tagName;
            tagId = tag.tag;
        }
        else if (typeof tag === 'string') {
            tagString = tag;
            tagId = tag;
        } else {
            tagString = '请选择或添加新标签';
            tagId = `temp@${uu}`;
            tag = {
                tag: tagId,
                tagName: tagString
            }
        }
        for (let prop in resizeDotClasses) {
            let resizeDot = document.createElement('div');
            if (i === 8) {
                resizeDot.className = `${this.options.blurOtherDotsShowTags
                    ? ''
                    : `${dotCls[i]}`} ${resizeDotClasses[prop]}`;
                let opContent = document.createElement('div');
                opContent.className = 'g-image-op-content';
                if (this.options.tagLocation == defaultPositions.out_bottom) {
                    opContent.style.position = 'absolute';
                    opContent.style.bottom = null;
                } else {
                    opContent.style.position = null;
                }
                let trash = document.createElement('i');
                trash.className = 'g-image-op-del iconfont s-icon icon-trash s-icon-trash';
                trash.innerText = ' × ';
                trash.addEventListener('click', this.removeAnnotationEvent, true);
                let tag = document.createElement('span');
                tag.dataset.name = tagString;
                tag.className = `${imageOpTag}`;
                tag.innerText = tagString;
                tag.dataset.id = tagId;
                if (this.options.trashPositionStart) {
                    opContent.appendChild(trash);
                    opContent.appendChild(tag);
                } else {
                    opContent.appendChild(tag);
                    opContent.appendChild(trash);
                }
                resizeDot.appendChild(opContent);
            } else {
                resizeDot.className = `${resizeDotClasses[prop]} ${dotCls[i]} ${this.options.editable
                    ? ''
                    : 'hidden'}`;
            }
            annotation.appendChild(resizeDot);
            i++;
        }
        //加事件
        this.annotationContainer.appendChild(annotation);
        this.currentMovement = new Movement(annotation, 0, this.boundRect(), this.options);
        // this.selectAnnotation();
        let dts = this.dataTemplate(tag, rect.x, rect.y,
            parseFloat(rect.x) + parseFloat(rect.width) + '%',
            parseFloat(rect.y) + parseFloat(rect.height) + '%')
        this.data.push({ ...dts, uuid: uu });
        this.rawConfig.onUpdated(this.dataSource());
        this.rawConfig.onDrawOne(dts, this.currentMovement)
    };

    dragEventOn = (e) => {
        // e.preventDefault();
        // e.stopPropagation();
        // if (!e.target.classList.contains('annotation') &&
        //     !e.target.classList.contains(`${PREFIX_RESIZE_DOT}`)) {
        //     eventTargetOnTransform = false;
        //   }
        const eventType = e.type;
        let clientX = e.clientX,
            clientY = e.clientY;
        this.moveX = clientX;//- this.boundRect().x;
        this.moveY = clientY;//- this.boundRect().y;
        if (eventType === MOUSE_EVENT[0]) {
            this.actionDown = true;
            this.lastX = this.moveX;
            this.lastY = this.moveY;
            if (typeof this.callback_handler === 'function') {
                this.callback_handler(true);
            }
            // eventTargetOnTransform = true;
            this.targetEventType(e);
        } else if (eventType === MOUSE_EVENT[1] || eventType === MOUSE_EVENT[3] || eventType ===
            MOUSE_EVENT[5]) {
            if (this.currentMovement == null) {
                return true;
            }
            if (this.actionDown) {
                if (this.filterOutOfBounds(this.moveX, this.moveY)) {
                    return;
                }
                this.currentMovement.transform(this.moveX - this.lastX, this.moveY - this.lastY);
                this.lastX = this.moveX;
                this.lastY = this.moveY;
            }
        } else {
            if (typeof this.callback_handler === 'function') {
                this.callback_handler(false);
            }
            // eventTargetOnTransform = false;
            if (this.actionDown) {
                this.updateMovementData();
                this.selectAnnotation();
            }
            this.actionDown = false;
        }
    };

    removeSelectedAnnotation = () => {
        if (this.currentMovement) {
            let cs = this.currentMovement.moveNode.classList;
            cs.remove('selected');
            if (this.options.blurOtherDots) {
                this.currentMovement.moveNode.querySelectorAll(`[class*=${PREFIX_RESIZE_DOT}]`)
                    .forEach((node) => {
                        node.classList.add('hidden');
                    });
            }
        }
    };

    selectAnnotation = (isUserinteracted = true) => {
        if (this.currentMovement) {
            let cs = this.currentMovement.moveNode.classList;
            cs.add('selected');
            if (this.options.blurOtherDots) {
                if (!this.options.editable) {
                    this.currentMovement.moveNode.querySelectorAll(`[class*=${PREFIX_RESIZE_DOT}]`)
                        .forEach((node) => {
                            if (node.classList.contains(dotCls[8])) {
                                node.classList.remove('hidden');
                            } else {
                                node.classList.add('hidden');
                            }
                        });
                    return;
                }
                this.currentMovement.moveNode.querySelectorAll(`[class*=${PREFIX_RESIZE_DOT}]`)
                    .forEach((node) => {
                        node.classList.remove('hidden');
                    });
            }
            if (!isUserinteracted) return;
            const node = this.currentMovement.moveNode;
            const tag_str = node.querySelector(`.${imageOpTag}`).innerText;
            const tagAttr = node.querySelector(`.${imageOpTag}`).dataset;
            this.rawConfig.onSelect({
                ...tagAttr,
                ...this.dataSourceOfTag(tagAttr.id, node.dataset.uuid),
            })
        }
    };

    selectMarkerByTagId = (tagId) => {
        let tag = this.annotationContainer.querySelector(`[data-id="${tagId}"]`);
        if (tag) {
            let markerAnnotation = tag.parentNode.parentNode.parentNode
            this.removeSelectedAnnotation();
            this.currentMovement = new Movement(markerAnnotation, -1, this.boundRect(), this.options);
            this.selectAnnotation(false);
        }
    }

    targetEventType = (e) => {
        this.removeSelectedAnnotation();
        let el = e.target;
        let parentEl = el.classList.contains('annotation') ? el : el.parentNode;
        if (el.classList.contains(dotCls[0])) {
            //top
            this.currentMovement = new Movement(parentEl, 0, this.boundRect(), this.options);
        } else if (el.classList.contains(dotCls[1])) {
            //bottom
            this.currentMovement = new Movement(parentEl, 1, this.boundRect(), this.options);
        }
        else if (el.classList.contains(dotCls[2])) {
            //left
            this.currentMovement = new Movement(parentEl, 2, this.boundRect(), this.options);
        }
        else if (el.classList.contains(dotCls[3])) {
            //right
            this.currentMovement = new Movement(parentEl, 3, this.boundRect(), this.options);
        } else if (el.classList.contains(dotCls[4])) {
            //top-left
            this.currentMovement = new Movement(parentEl, 4, this.boundRect(), this.options);
        }
        else if (el.classList.contains(dotCls[5])) {
            //top-right
            this.currentMovement = new Movement(parentEl, 5, this.boundRect(), this.options);
        }
        else if (el.classList.contains(dotCls[6])) {
            //bottom-left
            this.currentMovement = new Movement(parentEl, 6, this.boundRect(), this.options);
        }
        else if (el.classList.contains(dotCls[7])) {
            //bottom-right
            this.currentMovement = new Movement(parentEl, 7, this.boundRect(), this.options);
        } else if (el.classList.contains('annotation')) {
            this.currentMovement = new Movement(parentEl, -1, this.boundRect(), this.options);
        } else {
            this.currentMovement = null;
        }
        // this.selectAnnotation();
    };


    filterOutOfBounds = (x, y) => {
        return (
            x >= this.boundRect().x + this.boundRect().width + 2 ||
            y >= this.boundRect().y + this.boundRect().height + 2 ||
            x < 5 || y < 5
        );
    };

}