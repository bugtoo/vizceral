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
import * as THREE from 'three';

import BaseView from './baseView';
import ConnectionNoticeView from './connectionNoticeView';
import GlobalStyles from '../globalStyles';
import Constants from './constants';
import ShapeFactory from './ShapesFactory';

// Preload textures
const loader = new THREE.TextureLoader();

// Preload the particle texture
const particle = require('url!./particleD.png'); // eslint-disable-line import/no-extraneous-dependencies

let particleTexture;
loader.load(particle, (texture) => { particleTexture = texture; });

const trafficFragmentShader = `
uniform vec3 color;
uniform sampler2D texture;

varying float vCustomOpacity;
varying float vOpacity;
varying vec3 vColor;

void main() {

  gl_FragColor = vec4( color * vColor, vOpacity * vCustomOpacity );
  gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );

}
`;

const trafficVertexShader = `
uniform float opacity;
uniform float amplitude;

attribute float customOpacity;
attribute float size;
attribute vec3 customColor;

varying float vCustomOpacity;
varying float vOpacity;
varying vec3 vColor;

void main() {
  vColor = customColor;
  vOpacity = opacity;
  vCustomOpacity = customOpacity;

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = size;
  gl_Position = projectionMatrix * mvPosition;
}
`;


const baseShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: trafficVertexShader,
  fragmentShader: trafficFragmentShader,
  blending: THREE.NormalBlending,
  depthTest: true,
  depthWrite: false,
  transparent: true
});

function normalDistribution () {
  return (((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3) + 0.5;
}

function generateParticleSystem (size, customWidth, connectionWidth, connectionDepth, normalY) {
  const vertices = new Float32Array(size * 3);
  const customColors = new Float32Array(size * 3);
  const customOpacities = new Float32Array(size);
  const sizes = new Float32Array(size);
  const velocities = new Float32Array(size * 3); // Don't want to to be doing math in the update loop

  for (let i = 0; i < size; i++) {
        // Position
      vertices[i * 3] = 0;
      vertices[(i * 3) + 1] = customWidth ? connectionWidth - (normalDistribution() * connectionWidth * 2) : 1;
      vertices[(i * 3) + 2] = customWidth ? connectionDepth - (normalDistribution() * connectionDepth * 2) : -2;
        // normalY[i] = vertices[(i * 3) + 1];

        // Custom colors
      customColors[i] = GlobalStyles.rgba.colorTraffic.normal.r;
      customColors[i + 1] = GlobalStyles.rgba.colorTraffic.normal.g;
      customColors[i + 2] = GlobalStyles.rgba.colorTraffic.normal.b;

      customOpacities[i] = 0;
      sizes[i] = 6 * (window.devicePixelRatio || 1);
      velocities[i * 3] = 3 + (Math.random() * 2);
    }

  const geometry = new THREE.BufferGeometry();
  geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.addAttribute('customColor', new THREE.BufferAttribute(customColors, 3));
  geometry.addAttribute('customOpacity', new THREE.BufferAttribute(customOpacities, 1));
  geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));

  return {
      geometry: geometry,
      velocities: velocities
    };
}


function copyArray (destination, source) {
  for (let i = 0; i < source.length && i < destination.length; i++) {
      destination[i] = source[i];
    }
}

function copyParticleSystemState (newPs, oldPs) {
  const positionAttr = newPs.geometry.getAttribute('position');
  copyArray(positionAttr.array, oldPs.geometry.getAttribute('position').array);
  positionAttr.needsUpdate = true;

  const opacityAttr = newPs.geometry.getAttribute('customOpacity');
  copyArray(opacityAttr.array, oldPs.geometry.getAttribute('customOpacity').array);
  opacityAttr.needsUpdate = true;


  const colorAttr = newPs.geometry.getAttribute('customColor');
  copyArray(colorAttr.array, oldPs.geometry.getAttribute('customColor').array);
  colorAttr.needsUpdate = true;
}


// given two points on a line and an x coordinate between them, compute the corresponding Y.
// https://en.wikipedia.org/wiki/Linear_interpolation
function interpolateY (x, x0, y0, x1, y1) {
  return (y0 + (((x - x0) * (y1 - y0)) / (x1 - x0))) || 0; // avoid NaN
}

function mapVolume (volume, rateMap) {
  let i;

  for (i = 0; i < rateMap.length && rateMap[i + 1] && volume > rateMap[i + 1][0]; i++) { // eslint-disable-line no-empty
    }

  if (i === rateMap.length - 1) { // if somehow we have run past
      return (volume * rateMap[i][1]) / rateMap[i][0];
    }

  return interpolateY(volume, rateMap[i][0], rateMap[i][1], rateMap[i + 1][0], rateMap[i + 1][1]);
}

function mapVolumesToReleasesPerTick (volumes, rateMap) {
  const result = [];
  for (const volumeName in volumes) { // eslint-disable-line no-restricted-syntax
      if (volumes.hasOwnProperty(volumeName)) { // eslint-disable-line no-prototype-builtins
          const volume = volumes[volumeName];
          if (volume <= 0 || !volume) {
              continue; // eslint-disable-line no-continue
            }

          const rpt = mapVolume(volume, rateMap);
          result.push({
              name: volumeName,
              volume: volume,
              releasesPerTick: mapVolume(volumes[volumeName], rateMap),
              releasesPerSecond: rptToRPS(rpt),
              secondsPerRelease: rptToSPR(rpt)
            });
        }
    }

  return result;
}

function rptToRPS (rpt) {
  return rpt * 60;
}

function rptToSPR (rpt) {
  return 1 / rptToRPS(rpt);
}


class ConnectionView extends BaseView {
  constructor (connection, maxParticles, customWidth) {
      super(connection);
      this.setParticleLevels();
      this.maxParticles = maxParticles;
      this.magnitude = 0;
      this.icon = null;

      this.dimmedLevel = 0.05;

      this.centerVector = new THREE.Vector3(0, 0, 0);
      this.length = 0;

      this.particleSystemSize = this.maxParticleReleasedPerTick;

      this.uniforms = {
          amplitude: { type: 'f', value: 1.0 },
          color: { type: 'c', value: new THREE.Color(0xFFFFFF) },
          opacity: { type: 'f', value: 1.0 },
          texture: { type: 't', value: particleTexture, transparent: true }
        };

      this.shaderMaterial = baseShaderMaterial.clone();
      this.shaderMaterial.uniforms = this.uniforms;

      this.customWidth = customWidth;
      this.connectionWidth = Math.min(this.object.source.getView().radius, this.object.target.getView().radius) * 0.45;
      this.connectionDepth = Math.min(connection.source.getView().getDepth(), (connection.target.getView().getDepth()) / 2) - 2;

      this.lastParticleIndex = this.particleSystemSize - 1;
      this.freeIndexes = [];
      this.yIndexes = [];
      this.normalY = [];

      const ps = generateParticleSystem(this.particleSystemSize, this.customWidth, this.connectionWidth, this.connectionDepth, this.normalY);
      for (let i = 0; i < this.particleSystemSize; i++) {
          this.freeIndexes[i] = i;
        }

      this.velocity = ps.velocities;
      this.particles = new THREE.Points(ps.geometry, this.shaderMaterial);
      this.positionAttr = this.particles.geometry.getAttribute('position');
      this.opacityAttr = this.particles.geometry.getAttribute('customOpacity');
      this.container.add(this.particles);
        // Line used to support interactivity
      this.interactiveLineGeometry = new THREE.Geometry();
      this.interactiveLineMaterial = new THREE.LineBasicMaterial({
          depthTest: true,
          depthWrite: false,
          transparent: true,
          opacity: 0
        });
      this.interactiveLine = new THREE.Line(this.interactiveLineGeometry, this.interactiveLineMaterial);
      this.addInteractiveChild(this.interactiveLine);
      this.container.add(this.interactiveLine);
      this.addConnectionLine();

        // Add the connection notice
      this.noticeView = new ConnectionNoticeView(this);
      this.validateNotices();


      this.updateVolume();
    }

  addConnectionLine () {
      const shape = ShapeFactory.getShape({ node_type: 'warning' });
        // shape.scale(100);
      const geometry = shape.innergeometry;
        // geometry.translate(200 / 2, 0);
      this.icon = new THREE.Mesh(geometry, shape.material);
      this.lineColor = GlobalStyles.rgba.colorConnectionLine;
      this.connectionLineGeometry = new THREE.Geometry();
      this.connectionLineMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(this.lineColor.r, this.lineColor.g, this.lineColor.b),
          blending: THREE.AdditiveBlending,
          depthTest: true,
          depthWrite: false,
          transparent: true,
          opacity: this.lineColor.a
        });
      this.connectionLine = new THREE.Line(this.connectionLineGeometry, this.connectionLineMaterial);
      this.container.add(this.connectionLine);
    }

  setParticleLevels () {
      this.maxParticleReleasedPerTick = 19;
    }

  growParticles (bumpSize) {
      const newSize = bumpSize + this.particleSystemSize;

      for (let i = this.particleSystemSize; i < newSize; i++) {
          this.freeParticleIndex(i);
        }

      this.particleSystemSize = newSize;

      const ps = generateParticleSystem(this.particleSystemSize, this.customWidth, this.connectionWidth, this.connectionDepth);
      const newParticles = new THREE.Points(ps.geometry, this.shaderMaterial);

      copyParticleSystemState(newParticles, this.particles);

      copyArray(ps.velocities, this.velocity);
      this.velocity = ps.velocities;

        // out with the old...
      this.container.remove(this.particles);
      const oldParticles = this.particles;
      setTimeout(() => {
          oldParticles.geometry.dispose();
        }, 1); // do it async to avoid deleting geometry that might have been updated in this tick.

      this.particles = newParticles;
      this.positionAttr = this.particles.geometry.getAttribute('position');
      this.opacityAttr = this.particles.geometry.getAttribute('customOpacity');
      this.container.add(this.particles);

      this.updatePosition();

      return this.nextFreeParticleIndex();
    }

  freeParticleIndex (i) {
      this.lastParticleIndex = Math.max(this.lastParticleIndex + 1, 0);
      this.freeIndexes[this.lastParticleIndex] = i;
    }

  nextFreeParticleIndex (totalAsk) {
      if (this.lastParticleIndex < 0) {
          if (this.particleSystemSize >= this.maxParticles) {
              return -1;
            }
          return this.growParticles(2 * totalAsk);
        }

      const indx = this.freeIndexes[this.lastParticleIndex];
      --this.lastParticleIndex;
      return indx;
    }

  setOpacity (opacity) {
      super.setOpacity(opacity);
      this.uniforms.opacity.value = opacity;

      if (this.object.hasNotices()) {
          this.noticeView.setOpacity(opacity);
        }
      if (this.connectionLine) {
          this.connectionLine.material.opacity = opacity * this.lineColor.a;
          this.icon.material.opacity = opacity * this.lineColor.a;
        }
    }

  setHighlight (highlight) {
        // TODO: Actually highlight the connection
      if (this.highlight !== highlight) {
          this.highlight = highlight;
            // this.refresh(true);
            // this.updatePosition();
        }
    }

  updatePosition (depthOnly) {
      this.depth = this.dimmed ? Constants.DEPTH.dimmedConnection : Constants.DEPTH.normalConnection;

        // Position and rotate the connection to be between the two nodes
      this.startPosition = this.object.source.getView().container.position;
      this.endPosition = this.object.target.getView().container.position;
      const start = new THREE.Vector3(this.startPosition.x, this.startPosition.y, this.depth);
      this.particles.position.set(start.x, start.y, start.z);

      if (!depthOnly) {
            // particles
          const centerX = (this.startPosition.x + this.endPosition.x) / 2;
          const centerY = (this.startPosition.y + this.endPosition.y) / 2;
          this.centerVector = new THREE.Vector3(centerX, centerY, this.depth);
          const end = new THREE.Vector3(this.endPosition.x, this.endPosition.y, this.depth);
          const direction = new THREE.Vector3().copy(end).sub(start).normalize();
          this.particles.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);

            // update length to know how far particles are to travel
          this.length = start.distanceTo(end);

            // interactivity
          this.interactiveLine.geometry.vertices[0] = start;
          this.interactiveLine.geometry.vertices[1] = end;
          this.interactiveLine.geometry.verticesNeedUpdate = true;
          this.interactiveLine.geometry.computeBoundingSphere();
        }

      if (this.noticeView) {
          this.noticeView.updatePosition();
        }

      if (this.connectionLine) {
          this.positionConnectingLine();
        }
    }

  validateNotices () {
      if (this.object.hasNotices()) {
          this.noticeView.updateNoticeIcon();
          this.addInteractiveChildren(this.noticeView.getInteractiveChildren());
          this.container.add(this.noticeView.container);
        } else {
          this.removeInteractiveChildren(this.noticeView.getInteractiveChildren());
          this.container.remove(this.noticeView.container);
        }
    }

  updateVolume () {
        // maps the releationship of metric values to how many dots should be released per tick. use < 1 dots per release for fewer than 60 dots per second.
        // [[0, 0], [this.object.volumeGreatest, this.maxParticleReleasedPerTick]] is a straight linear releationship. not great for the left side of the normal distribution -- dots will fire too rarely.
        //  must be in ascending order.
        //  we dont want to a log because we really just want to boost the low end for our needs.
      const maxVolume = this.object.volumeGreatest;
      const maxReleasesPerTick = this.maxParticleReleasedPerTick;
      const linearRatio = maxReleasesPerTick / maxVolume;

      function secondsPerReleaseToReleasesPerTick (seconds) {
          const releasesPerSecond = 1 / seconds;
          return releasesPerSecond / 60;
        }

      this.rateMap = [
            [0, 0],
            [Number.MIN_VALUE, secondsPerReleaseToReleasesPerTick(10)],
            [1, secondsPerReleaseToReleasesPerTick(7)],
            [10, secondsPerReleaseToReleasesPerTick(5)],
        ];
      if (maxVolume > 0) {
          this.rateMap.push([100, 100 * linearRatio]);
        }
      if (maxVolume > 100) {
          this.rateMap.push([maxVolume, maxReleasesPerTick]);
        }
      this.releasesPerTick = mapVolumesToReleasesPerTick(this.object.volume, this.rateMap);
    }

  launchParticles (numberOfParticles, key, startX) {
      let rand; // eslint-disable-line prefer-const
      let i;
      numberOfParticles = numberOfParticles || 1;
      startX = startX || 0;

      for (i = 0; i < numberOfParticles; i++) {
          rand = Math.random();

          const nextFreeParticleIndex = this.nextFreeParticleIndex(numberOfParticles);
          if (nextFreeParticleIndex === -1) {
              return; // gotta wait my turn!
            }

            // Get/set the x position for the last particle index
          this.positionAttr.setX(nextFreeParticleIndex, startX + rand);
          this.positionAttr.needsUpdate = true;

          this.opacityAttr.array[nextFreeParticleIndex] = 1.0;
          this.opacityAttr.needsUpdate = true;

          const color = GlobalStyles.getColorTrafficRGBA(key);
          this.setParticleColor(nextFreeParticleIndex, color);
        }
    }

  update () {
      let vx;
      let i;
      let j;

        // We need the highest RPS connection to make this volume relative against
      if (!this.object.volumeGreatest && this.object.volumeGreatest !== 0) { return; }

        // for each volume, calculate the amount of particles to release:
      for (i = 0; i < this.releasesPerTick.length; i++) {
          const releaseInfo = this.releasesPerTick[i];

          let wholeParticles = Math.floor(releaseInfo.releasesPerTick);
            // if we should only release 0.1 particles per release, pick a random number and if it is below that amount, release a particle.
            //  so, the average particles per release should even out.
          if (Math.random() < (releaseInfo.releasesPerTick - wholeParticles)) {
              wholeParticles += 1;
            }

          if (wholeParticles > 0) {
              this.launchParticles(wholeParticles, releaseInfo.name);
            }
        }

        // TODO: Support a deltaX based on last time updated.  We tried this, and
        //       because of weird rendering buffers in THREE, the animation hiccups
        //       made doing it this way MUCH worse.  Keeping it as is until we can
        //       attack the issue with THREE...

        // Update the position of all particles in flight
      for (i = 0, j = 0; i < this.positionAttr.array.length; i += 3, j += 1) {
          if (!this.curveY) {
              this.curveY = [];
            }
          vx = this.positionAttr.array[i];
          if (!this.yIndexes[j]) {
              this.yIndexes[j] = this.positionAttr.array[i + 1];
            }

          if (vx !== 0) {
              vx += this.velocity[i];
              if (vx >= this.length) {
                  this.freeParticleIndex(j);
                  this.yIndexes[j] = 0;
                  this.curveY[j] = null;
                  vx = 0;
                }
            }


            // const magn = 300
          const reso = 1000;
          this.positionAttr.array[i] = vx;
          if (this.magnitude !== 0) {
                // this.setParticleColor(j, {r: 255, g: 0, b: 0});
              const middle = this.length / 2;
              const ratio = vx / this.length;
              if (!this.curveY[j]) {
                  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(middle, this.magnitude * 2, 0), new THREE.Vector3(this.length, 0, 0));
                  const points = curve.getPoints(reso);
                  this.curveY[j] = points;
                }
              if (this.yIndexes[j] + this.curveY[j][Math.floor(ratio * reso)]) {
                  this.positionAttr.array[i + 1] = this.yIndexes[j] + this.curveY[j][Math.floor(ratio * reso)].y;
                }
            }
            // if (vx < middle) {
            // }
            // else {
            //   this.positionAttr.array[i + 1] = this.yIndexes[j] + points[Math.floor((2 - ratio) * 100)];
            // }
        }
      this.positionAttr.needsUpdate = true;
    }

  refresh () {
      this.validateNotices();
    }

  setMagnitude (value) {
      this.magnitude = value;
    }

  positionConnectingLine () {
      const start = new THREE.Vector3(this.startPosition.x, this.startPosition.y, this.depth);
      const end = new THREE.Vector3(this.endPosition.x, this.endPosition.y, this.depth);

      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);

        // var seed = minX + maxX + minY + maxY + new Date().getMinutes();

        // function random() {
        //     var x = Math.sin(seed) * 10000;
        //     return x - Math.floor(x);
        // }

        // this.icon.material.opacity = random() > 0.80 ? 1 : 0;

      this.connectionLine.geometry.vertices[0] = start;
      this.connectionLine.geometry.vertices[0].setZ(this.startPosition.z - 10);
      this.connectionLine.geometry.vertices[1] = end;
      this.connectionLine.geometry.vertices[1].setZ(this.startPosition.z - 10);
      this.connectionLine.geometry.verticesNeedUpdate = true;
        // this.icon.position.set(minX + (maxX - minX) / 2, minY + (maxY - minY) / 2, 0);
        // if (!this.done) {
        //     this.done = true;
        // }
        // this.icon.geometry.verticesNeedUpdate = true;
    }

  setParticleColor (index, color) {
      const colorAttr = this.particles.geometry.getAttribute('customColor');
      colorAttr.setXYZ(index, color.r, color.g, color.b);
      colorAttr.needsUpdate = true;

      this.opacityAttr.array[index] = color.a;
      this.opacityAttr.needsUpdate = true;
    }

  setParticleSize (index, size) {
      const sizeAttribute = this.particles.geometry.getAttribute('size');
      if (sizeAttribute) {
          sizeAttribute.setX(index, size);
          sizeAttribute.needsUpdate = true;
        }
    }

  cleanup () {
      this.particles.geometry.dispose();
      this.shaderMaterial.dispose();
      this.interactiveLineGeometry.dispose();
      this.interactiveLineMaterial.dispose();
    }
}

export default ConnectionView;
