/**
 *
 *  Copyright 2016 Netflix, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */
import * as THREE from "three";

import NodeView from "./nodeView";
import NodeNameView from "./nodeNameView";
import GlobalStyles from "../globalStyles";
import ShapesFactory from "./ShapesFactory";
import "./shapes/CommonShapes";

const defaultRadius = 16;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function makeTextSprite(message, parameters) {
  if (parameters === undefined) parameters = {};
  var fontface = parameters.hasOwnProperty("fontface")
    ? parameters["fontface"]
    : "Arial";
  var fontsize = parameters.hasOwnProperty("fontsize")
    ? parameters["fontsize"]
    : 18;
  var borderThickness = parameters.hasOwnProperty("borderThickness")
    ? parameters["borderThickness"]
    : 4;
  var borderColor = parameters.hasOwnProperty("borderColor")
    ? parameters["borderColor"]
    : { r: 0, g: 0, b: 0, a: 1.0 };
  var backgroundColor = parameters.hasOwnProperty("backgroundColor")
    ? parameters["backgroundColor"]
    : { r: 255, g: 255, b: 255, a: 1.0 };
  var textColor = parameters.hasOwnProperty("textColor")
    ? parameters["textColor"]
    : { r: 0, g: 0, b: 0, a: 1.0 };

  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  context.font = "Bold " + fontsize + "px " + fontface;
  var metrics = context.measureText(message);
  var textWidth = metrics.width;

  context.fillStyle =
    "rgba(" +
    backgroundColor.r +
    "," +
    backgroundColor.g +
    "," +
    backgroundColor.b +
    "," +
    backgroundColor.a +
    ")";
  context.strokeStyle =
    "rgba(" +
    borderColor.r +
    "," +
    borderColor.g +
    "," +
    borderColor.b +
    "," +
    borderColor.a +
    ")";

  context.lineWidth = borderThickness;
  roundRect(
    context,
    borderThickness / 2,
    borderThickness / 2,
    (textWidth + borderThickness) * 1.1,
    fontsize * 1.4 + borderThickness,
    8
  );

  context.fillStyle =
    "rgba(" + textColor.r + ", " + textColor.g + ", " + textColor.b + ", 1.0)";
  context.fillText(message, borderThickness, fontsize + borderThickness);

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  var spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    useScreenCoordinates: false,
    depthWrite: false
  });
  var sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
  return sprite;
}

class NodeViewStandard extends NodeView {
  constructor(service) {
    super(service);
    this.radius = this.object.size || defaultRadius;

    this.dotColor = GlobalStyles.getColorTrafficRGBA(this.object.getClass());
    this.dotMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.dotColor.r, this.dotColor.g, this.dotColor.b),
      transparent: true,
      opacity: 0 // this.dotColor.a
    });
    // custom shapes support. node_type property should be defined for a node in json. If node_type is missing or undefined, the default shape (circle) will be picked up
    const shape = ShapesFactory.getShape(service);
    shape.scale(this.radius / defaultRadius);

    const scaleFactor = this.radius / defaultRadius;
    shape.material.map.minFilter = THREE.LinearFilter;
    this.shapeMesh = this.addChildElement(
      new THREE.PlaneBufferGeometry(200 * scaleFactor, 200 * scaleFactor),
      shape.material
    );

    this.shapeMesh.renderOrder = 1;

    // if (this.object.options.nodeColor) {
    //   shape.material.color = new THREE.Color(this.object.options.nodeColor);
    // }

    // this.meshes.innerCircle = this.addChildElement(shape.innergeometry, shape.material);

    // --------------- SPRITE
    // const sprite = new THREE.Sprite(shape.material);
    // sprite.renderOrder = 1;
    // sprite.scale.set(
    //   (this.radius / defaultRadius) * 200,
    //   (this.radius / defaultRadius) * 200,
    //   1
    // );
    // this.meshes.innerCircle = {
    //   geometry: sprite
    // };
    // this.sprite = sprite;
    // sprite.renderOrder = 1;
    // this.container.add(sprite);
    // ------------------------

    // this.meshes.outerBorder = this.addChildElement(shape.outerborder, shape.bordermaterial);

    this.meshes.noticeDot = this.addChildElement(
      NodeView.getNoticeDotGeometry(this.radius),
      this.dotMaterial
    );
    this.refreshNotices();

    // Add the service name
    if (this.object.options.showLabel) {
      this.nameView = new NodeNameView(this, false);
      this.showLabel(this.object.options.showLabel);
    }

    //create image
    // var bitmap = document.createElement("canvas");
    // var g = bitmap.getContext("2d");
    // bitmap.width = 200;
    // bitmap.height = 200;
    // g.font = "Bold 72px Arial";

    // g.fillStyle = "black";
    // g.fillText("test", 0, 72);
    // g.strokeStyle = "black";
    // g.strokeText("test", 0, 72);

    // // canvas contents will be used for a texture
    // var texture = new THREE.Texture(bitmap);
    // texture.needsUpdate = true;

    // var spriteMaterial = new THREE.SpriteMaterial({
    //   map: texture,
    //   depthTest: true,
    //   depthWrite: false,
    //   color: new THREE.Color("rgba(0,0,0,1)")
    // });
    // var textSprite = new THREE.Sprite(spriteMaterial);

    // // const textSprite = makeTextSprite("test");
    // textSprite.renderOrder = 0;
    // this.container.add(textSprite);
    this.container.renderOrder = 1;
    this.addText();

    let rosPos = 0;
    const self = this;
    setInterval(() => {
      const volumeLog = Math.log(self.object.data.volume);
      const speed = Math.min(volumeLog / Math.log(5), 1);
      // Math.min(Math.max(Math.log(this.object.data.volume || 0), 1), 10);
      if (Number.isFinite(speed)) {
        // If speed is 1 it should do a full circle per second
        rosPos += (Math.PI / 30) * self.object.data.volumePercent;
      }
      this.shapeMesh.rotation.setFromVector3(new THREE.Vector3(0, 0, rosPos));
      this.shapeMesh.needUpdate = true;
    }, 1000 / 60);
  }

  setOpacity(opacity) {
    super.setOpacity(opacity);
    if (this.object.hasNotices()) {
      this.dotMaterial.opacity = opacity * this.dotColor.a;
    }
  }

  refreshNotices() {
    if (this.object.hasNotices()) {
      const noticeSeverity = this.object.highestNoticeLevel();
      this.dotColor = GlobalStyles.getColorSeverityRGBA(noticeSeverity);
      this.dotMaterial.color.setRGB(
        this.dotColor.r,
        this.dotColor.g,
        this.dotColor.b
      );
      this.dotMaterial.opacity = this.opacity * this.dotColor.a;
      this.meshes.noticeDot.geometry.colorsNeedUpdate = true;
    } else {
      this.dotMaterial.opacity = 0;
    }
  }

  refresh(force) {
    super.refresh(force);

    // Refresh sprite color
    // if (this.object.options.nodeColor) {
    //   this.sprite.material.color.set(
    //     new THREE.Color(this.object.options.nodeColor)
    //   );
    //   this.sprite.material.needsUpdate = true;
    //   this.sprite.needsUpdate = true;
    // }

    // Refresh severity
    if (this.highlight) {
      this.dotMaterial.color.set(this.donutInternalColor);
    } else {
      this.dotMaterial.color.setRGB(
        this.dotColor.r,
        this.dotColor.g,
        this.dotColor.b
      );
    }
    this.meshes.noticeDot.geometry.colorsNeedUpdate = true;

    // Refresh notices
    this.refreshNotices();
    this.updateText();
  }

  addText() {
    this.canvasHeight = 200;
    this.canvasWidth = 200;
    this.textCanvas = this.createCanvas(this.canvasWidth, this.canvasHeight);
    this.textTexture = new THREE.Texture(this.textCanvas);
    this.textTexture.minFilter = THREE.LinearFilter;
    this.textTexture.needsUpdate = true;

    this.textMaterial = new THREE.MeshBasicMaterial({
      map: this.textTexture,
      // side: THREE.DoubleSide,
      depthWrite: false,
      transparent: true
    });
    // const text = new THREE.Mesh(
    //   new THREE.PlaneBufferGeometry(
    //     this.textCanvas.width,
    //     this.textCanvas.height
    //   ),
    //   this.textMaterial
    // );
    // this.container.add(text);
    const text = this.addChildElement(
      new THREE.PlaneBufferGeometry(
        this.textCanvas.width,
        this.textCanvas.height
      ),
      this.textMaterial
    );
    text.renderOrder = 2;
    // this.addInteractiveChild(text, "donut");
    text.position.set(0, 0, 100);
  }

  updateText() {
    if (!this.textCanvas) {
      Console.warn(
        `Attempted to update the text in the middle of the ${
          this.object.name
        } node before the text was created.`
      );
      return;
    }
    const textContext = this.textCanvas.getContext("2d");
    const metricWeight = 700;
    let top = 0;

    // Reset the canvas to draw new text
    textContext.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
    this.metricFontSize = 17;
    // The node is still loading so show a loading message
    textContext.strokeStyle = "white";
    textContext.lineWidth = 0;
    textContext.fillStyle = "white";
    textContext.font = `${metricWeight} ${
      this.metricFontSize
    }px 'Source Sans Pro', sans-serif`;
    top = this.canvasHeight / 2 - (this.metricFontSize * 2) / 2 + 16;
    textContext.fillText(
      this.object.displayName,
      this.textCanvas.width / 2,
      top
    );
    top += this.metricSpacing + this.headerFontSize;
    // textContext.fillText("LOADING", this.textCanvas.width / 2, top)

    // Tell three.js that an update needs to happen
    this.textTexture.needsUpdate = true;
  }
}

export default NodeViewStandard;
