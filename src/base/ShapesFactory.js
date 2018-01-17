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
import threeSimplicialComplex from 'three-simplicial-complex';
import svgMesh3d from 'svg-mesh-3d';
import ShapeParent from './shapes/ShapeParent';

const createGeometry = threeSimplicialComplex(THREE);

const ShapesFactory = {};
ShapesFactory.shapes = [];
ShapesFactory.registerShape = function (shapeName, shapeClass) {
  if (ShapesFactory.shapes[shapeName] === undefined) {
    ShapesFactory.shapes[shapeName] = shapeClass;
  }
};

ShapesFactory.registerSVG = function (shapeName, svg) {
  class ShapeSVG extends ShapeParent {
    _createInnerGeometry () {
      const meshData = svgMesh3d(svg);
      return createGeometry(meshData);
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
