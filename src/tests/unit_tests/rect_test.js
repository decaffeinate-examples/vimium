/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require("./test_helper.js");
extend(global, require("../../lib/rect.js"));

context("Rect",
  should("set rect properties correctly", function() {
    const [x1, y1, x2, y2] = Array.from([1, 2, 3, 4]);
    const rect = Rect.create(x1, y1, x2, y2);
    assert.equal(rect.left, x1);
    assert.equal(rect.top, y1);
    assert.equal(rect.right, x2);
    assert.equal(rect.bottom, y2);
    assert.equal(rect.width, x2 - x1);
    return assert.equal(rect.height, y2 - y1);
  }),

  should("translate rect horizontally", function() {
    const [x1, y1, x2, y2] = Array.from([1, 2, 3, 4]);
    const x = 5;
    const rect1 = Rect.create(x1, y1, x2, y2);
    const rect2 = Rect.translate(rect1, x);

    assert.equal(rect1.left + x, rect2.left);
    assert.equal(rect1.right + x, rect2.right);

    assert.equal(rect1.width, rect2.width);
    assert.equal(rect1.height, rect2.height);
    assert.equal(rect1.top, rect2.top);
    return assert.equal(rect1.bottom, rect2.bottom);
  }),

  should("translate rect vertically", function() {
    const [x1, y1, x2, y2] = Array.from([1, 2, 3, 4]);
    const y = 5;
    const rect1 = Rect.create(x1, y1, x2, y2);
    const rect2 = Rect.translate(rect1, undefined, y);

    assert.equal(rect1.top + y, rect2.top);
    assert.equal(rect1.bottom + y, rect2.bottom);

    assert.equal(rect1.width, rect2.width);
    assert.equal(rect1.height, rect2.height);
    assert.equal(rect1.left, rect2.left);
    return assert.equal(rect1.right, rect2.right);
  })
);

context("Rect subtraction",
  context("unchanged by rects outside",
    should("left, above", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(-2, -2, -1, -1);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("left", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(-2, 0, -1, 1);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("left, below", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(-2, 2, -1, 3);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("right, above", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(2, -2, 3, -1);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("right", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(2, 0, 3, 1);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("right, below", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(2, 2, 3, 3);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("above", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(0, -2, 1, -1);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("below", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(0, 2, 1, 3);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    })
  ),

  context("unchanged by rects touching",
    should("left, above", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(-1, -1, 0, 0);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("left", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(-1, 0, 0, 1);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("left, below", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(-1, 1, 0, 2);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("right, above", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(1, -1, 2, 0);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("right", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(1, 0, 2, 1);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("right, below", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(1, 1, 2, 2);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("above", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(0, -1, 1, 0);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    }),

    should("below", function() {
      const rect1 = Rect.create(0, 0, 1, 1);
      const rect2 = Rect.create(0, 1, 1, 2);

      const rects = Rect.subtract(rect1, rect2);
      assert.equal(rects.length, 1);
      const rect = rects[0];
      return assert.isTrue(Rect.equals(rect1, rect));
    })
  ),

  should("have nothing when subtracting itself", function() {
    const rect = Rect.create(0, 0, 1, 1);
    const rects = Rect.subtract(rect, rect);
    return assert.equal(rects.length, 0);
  }),

  should("not overlap subtracted rect", function() {
    const rect = Rect.create(0, 0, 3, 3);
    return __range__(-2, 2, true).map((x) =>
      __range__(-2, 2, true).map((y) =>
        [1, 2, 3].map((width) =>
          (() => {
            const result = [];
            for (let height = 1; height <= 3; height++) {
              var subtractRect = Rect.create(x, y, (x + width), (y + height));
              const resultRects = Rect.subtract(rect, subtractRect);
              result.push(Array.from(resultRects).map((resultRect) =>
                assert.isFalse(Rect.intersects(subtractRect, resultRect))));
            }
            return result;
          })())));
  }),

  should("be contained in original rect", function() {
    const rect = Rect.create(0, 0, 3, 3);
    return __range__(-2, 2, true).map((x) =>
      __range__(-2, 2, true).map((y) =>
        [1, 2, 3].map((width) =>
          (() => {
            const result = [];
            for (let height = 1; height <= 3; height++) {
              const subtractRect = Rect.create(x, y, (x + width), (y + height));
              const resultRects = Rect.subtract(rect, subtractRect);
              result.push(Array.from(resultRects).map((resultRect) =>
                assert.isTrue(Rect.intersects(rect, resultRect))));
            }
            return result;
          })())));
  }),

  should("contain the  subtracted rect in the original minus the results", function() {
    const rect = Rect.create(0, 0, 3, 3);
    return __range__(-2, 2, true).map((x) =>
      __range__(-2, 2, true).map((y) =>
        [1, 2, 3].map((width) =>
          (() => {
            const result = [];
            for (let height = 1; height <= 3; height++) {
              const subtractRect = Rect.create(x, y, (x + width), (y + height));
              const resultRects = Rect.subtract(rect, subtractRect);
              let resultComplement = [Rect.copy(rect)];
              for (var resultRect of Array.from(resultRects)) {
                resultComplement = Array.prototype.concat.apply([],
                  (resultComplement.map(rect => Rect.subtract(rect, resultRect))));
              }
              assert.isTrue(((resultComplement.length === 0) || (resultComplement.length === 1)));
              if (resultComplement.length === 1) {
                const complementRect = resultComplement[0];
                result.push(assert.isTrue(Rect.intersects(subtractRect, complementRect)));
              } else {
                result.push(undefined);
              }
            }
            return result;
          })())));
  })
);

context("Rect overlaps",
  should("detect that a rect overlaps itself", function() {
    const rect = Rect.create(2, 2, 4, 4);
    return assert.isTrue(Rect.intersectsStrict(rect, rect));
  }),

  should("detect that non-overlapping rectangles do not overlap on the left", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(0, 2, 1, 4);
    return assert.isFalse(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect that non-overlapping rectangles do not overlap on the right", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(5, 2, 6, 4);
    return assert.isFalse(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect that non-overlapping rectangles do not overlap on the top", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(2, 0, 2, 1);
    return assert.isFalse(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect that non-overlapping rectangles do not overlap on the bottom", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(2, 5, 2, 6);
    return assert.isFalse(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect overlapping rectangles on the left", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(0, 2, 2, 4);
    return assert.isTrue(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect overlapping rectangles on the right", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(4, 2, 5, 4);
    return assert.isTrue(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect overlapping rectangles on the top", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(2, 4, 4, 5);
    return assert.isTrue(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect overlapping rectangles on the bottom", function() {
    const rect1 = Rect.create(2, 2, 4, 4);
    const rect2 = Rect.create(2, 0, 4, 2);
    return assert.isTrue(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect overlapping rectangles when second rectangle is contained in first", function() {
    const rect1 = Rect.create(1, 1, 4, 4);
    const rect2 = Rect.create(2, 2, 3, 3);
    return assert.isTrue(Rect.intersectsStrict(rect1, rect2));
  }),

  should("detect overlapping rectangles when first rectangle is contained in second", function() {
    const rect1 = Rect.create(1, 1, 4, 4);
    const rect2 = Rect.create(2, 2, 3, 3);
    return assert.isTrue(Rect.intersectsStrict(rect2, rect1));
  })
);


function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}