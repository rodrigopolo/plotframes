const chai = require('chai'),
  expect = chai.expect,
  should = chai.should;

const { arrAvg, arrMax, arrMin } = require('../../lib/array_utils');

describe('ArrayUtils', () => {
  describe('arrAvg', () => {
    it('computes the average of an array of values', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      expect(arrAvg(arr)).to.eql(3.5);
    });
    it('throws when the input is not an array', () => {
      expect(() => arrAvg('not an array')).to.throw();
    });
  });
  describe('arrMax', () => {
    it('selects the maximum numeric value in an array', () => {
      const arr = [-12, 4, 0, 3, -5, 18, -21];
      expect(arrMax(arr)).to.eql(18);
    });
    it('returns NaN when the input array does not contain numbers', () => {
      const arr = ['some', 'non-numeric', 'values', false];
      expect(isNaN(arrMax(arr))).to.be.true;
    });
    it('throws when the input is not an array', () => {
      expect(() => arrMax('not an array')).to.throw();
    });
  });
  describe('arrMin', () => {
    it('selects the maximum numeric value in an array', () => {
      const arr = [-12, 4, 0, 3, -5, 18, -21];
      expect(arrMin(arr)).to.eql(-21);
    });
    it('returns NaN when the input array does not contain numbers', () => {
      const arr = ['some', 'non-numeric', 'values', false];
      expect(isNaN(arrMin(arr))).to.be.true;
    });
    it('throws when the input is not an array', () => {
      expect(() => arrMin('not an array')).to.throw();
    });
  });
});
