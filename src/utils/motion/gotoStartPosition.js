const { color, speed } = require('../../config');
const averageMeasurements = require('../sensor/lidar/averageMeasurements');
const getAngleDistance = require('../sensor/lidar/getAngleDistance');
const scan = require('../sensor/lidar/scan');

/**
 *
 * @param {Object} main
 * @param {Number} centerOffset [-x / x]
 * @return {Promise}
 */
const gotoStartPosition = async (lidar, main, centerOffset = 0) => {
  let isLedOn = true;

  main.setLedColor.apply(null, color.orange);

  const ledInterval = setInterval(() => {
    isLedOn = !isLedOn;
    main.setLedColor.apply(null, isLedOn ? color.orange: [0, 0, 01]);
  }, 600);

  const measurements = await scan(lidar, 2000, 0, {});
  const averagedMeasurements = await averageMeasurements(measurements);
  const rearDistance = getAngleDistance(averagedMeasurements, 180) / 10;
  const reverseDistance = rearDistance > 15 ? 15 : 0;

  if (reverseDistance > 0) {
    await main.moveBackward(speed.straight.precision, reverseDistance);
    await main.stop(1);
  }

  const offsetLeft = Math.round(getAngleDistance(averagedMeasurements, 270) / 10);
  const offsetRight = Math.round(getAngleDistance(averagedMeasurements, 90) / 10);
  const currentOffset = Math.round((offsetLeft - offsetRight) / 2);
  const distance = Math.max(centerOffset, currentOffset) - Math.min(centerOffset, currentOffset);
  const angle = (centerOffset - currentOffset) < 0 ? -90 : 90;

  if (!distance) {
    return Promise.resolve();
  }

  await main.rotate(speed.rotate.slow, angle);
  await main.stop(1);
  await main.moveForward(speed.straight.slow, distance);
  await main.stop(1);
  await main.rotate(speed.rotate.slow, angle * -1);
  await main.stop(1);

  clearInterval(ledInterval);
  main.setLedColor.apply(null, color.green);

  return Promise.resolve();
};

module.exports = gotoStartPosition;
