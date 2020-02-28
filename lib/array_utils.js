/**
 * @module ArrayUtils
 */

/**
 * Average an array of numbers
 * @param {Array<number>} arr - the array to compute an average over
 * @returns {number} - the average value
 */
function arrAvg (arr){
  return arr.reduce(function (p, c) {return p + c;}) / arr.length;
}

/**
 * Maximum in an array of numbers
 * @param {Array<number>} arr - the array to find the maximum in
 * @returns {number} - the max value
 */
function arrMax (arr){
  return Math.max.apply(Math, arr);
}

/**
 * Minimum in an array of numbers
 * @param {Array<number>} arr - the array to find the minimum in
 * @returns {number} - the min value
 */
function arrMin (arr){
  return Math.min.apply(Math, arr);
}

const ArrayUtils = {
  arrAvg,
  arrMax,
  arrMin
}
module.exports = ArrayUtils;
