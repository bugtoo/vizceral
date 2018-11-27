

class xRingLayout {
  run(graph, dimensions, layoutComplete) {
    const groups = [];
    const nodes2 = graph.nodes;
    nodes2.forEach((node) => {
      if (!groups[node.ringSection || 0]) {
        groups[node.ringSection || 0] = [];
      }
      groups[node.ringSection || 0].push(node);
    });

    groups.forEach((nodes, idx) => {
      const angleBetweenNodes = (Math.PI * 2) / nodes.length + 0.001;
      const hw = dimensions.width * (0.5 / (idx + 1));
      let hh = dimensions.height / 2;
      hh = (hh / (idx + 1)) - ((hh / (idx + 1)) / Math.pow(2, groups.length - idx)); // - (hh / (idx + 1) / 2);  
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const metadataPosition = node.metadata && node.metadata.position;
        let fixedPos;
        if (metadataPosition) {
          const posX = metadataPosition.x;
          const posY = metadataPosition.y;
          if (typeof posX === 'number' && isFinite(posX) && typeof posY === 'number' && isFinite(posY)) {
            fixedPos = { x: posX, y: posY };
          }
        }
        let pos = fixedPos;
        if (!fixedPos) {
          pos = {
            x: Math.cos(i * angleBetweenNodes) * hh,
            y: Math.sin(i * angleBetweenNodes) * hh
          };
        }
        node.updatePosition(pos);
      }
    });
    this.setupConnections(graph, groups);


    layoutComplete();
  }

  getMiddle(sourcePos, targetPos) {
    const minY = Math.min(sourcePos.y, targetPos.y);
    const maxY = Math.max(sourcePos.y, targetPos.y);
    const minX = Math.min(sourcePos.x, targetPos.x);
    const maxX = Math.max(sourcePos.x, targetPos.x);

    let middleX = minX + (maxX - minX) / 2;
    let middleY = minY + (maxY - minY) / 2;
    return {
      x: middleX,
      y: middleY,
    }
  }

  getAngleBetween(sourcePos, targetPos) {
    const aX = sourcePos.x;
    const aY = sourcePos.y;
    const bX = targetPos.x;
    const bY = targetPos.y;

    const dotProduct = aX * bX + aY * bY;
    const lengthA = Math.sqrt(this.pow(aX) + this.pow(aY));
    const lengthB = Math.sqrt(this.pow(bX) + this.pow(bY));

    const len = lengthA * lengthB;
    let angle = Math.acos(dotProduct / len);
    if (angle > Math.PI) {
      angle = 2 * Math.PI - angle;
    }

    return angle;
  }

  pow(x) {
    return x * x;
  }

  distBetween (x1, y1, x2, y2) {
    return Math.sqrt(this.pow(x1 - x2) + this.pow(y1 - y2));
  }

  isConnectionOuter(sourcePos, targetPos) {
    const middle = this.getMiddle(sourcePos, targetPos);
    const x = targetPos.x - sourcePos.x;
    return (x * middle.y) > 0 ? true : false;
  }

  setupConnections(graph, groups) {
    const connections = graph.connections;
    connections.forEach((c) => {
      if (c.source.ringSection === c.target.ringSection) {
        const numberOfNodes = groups[c.target.ringSection].length;
        const middle = this.getMiddle(c.source.position, c.target.position);

        const dist = this.distBetween(0, 0, middle.x, middle.y);
        const r = this.distBetween(0, 0, c.target.position.x, c.target.position.y);

        const angle = this.getAngleBetween(c.source.position, c.target.position);        
        const angleBetweenNodes = (Math.PI * 2) / numberOfNodes;
        const bucket = Math.round(angle / angleBetweenNodes);
        
        const sign = this.isConnectionOuter(c.source.position, c.target.position) ? 1 : -1;
        const constant = c.source.size * 4; // / 3;
        const amp = r - dist;
        if (bucket> 0) {
          c.setMagnitude(((amp + constant * (bucket - 1) + (sign > 0 ? 0 : 0)) * sign));
        }
      }
    });
  }
}

export default xRingLayout;
