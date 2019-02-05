var asciitree = require('asciitree');
var bitwise = require('../utils/bitwise');

var PADDING = '0'.repeat(8);

function numberToBitstring(number) {
  return (PADDING + number.toString(2)).slice(-8);
}

function unmask(x) {
  return 8 - Math.log2((~x >>> 0) & 0xff) - 1;
}

// NOTE: max number of internal nodes = n - 1 so max full size = 2n - 1
// NOTE: deleting = compressing above node into grandparent
// --> parent.opposite becomes

// NOTE: use negative numbers to distinguish node types in static version

// DAFSA transducer etc.
// todo: only compare last part of string

// http://benlynn.blogspot.com/2013/11/crit-bit-tree-micro-optimizations_3.html
// http://benlynn.blogspot.com/2013/11/crit-bit-tree-micro-optimizations_3.html
// https://github.com/blynn/blt/blob/master/blt.c
// https://dotat.at/prog/qp/blog-2015-10-04.html

// TODO: variant starting at i byte
function findCriticalBit(a, b) {
  var i = 0;

  var min = Math.min(a.length, b.length);

  while (i < min) {
    if (a[i] !== b[i]) {
      return [i, bitwise.criticalBit8Mask(a.charCodeAt(i), b.charCodeAt(i))];
    }

    i++;
  }

  return a.length === b.length ? null : [i, bitwise.criticalBit8Mask(b.charCodeAt(0), 0)];
}

function get(key, address) {
  return bitwise.testCriticalBit8(key.charCodeAt(address[0]), address[1]);
}

// NOTE: maybe it is possible to avoid conditions with bitwise magic
function criticalGt(a, b) {
  if (a[0] > b[0])
    return true;

  if (a[0] < b[0])
    return false;

  // TODO: issue here because of the mask?
  if (a[1] > b[1])
    return true;

  return false;
}

function InternalNode(critical) {
  this.critical = critical;
  this.left = null;
  this.right = null;
}

function ExternalNode(key) {
  this.key = key;
}

function CritBitTree() {
  this.root = null;
}

// TODO: case when the item is already in the tree
CritBitTree.prototype.add = function(key) {
  if (this.root === null) {
    this.root = new ExternalNode(key);
    return;
  }

  var node = this.root,
      ancestors = [];

  while (true) {
    if (node instanceof ExternalNode) {
      var critical = findCriticalBit(key, node.key);

      var internal = new InternalNode(critical);

      var left = get(key, critical) === 0;

      if (left) {
        internal.left = new ExternalNode(key);
        internal.right = node;
      }
      else {
        internal.left = node;
        internal.right = new ExternalNode(key);
      }

      // Bubbling up
      var best = -1;

      for (var i = ancestors.length - 1; i >= 0; i--) {
        var [a] = ancestors[i];

        if (criticalGt(a.critical, critical))
          continue;

        best = i;
        break;
      }

      // Need to attach to root
      if (best < 0) {

        this.root = internal;

        // Rewire parent as child?
        if (ancestors.length > 0) {
          var [parent] = ancestors[0];

          if (left)
            internal.right = parent;
          else
            internal.left = parent;
        }
      }

      // No need for rotation
      else if (best === ancestors.length - 1) {

        var [parent, wentRight] = ancestors[best];

        if (wentRight)
          parent.right = internal;
        else
          parent.left = internal;
      }

      // Rotation
      else {
        var [parent, wentRight] = ancestors[best];
        var [child] = ancestors[best + 1];

        if (wentRight) {
          parent.right = internal;
        }
        else {
          parent.left = internal;
        }

        if (left)
          internal.right = child;
        else
          internal.left = child;
      }

      return;
    }

    else {
      var bit = get(key, node.critical);

      if (bit === 0) {
        if (!node.left) {
          node.left = new ExternalNode(key);
          return;
        }

        ancestors.push([node, false]);
        node = node.left;
      }
      else {
        if (!node.right) {
          node.right = new ExternalNode(key);
          return;
        }

        ancestors.push([node, true]);
        node = node.right;
      }
    }
  }
};

CritBitTree.prototype[Symbol.for('nodejs.util.inspect.custom')] = function() {
  return this.root;
};

function printNode(node) {
  if (!node)
    return '';

  if (node instanceof InternalNode)
    return '(' + node.critical[0] + ',' + unmask(node.critical[1]) + ')';

  return node.key + '•' + Array.from(node.key, k => k.charCodeAt(0)).map(numberToBitstring);
}

function log(tree) {

  const title = printNode;

  const children = node => (node instanceof ExternalNode ? null : [node.left , node.right]);

  console.log(asciitree(tree.root, title, children));
}

var tree = new CritBitTree();

// tree.add(0);
// tree.add(1);
// tree.add(2);
// tree.add(3);
// tree.add(4);
// tree.add(5);
// tree.add(6);
// tree.add(7);
// tree.add(8);
// tree.add(9);
// tree.add(10);
// tree.add(11);
// tree.add(12);
// tree.add(13);
// tree.add(14);
// tree.add(15);

tree.add('abcde');
tree.add('bcd');
// tree.add('abb');
// tree.add('abc');
tree.add('abd');
tree.add('abdg');
tree.add('abe');
tree.add('aba');
tree.add('abz');

// tree.add(String.fromCharCode(13));
// tree.add(String.fromCharCode(10));
// tree.add(String.fromCharCode(8));
// tree.add(String.fromCharCode(12));
// tree.add(String.fromCharCode(1));
// tree.add(String.fromCharCode(145));
// tree.add(String.fromCharCode(14));
// tree.add(String.fromCharCode(9));
// tree.add(String.fromCharCode(11));
// tree.add(String.fromCharCode(255));

// console.log(tree);
log(tree);
