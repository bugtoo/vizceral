/**
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
import * as THREE from 'three';
// import threeSimplicialComplex from 'three-simplicial-complex';
// import svgMesh3d from 'svg-mesh-3d';
import ShapeParent from './shapes/ShapeParent';

// const createGeometry = threeSimplicialComplex(THREE);

const ShapesFactory = {};
ShapesFactory.shapes = [];
ShapesFactory.registerShape = function (shapeName, shapeClass) {
  if (ShapesFactory.shapes[shapeName] === undefined) {
    ShapesFactory.shapes[shapeName] = shapeClass;
  }
};

ShapesFactory.registerSVG = function (shapeName, svg, scale) {
  function resizeCanvas(canvas, width, height) {
    const context = canvas.getContext('2d');

    // Store the context information we care about
    const font = context.font;
    const textAlign = context.textAlign;
    const textBaseline = context.textBaseline;

    const ratio = 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    canvas.style.width = `${width} px`;
    canvas.style.height = `${height} px`;

    // When a canvas is resized, it loses context, so reset it here
    context.font = font;
    context.textAlign = textAlign;
    context.textBaseline = textBaseline;

    context.scale(ratio, ratio);
  }

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    resizeCanvas(canvas, width, height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    return canvas;
  }


  // const meshData = svgMesh3d(svg, {
  //     scale: 1,
  //     simplify: 0.1
  // });
  // const geometry = createGeometry(meshData);
  // geometry.scale(scale, scale);
  const svg2 = `
    <svg xmlns="http://www.w3.org/2000/svg" height="140" width="140" viewBox="0 0 1000 1026">
      <path d="M125.1,899.6c0,0-96-58.5-84-148.5s408-648,408-648l138,9l364.5,621l10.5,148.5l-138,33L125.1,899.6z" fill="rgb(0,0,0)"/>
      <path d="M513.71 149.5q-48.75 0 -81.25 55l-307.5 512.5q-32.5 55 -10.625 95t86.875 40l625 0q65 0 86.25 -40t-11.25 -95l-307.5 -512.5q-32.5 -55 -80 -55zm0 -105q106.25 0 168.75 106.25l308.75 513.75q62.5 105 11.25 198.75 -51.25 92.5 -176.25 92.5l-625 0q-123.75 0 -177.5 -92.5 -52.5 -92.5 11.25 -198.75l308.75 -513.75q62.5 -106.25 170 -106.25zm-68.75 651.25q0 -68.75 68.75 -68.75 67.5 0 67.5 68.75 0 67.5 -67.5 67.5 -68.75 0 -68.75 -67.5zm146.25 -312.5q0 13.75 -6.25 28.75l-71.25 178.75q-43.75 -107.5 -72.5 -178.75 -6.25 -15 -6.25 -28.75 0 -32.5 23.125 -55.625t55.625 -23.125 55 23.125 22.5 55.625z" fill="rgb(255,0,0)"/>
    </svg>
    `;

  const viewBox = svg.attributes.viewBox || { value: '0 0 90 90' };
  const split = viewBox.value.split(' ');
  split[2] *= 5;
  split[3] *= 5;
  svg.attributes.viewBox = split.join(' ');

  const image = new Image();
  image.src = `data:image/svg+xml;charset-utf-8,${encodeURIComponent(svg.outerHTML)}`;

  const canvas = createCanvas(256, 256);

  const noticeImage = image;

  // notice icon
  const texture = new THREE.Texture(canvas);
  let done = false;
  setInterval(() => {
    if (!done) {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      done = noticeImage.width > 1;
      const offset = { x: (canvas.width - noticeImage.width) / 2, y: (canvas.height - noticeImage.height) / 2 };
      context.drawImage(noticeImage, offset.x, offset.y);
      // context.scale(2, 2);
      texture.needsUpdate = true;
    }
  }, 1000);
  const material = new THREE.SpriteMaterial({
    map: texture,
    useScreenCoordinates: false,
    transparent: true
  });
  // new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  // const canvas = document.createElement('canvas');
  // let context = canvas.getContext('2d');

  // // this.resizeCanvas(canvas, 256, 256);
  // const font = context.font;
  // const textAlign = context.textAlign;
  // const textBaseline = context.textBaseline;

  // const ratio = 1;

  // canvas.width = 256 * ratio;
  // canvas.height = 256 * ratio;

  // canvas.style.width = `${256} px`;
  // canvas.style.height = `${256} px`;

  // context = canvas.getContext('2d');
  // // When a canvas is resized, it loses context, so reset it here
  // context.font = font;
  // context.textAlign = textAlign;
  // context.textBaseline = textBaseline;

  // context.scale(ratio, ratio);
  // context.textAlign = 'center';
  // context.textBaseline = 'middle';

  // const texture = new THREE.Texture(canvas);

  // context.clearRect(0, 0, canvas.width, canvas.height);

  // // notice icon
  // const offset = { x: (canvas.width - image.width) / 2, y: (canvas.height - image.height) / 2 };
  // context.drawImage(image, offset.x, offset.y);

  // const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
  const geometry = new THREE.PlaneBufferGeometry(105, 105);
  // texture.needsUpdate = true;


  // const reso = 1000;
  // const step = (2 * Math.PI / reso);

  // const origin = new THREE.Vector3(0, 0, 0);
  // const shapeVectices = new Array(reso).fill(new THREE.Vector3(0, 0, 0));
  // for (let i = 0; i < reso; i++) {
  //     geometry.vertices.forEach((vert) => {
  //         const vertice = new THREE.Vector3(vert.x, vert.y, 0);
  //         const angle = vertice.angleTo(new THREE.Vector3(0, 1, 0));
  //         if (angle >= i * step && angle < (i + 1) * step) {
  //             if (origin.distanceTo(new THREE.Vector3(vertice.x, vertice.y, 0)) > origin.distanceTo(shapeVectices[i])) {
  //                 shapeVectices[i] = vertice;
  //             }
  //         }
  //     });
  // }

  // const trueShapeVertices = [];
  // shapeVectices.forEach((x) => {
  //     if (x.x !== 0 && x.y !== 0) {
  //         trueShapeVertices.push(new THREE.Vector2(x.x, x.y))
  //     }
  // });

  // const shape = new THREE.Shape(trueShapeVertices);
  // const shapeGeo = shape.createGeometry(trueShapeVertices);


  class ShapeSVG extends ShapeParent {
    constructor(node) {
      super(node);
      this.material = material;
    }

    _createInnerGeometry() {
      return geometry.clone();
    }
  }

  if (ShapesFactory.shapes[shapeName] === undefined) {
    ShapesFactory.shapes[shapeName] = ShapeSVG;
  }
};

ShapesFactory.getShape = function (node) {
  const shapeName = node.node_type;
  if (ShapesFactory.shapes[shapeName]) {
    return new ShapesFactory.shapes[shapeName](node);
  }
  return new ShapesFactory.shapes.default(node);
};

export default ShapesFactory;
