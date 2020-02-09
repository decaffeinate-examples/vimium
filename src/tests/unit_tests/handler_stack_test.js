/* eslint-disable
    func-names,
    max-len,
    no-plusplus,
    no-return-assign,
    no-undef,
    no-var,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./test_helper.js');
extend(global, require('../../lib/handler_stack.js'));

context('handlerStack',
  setup(function () {
    stub(global, 'DomUtils', {});
    stub(DomUtils, 'consumeKeyup', () => {});
    stub(DomUtils, 'suppressEvent', () => {});
    stub(DomUtils, 'suppressPropagation', () => {});
    this.handlerStack = new HandlerStack();
    this.handler1Called = false;
    return this.handler2Called = false;
  }),

  should('bubble events', function () {
    this.handlerStack.push({ keydown: () => this.handler1Called = true });
    this.handlerStack.push({ keydown: () => this.handler2Called = true });
    this.handlerStack.bubbleEvent('keydown', {});
    assert.isTrue(this.handler2Called);
    return assert.isTrue(this.handler1Called);
  }),

  should('terminate bubbling on falsy return value', function () {
    this.handlerStack.push({ keydown: () => this.handler1Called = true });
    this.handlerStack.push({ keydown: () => { this.handler2Called = true; return false; } });
    this.handlerStack.bubbleEvent('keydown', {});
    assert.isTrue(this.handler2Called);
    return assert.isFalse(this.handler1Called);
  }),

  should('terminate bubbling on passEventToPage, and be true', function () {
    this.handlerStack.push({ keydown: () => this.handler1Called = true });
    this.handlerStack.push({ keydown: () => { this.handler2Called = true; return this.handlerStack.passEventToPage; } });
    assert.isTrue(this.handlerStack.bubbleEvent('keydown', {}));
    assert.isTrue(this.handler2Called);
    return assert.isFalse(this.handler1Called);
  }),

  should('terminate bubbling on passEventToPage, and be false', function () {
    this.handlerStack.push({ keydown: () => this.handler1Called = true });
    this.handlerStack.push({ keydown: () => { this.handler2Called = true; return this.handlerStack.suppressPropagation; } });
    assert.isFalse(this.handlerStack.bubbleEvent('keydown', {}));
    assert.isTrue(this.handler2Called);
    return assert.isFalse(this.handler1Called);
  }),

  should('restart bubbling on restartBubbling', function () {
    this.handler1Called = 0;
    this.handler2Called = 0;
    var id = this.handlerStack.push({ keydown: () => { this.handler1Called++; this.handlerStack.remove(id); return this.handlerStack.restartBubbling; } });
    this.handlerStack.push({ keydown: () => { this.handler2Called++; return true; } });
    assert.isTrue(this.handlerStack.bubbleEvent('keydown', {}));
    assert.isTrue(this.handler1Called === 1);
    return assert.isTrue(this.handler2Called === 2);
  }),

  should('remove handlers correctly', function () {
    this.handlerStack.push({ keydown: () => this.handler1Called = true });
    const handlerId = this.handlerStack.push({ keydown: () => this.handler2Called = true });
    this.handlerStack.remove(handlerId);
    this.handlerStack.bubbleEvent('keydown', {});
    assert.isFalse(this.handler2Called);
    return assert.isTrue(this.handler1Called);
  }),

  should('remove handlers correctly', function () {
    const handlerId = this.handlerStack.push({ keydown: () => this.handler1Called = true });
    this.handlerStack.push({ keydown: () => this.handler2Called = true });
    this.handlerStack.remove(handlerId);
    this.handlerStack.bubbleEvent('keydown', {});
    assert.isTrue(this.handler2Called);
    return assert.isFalse(this.handler1Called);
  }),

  should('handle self-removing handlers correctly', function () {
    const ctx = this;
    this.handlerStack.push({ keydown: () => this.handler1Called = true });
    this.handlerStack.push({
      keydown() {
        ctx.handler2Called = true;
        return this.remove();
      },
    });
    this.handlerStack.bubbleEvent('keydown', {});
    assert.isTrue(this.handler2Called);
    assert.isTrue(this.handler1Called);
    return assert.equal(this.handlerStack.stack.length, 1);
  }));
